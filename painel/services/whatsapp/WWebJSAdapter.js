/**
 * Adaptador de baixo nível para whatsapp-web.js.
 * Somente esta camada acessa Puppeteer e Stores internas do WhatsApp Web.
 */
export class WWebJSAdapter {
  constructor({ client = null, logger = null, messageCache = null } = {}) {
    this.client = client;
    this.logger = typeof logger === 'function' ? logger : null;
    this.messageCache = messageCache instanceof Map ? messageCache : new Map();
    this.failureCache = new Map();
  }
  setClient(client){ this.client = client || null; return this; }
  hasClient(){ return Boolean(this.client); }
  log(type,message,details={}){ try{ this.logger?.(type,message,details); }catch{} }

  static messageIdCore(value=''){
    let raw=String(value||'').trim(); try{raw=decodeURIComponent(raw);}catch{}
    const parts=raw.split('_').filter(part=>/^[A-F0-9]{16,}$/i.test(part));
    return parts.at(-1) || raw;
  }
  static messageIdVariants(value=''){
    let raw=String(value||'').trim(), decoded=raw; try{decoded=decodeURIComponent(raw);}catch{}
    const set=new Set([raw,decoded,WWebJSAdapter.messageIdCore(decoded)]);
    for(const item of [...set]){
      if(!item) continue;
      const parts=item.split('_'); if(parts.length>1){set.add(parts.at(-1)); for(const p of parts) if(/^[A-F0-9]{16,}$/i.test(p)) set.add(p);}
      const colon=item.split(':'); if(colon.length>1)set.add(colon.at(-1));
    }
    return [...set].filter(Boolean);
  }
  cacheMessage(message){
    const id=String(message?.id?._serialized||message?.id?.id||''); if(!id)return false;
    for(const key of WWebJSAdapter.messageIdVariants(id)) this.messageCache.set(key,message);
    while(this.messageCache.size>4000)this.messageCache.delete(this.messageCache.keys().next().value);
    return true;
  }
  getCachedMessage(id){
    for(const key of WWebJSAdapter.messageIdVariants(id)){const value=this.messageCache.get(key);if(value)return value;}
    return null;
  }
  shouldThrottle(id){
    const last=this.failureCache.get(WWebJSAdapter.messageIdCore(id));
    return last && Date.now()-last.at < 30000;
  }
  markFailure(id,error){
    this.failureCache.set(WWebJSAdapter.messageIdCore(id),{at:Date.now(),error:String(error?.message||error||'')});
    while(this.failureCache.size>1000)this.failureCache.delete(this.failureCache.keys().next().value);
  }

  async diagnose(){
    const page=this.client?.pupPage;
    const base={clientAttached:Boolean(this.client),pageAvailable:Boolean(page?.evaluate),cacheSize:this.messageCache.size,failureCacheSize:this.failureCache.size};
    if(!page?.evaluate)return base;
    try{return {...base,...await page.evaluate(()=>{
      const req=name=>{try{return window.require?.(name)||null;}catch{return null;}};
      const collections=req('WAWebCollections'); const download=req('WAWebDownloadManager');
      const store=window.Store||null;
      return {
        hasWindowRequire:typeof window.require==='function',
        hasWAWebCollections:Boolean(collections),
        hasMsgCollection:Boolean(collections?.Msg||store?.Msg),
        hasChatCollection:Boolean(collections?.Chat||store?.Chat),
        hasDownloadManager:Boolean(store?.DownloadManager?.downloadAndMaybeDecrypt||download?.downloadManager?.downloadAndMaybeDecrypt||download?.downloadAndMaybeDecrypt),
        messageModels:Number(collections?.Msg?.getModelsArray?.()?.length||store?.Msg?.getModelsArray?.()?.length||0),
        chatModels:Number(collections?.Chat?.getModelsArray?.()?.length||store?.Chat?.getModelsArray?.()?.length||0),
        webVersion:String(window?.Debug?.VERSION||window?.WhatsAppWebClient?.version||'')||null
      };
    })};}catch(error){return {...base,error:String(error?.message||error)};}
  }

