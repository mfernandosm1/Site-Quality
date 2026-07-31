function text(v=''){return String(v??'');}
function variants(v=''){let raw=text(v);try{raw=decodeURIComponent(raw);}catch{}const set=new Set([raw]);for(const x of [...set]){const p=x.split('_');if(p.length>1){set.add(p.at(-1));for(const a of p)if(/^[A-F0-9]{16,}$/i.test(a))set.add(a);}}return[...set].filter(Boolean);}
function detailedError(e){return text(e?.stack||e?.message||e||'Erro desconhecido.');}
export class MediaEngine{
  constructor({client=null,provider=null,logger=null,messageCache=null}={}){this.client=client;this.provider=provider;this.logger=typeof logger==='function'?logger:null;this.messageCache=messageCache instanceof Map?messageCache:new Map();this.resultCache=new Map();this.failureCache=new Map();}
  setClient(c){this.client=c||null;return this;} setProvider(p){this.provider=p||null;return this;} log(t,m,d={}){try{this.logger?.(t,m,d);}catch{}}
  cacheKey(conversation={},savedMessage={}){return `${conversation?.id||conversation?.whatsappId||''}:${savedMessage?.id||''}`;}
  async diagnose(){return{engineVersion:'2.0.1-debug-id-store',messageCacheSize:this.messageCache.size,resultCacheSize:this.resultCache.size,failureCacheSize:this.failureCache.size,provider:await this.provider?.adapter?.diagnose?.()||null};}
  async recover({conversation={},savedMessage={}}={}){
    if(!this.client)throw new Error('Conecte o WhatsApp para visualizar esta mídia.');
    const started=Date.now(),messageId=text(savedMessage?.id),key=this.cacheKey(conversation,savedMessage);
    this.log('media_engine_start','Media Engine 2.0 iniciou a recuperação.',{conversationId:conversation?.id,messageId});
    const cachedResult=this.resultCache.get(key);if(cachedResult?.buffer?.length){this.log('media_engine_result_cache_hit','Mídia recuperada do cache do Media Engine.',{messageId,durationMs:Date.now()-started});return{...cachedResult,source:'engine_result_cache'};}
    try{
      const result=await this.provider?.downloadMediaSafe?.({conversation,savedMessage});
      if(result?.buffer?.length){this.resultCache.set(key,result);while(this.resultCache.size>100)this.resultCache.delete(this.resultCache.keys().next().value);this.failureCache.delete(key);this.log('media_engine_internal_hit','Mídia recuperada pela Store interna do WhatsApp Web.',{messageId,resolvedMessageId:result.resolvedMessageId,source:result.source,durationMs:Date.now()-started});return result;}
    }catch(error){this.log('media_engine_provider_failed','Provider não conseguiu recuperar a mídia.',{messageId,error:detailedError(error)});}
    // Último fallback: objeto já recebido em tempo real, sem reabrir chats nem varrer históricos.
    for(const id of variants(messageId)){
      const message=this.messageCache.get(id);if(!message?.hasMedia||typeof message.downloadMedia!=='function')continue;
      try{const media=await message.downloadMedia();const buffer=Buffer.from(text(media?.data),'base64');if(buffer.length){const result={buffer,mime:text(media?.mimetype||savedMessage?.media?.mime||'application/octet-stream'),filename:text(media?.filename||savedMessage?.media?.originalName||'arquivo'),resolvedMessageId:text(message?.id?._serialized||messageId),source:'realtime_cache'};this.resultCache.set(key,result);return result;}}catch(error){this.log('media_engine_realtime_cache_failed','Objeto em cache não conseguiu baixar a mídia.',{messageId,error:detailedError(error)});}
    }
    this.log('media_engine_not_found','Media Engine 2.0.2 não localizou mídia recuperável.',{conversationId:conversation?.id,messageId,durationMs:Date.now()-started});
    throw new Error('A mídia não está disponível nas Stores carregadas desta sessão. Tente abrir a conversa no WhatsApp Web e repetir; mídias expiradas não podem ser recuperadas.');
  }
}
export default MediaEngine;
