import express from 'express';

const router=express.Router();

function users(req){ return req.app.locals.userService; }
function auth(req){ return req.app.locals.authService; }
function kernel(req){ return req.app.locals.kernelService; }
function clean(value=''){ return String(value??'').trim(); }

router.get('/login',(req,res)=>{
  if(req.user)return res.redirect(auth(req).safeReturnTo(req.query.returnTo||'/'));
  const firstAccess=users(req).list({includeInactive:true}).length===0;
  return res.render('login',{layout:false,firstAccess,error:req.query.error||'',notice:req.query.notice||'',returnTo:auth(req).safeReturnTo(req.query.returnTo||'/'),company:res.locals.panelCompany||{}});
});

router.post('/login',(req,res)=>{
  const returnTo=auth(req).safeReturnTo(req.body?.returnTo||'/');
  try{
    if(users(req).list({includeInactive:true}).length===0)return res.redirect(`/login?primeiro=1&returnTo=${encodeURIComponent(returnTo)}`);
    const user=users(req).authenticate(req.body?.login||'',req.body?.password||'');
    if(!user)throw new Error('Usuário ou senha inválidos.');
    const access=auth(req).accessStatus(user,req);
    if(!access.allowed)throw new Error(access.message||'Acesso não liberado neste momento.');
    auth(req).setCookie(res,user,req);
    kernel(req)?.logs?.record?.({category:'security',module:'auth',action:'LOGIN_SUCCESS',actor:user.name||user.username,label:'Login realizado',details:{userId:user.id,username:user.username}});
    return res.redirect(returnTo);
  }catch(error){
    kernel(req)?.logs?.record?.({category:'security',module:'auth',action:'LOGIN_FAILED',actor:'anonimo',label:'Tentativa de login recusada',result:'error',details:{login:clean(req.body?.login).slice(0,120)}});
    return res.redirect(`/login?error=${encodeURIComponent(error.message||'Não foi possível entrar.')}&returnTo=${encodeURIComponent(returnTo)}`);
  }
});

router.post('/login/primeiro-acesso',(req,res)=>{
  const returnTo=auth(req).safeReturnTo(req.body?.returnTo||'/');
  try{
    if(users(req).list({includeInactive:true}).length>0)throw new Error('O primeiro administrador já foi configurado.');
    const password=String(req.body?.password||'');
    if(password!==String(req.body?.passwordConfirm||''))throw new Error('A confirmação da senha não confere.');
    const user=users(req).save({name:req.body?.name,displayName:req.body?.displayName||req.body?.name,username:req.body?.username,email:req.body?.email,mobile:req.body?.mobile,profileId:'administrator',password,active:true,seller:req.body?.seller==='on'||req.body?.seller===true,technician:false},'primeiro-acesso');
    auth(req).setCookie(res,user,req);
    kernel(req)?.audits?.record?.({actor:user.name,module:'usuarios',action:'FIRST_ADMIN_CREATED',entityType:'user',entityId:user.id,label:`Primeiro administrador criado: ${user.name}`,after:user});
    kernel(req)?.logs?.record?.({category:'security',module:'auth',action:'FIRST_ADMIN_CREATED',actor:user.name,label:'Primeiro administrador do ERP configurado',details:{userId:user.id,username:user.username}});
    return res.redirect(returnTo);
  }catch(error){
    return res.redirect(`/login?primeiro=1&error=${encodeURIComponent(error.message||'Não foi possível configurar o primeiro acesso.')}&returnTo=${encodeURIComponent(returnTo)}`);
  }
});


router.get('/recuperar-acesso',(req,res)=>{
  if(req.user)return res.redirect('/');
  return res.render('recuperar_acesso',{layout:false,error:req.query.error||'',success:req.query.success||'',company:res.locals.panelCompany||{}});
});

router.post('/recuperar-acesso/chave',(req,res)=>{
  try{
    const password=String(req.body?.password||'');
    if(password!==String(req.body?.passwordConfirm||''))throw new Error('A confirmação da nova senha não confere.');
    const user=users(req).resetWithRecoveryKey(req.body?.login||'',req.body?.recoveryKey||'',password);
    kernel(req)?.audits?.record?.({actor:user.name||user.username,module:'usuarios',action:'ACCESS_RECOVERED_WITH_KEY',entityType:'user',entityId:user.id,label:`Acesso recuperado por chave: ${user.name}`});
    kernel(req)?.logs?.record?.({category:'security',module:'auth',action:'ACCESS_RECOVERED_WITH_KEY',actor:user.name||user.username,label:'Senha redefinida com chave de recuperação',details:{userId:user.id}});
    return res.redirect('/login?notice='+encodeURIComponent('Senha redefinida com sucesso. Entre com sua nova senha.'));
  }catch(error){
    kernel(req)?.logs?.record?.({category:'security',module:'auth',action:'ACCESS_RECOVERY_FAILED',actor:'anonimo',label:'Recuperação de acesso recusada',result:'error'});
    return res.redirect('/recuperar-acesso?error='+encodeURIComponent(error.message||'Não foi possível recuperar o acesso.'));
  }
});

router.post('/logout',(req,res)=>{
  const who=req.user?.displayName||req.user?.name||req.user?.username||'usuario';
  auth(req).clearCookie(res);
  kernel(req)?.logs?.record?.({category:'security',module:'auth',action:'LOGOUT',actor:who,label:'Sessão encerrada'});
  return res.redirect('/login');
});

export default router;