  async downloadMediaInternal({conversation={},savedMessage={}}={}){
    const page=this.client?.pupPage;
    const messageId=String(savedMessage?.id||'');
    if(!page?.evaluate)throw new Error('Página interna do WhatsApp Web indisponível.');
    if(!messageId)throw new Error('Mensagem de mídia sem identificador.');

    const payload={
      messageId,
      variants:WWebJSAdapter.messageIdVariants(messageId),
      conversationIds:[conversation?.whatsappId,conversation?.phone?`${String(conversation.phone).replace(/\D/g,'')}@c.us`:null].filter(Boolean),
      timestampMs:Date.parse(savedMessage?.timestamp||''),
      fallbackMime:String(savedMessage?.media?.mime||''),
      fallbackFilename:String(savedMessage?.media?.originalName||'arquivo')
    };

    try{
      const result=await page.evaluate(async input=>{
        const text=v=>{try{return v==null?'':String(v);}catch{return '';}};
        const sid=v=>text(v?._serialized||v?.toString?.()||v);
        const core=v=>{
          const raw=text(v);
          const parts=raw.split('_').filter(p=>/^[A-F0-9]{16,}$/i.test(p));
          return parts.at(-1)||raw;
        };
        const matches=(a,b)=>{
          const ac=core(a),bc=core(b);
          return Boolean(ac&&bc&&(ac===bc||ac.endsWith(bc)||bc.endsWith(ac)));
        };
        const req=name=>{try{return window.require?.(name)||null;}catch{return null;}};
        const collections=req('WAWebCollections');
        const msgCollection=collections?.Msg || window.Store?.Msg;
        if(!msgCollection) return {ok:false,reason:'message_collection_unavailable'};

        let model=null;
        let lookupSource='';
        const lookupErrors=[];

        // 1) O ID completo salvo pelo Inbox é o candidato mais confiável.
        for(const candidate of input.variants){
          if(!candidate) continue;
          try{
            model=msgCollection.get?.(candidate)||null;
            if(model){lookupSource='collection_get';break;}
          }catch(error){lookupErrors.push(`get:${candidate}:${text(error?.message||error)}`);}

          if(typeof msgCollection.getMessagesById==='function'){
            try{
              const loaded=await msgCollection.getMessagesById([candidate]);
              model=loaded?.messages?.[0]||loaded?.[0]||null;
              if(model){lookupSource='getMessagesById';break;}
            }catch(error){lookupErrors.push(`getMessagesById:${candidate}:${text(error?.message||error)}`);}
          }
        }

        // 2) Fallback: modelos já carregados, comparando pelo trecho hexadecimal final.
        const models=msgCollection.getModelsArray?.()||msgCollection.models||[];
        const sampleIds=(models||[]).map(item=>sid(item?.id)).filter(Boolean).slice(-12);
        if(!model){
          for(const item of models){
            const id=sid(item?.id);
            if(input.variants.some(v=>matches(id,v))){model=item;lookupSource='loaded_models_core';break;}
          }
        }

        // 3) Último recurso: conversa + horário, apenas quando o ID não aparece.
        if(!model && Number.isFinite(input.timestampMs)){
          let best=null,bestDistance=Infinity;
          for(const item of models){
            const remote=sid(item?.id?.remote)||sid(item?.chatId)||text(item?.fromMe?item?.to:item?.from);
            if(input.conversationIds.length&&!input.conversationIds.some(cid=>remote===cid||sid(item?.id).includes(`_${cid}_`)))continue;
            if(!(item?.hasMedia||item?.mediaData||item?.directPath||item?.mimetype))continue;
            const itemMs=Number(item?.t||item?.timestamp||0)*1000;
            const distance=Math.abs(itemMs-input.timestampMs);
            if(distance<bestDistance&&distance<=120000){best=item;bestDistance=distance;}
          }
          if(best){model=best;lookupSource='timestamp_fallback';}
        }

        if(!model){
          return {
            ok:false,
            reason:'message_not_in_store',
            requestedCore:core(input.messageId),
            variants:input.variants,
            messageModels:Number(models?.length||0),
            sampleIds,
            lookupErrors
          };
        }

        const resolvedId=sid(model?.id);
        const stageBefore=text(model?.mediaData?.mediaStage||'');
        if(!model.mediaData){
          return {ok:false,reason:'media_data_missing',resolvedId,lookupSource,stageBefore};
        }
        if(stageBefore==='REUPLOADING'){
          return {ok:false,reason:'media_reuploading_or_expired',resolvedId,lookupSource,stageBefore};
        }

        // Espelha o fluxo oficial do whatsapp-web.js 1.34.7: primeiro resolve a mídia.
        if(model.mediaData.mediaStage!=='RESOLVED' && typeof model.downloadMedia==='function'){
          try{
            await model.downloadMedia({downloadEvenIfExpensive:true,rmrReason:1});
          }catch(error){
            return {
              ok:false,
              reason:'media_resolve_failed',
              resolvedId,
              lookupSource,
              stageBefore,
              stageAfter:text(model?.mediaData?.mediaStage||''),
              error:text(error?.stack||error?.message||error)
            };
          }
        }

        const stageAfter=text(model?.mediaData?.mediaStage||'');
        if(stageAfter.includes('ERROR')||stageAfter==='FETCHING'){
          return {ok:false,reason:'media_stage_not_downloadable',resolvedId,lookupSource,stageBefore,stageAfter};
        }

        const downloadModule=req('WAWebDownloadManager');
        const manager=downloadModule?.downloadManager || window.Store?.DownloadManager || downloadModule;
        const download=manager?.downloadAndMaybeDecrypt;
        if(typeof download!=='function'){
          return {ok:false,reason:'download_manager_unavailable',resolvedId,lookupSource,stageBefore,stageAfter};
        }

        const mockQpl={
          addAnnotations(){return this;},
          addPoint(){return this;}
        };

        try{
          const decryptedMedia=await download.call(manager,{
            directPath:model.directPath,
            encFilehash:model.encFilehash,
            filehash:model.filehash,
            mediaKey:model.mediaKey,
            mediaKeyTimestamp:model.mediaKeyTimestamp,
            type:model.type,
            signal:new AbortController().signal,
            downloadQpl:mockQpl
          });
          if(!decryptedMedia){
            return {ok:false,reason:'empty_download',resolvedId,lookupSource,stageBefore,stageAfter};
          }

          let data='';
          if(window.WWebJS?.arrayBufferToBase64Async){
            data=await window.WWebJS.arrayBufferToBase64Async(decryptedMedia);
          }else{
            const array=decryptedMedia instanceof ArrayBuffer?new Uint8Array(decryptedMedia):new Uint8Array(decryptedMedia.buffer||decryptedMedia);
            let binary='';
            const chunk=0x8000;
            for(let i=0;i<array.length;i+=chunk)binary+=String.fromCharCode(...array.subarray(i,i+chunk));
            data=btoa(binary);
          }

          return {
            ok:true,
            data,
            mime:text(model.mimetype||input.fallbackMime||'application/octet-stream'),
            filename:text(model.filename||input.fallbackFilename||'arquivo'),
            resolvedId,
            lookupSource,
            stageBefore,
            stageAfter,
            size:Number(model.size||0)
          };
        }catch(error){
          return {
            ok:false,
            reason:Number(error?.status)===404?'media_http_404':'download_exception',
            resolvedId,
            lookupSource,
            stageBefore,
            stageAfter,
            status:Number(error?.status)||null,
            error:text(error?.stack||error?.message||error)
          };
        }
      },payload);

      if(!result?.ok){
        this.log('provider_media_internal_miss','Store interna não recuperou a mídia.',{
          messageId,
          reason:result?.reason||'unknown',
          resolvedMessageId:result?.resolvedId||null,
          lookupSource:result?.lookupSource||null,
          stageBefore:result?.stageBefore||null,
          stageAfter:result?.stageAfter||null,
          status:result?.status??null,
          error:result?.error||null,
          requestedCore:result?.requestedCore||WWebJSAdapter.messageIdCore(messageId),
          variants:result?.variants||payload.variants,
          messageModels:result?.messageModels??null,
          sampleIds:result?.sampleIds||null,
          lookupErrors:result?.lookupErrors||null
        });
        return null;
      }

      const buffer=Buffer.from(String(result.data||''),'base64');
      if(!buffer.length){
        this.log('provider_media_internal_empty','Download interno retornou conteúdo vazio.',{messageId,resolvedMessageId:result?.resolvedId||null});
        return null;
      }

      this.failureCache.delete(WWebJSAdapter.messageIdCore(messageId));
      this.log('provider_media_internal_hit','Mídia recuperada pelo fluxo oficial interno.',{
        messageId,
        resolvedMessageId:result.resolvedId||messageId,
        lookupSource:result.lookupSource||null,
        stageBefore:result.stageBefore||null,
        stageAfter:result.stageAfter||null,
        size:buffer.length
      });
      return {
        buffer,
        mime:result.mime||'application/octet-stream',
        filename:result.filename||'arquivo',
        resolvedMessageId:result.resolvedId||messageId,
        source:'internal_store_official_flow'
      };
    }catch(error){
      this.log('provider_media_internal_failed','Falha na recuperação direta pela Store interna.',{
        messageId,
        error:String(error?.stack||error?.message||error)
      });
      return null;
    }
  }

  async downloadMediaSafe(options={}){
    const internal=await this.downloadMediaInternal(options); if(internal)return internal;
    const messageId=String(options?.savedMessage?.id||'');
    const cached=this.getCachedMessage(messageId);
    if(cached?.hasMedia&&typeof cached.downloadMedia==='function'){
      try{const media=await cached.downloadMedia();const buffer=Buffer.from(String(media?.data||''),'base64');if(buffer.length)return{buffer,mime:media?.mimetype||'application/octet-stream',filename:media?.filename||'arquivo',resolvedMessageId:String(cached?.id?._serialized||messageId),source:'public_cache'};}catch(error){this.log('provider_media_public_cache_failed','Fallback público do cache falhou.',{messageId,error:String(error?.message||error)});}
    }
    return null;
  }

  async getChatsSafe(){
    const page=this.client?.pupPage;if(!page?.evaluate)throw new Error('Página do WhatsApp indisponível.');
    return page.evaluate(()=>{let chats=[];try{chats=window.require('WAWebCollections')?.Chat?.getModelsArray?.()||[];}catch{}return{stats:{total:chats.length},errors:[],chats:chats.slice(0,200).map(c=>({id:String(c?.id?._serialized||''),name:String(c?.name||c?.formattedTitle||''),unreadCount:Number(c?.unreadCount||0)}))};});
  }
}
export default WWebJSAdapter;
