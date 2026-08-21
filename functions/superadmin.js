const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getApps,initializeApp}=require("firebase-admin/app");
const {getAuth}=require("firebase-admin/auth");
const {getFirestore,FieldValue}=require("firebase-admin/firestore");
const crypto=require("crypto");
if(!getApps().length)initializeApp();
const db=getFirestore();
const REGION="us-central1";
const SUPERADMIN_UID="q9H2AzN2eIODDioC7auy92MpcHf2";
const SUPERADMIN_EMAIL="superadministrador2026@gmail.com";

function texto(v){return String(v??"").trim();}
function correo(v){return texto(v).toLowerCase();}
function ruc(v){return texto(v).replace(/\D/g,"");}
function exigirAuth(req){if(!req.auth)throw new HttpsError("unauthenticated","Debes iniciar sesión.");}
function exigirSuper(req){exigirAuth(req);if(req.auth.uid!==SUPERADMIN_UID||correo(req.auth.token.email)!==SUPERADMIN_EMAIL)throw new HttpsError("permission-denied","Acceso reservado al superadministrador general.");}
function esAdministradorSistema(perfil){const rol=texto(perfil?.rol).toUpperCase();return perfil?.principal===true||/ADMIN|PROPIET|GERENT/.test(rol);}
async function usuarioAuthPorCorreo(email){try{return await getAuth().getUserByEmail(email);}catch(e){console.error("No se pudo obtener la cuenta Auth",e);if(e?.code==="auth/user-not-found")throw new HttpsError("not-found","No se encontró esta cuenta en Firebase Authentication.");throw new HttpsError("internal","No se pudo consultar la cuenta de acceso.");}}
function auditar(tipo,req,datos={}){return db.collection("auditoriaSuperadmin").add({tipo,superadminUid:req.auth.uid,superadminCorreo:req.auth.token.email||SUPERADMIN_EMAIL,...datos,fecha:FieldValue.serverTimestamp()});}

exports.registrarEmpresaSegura=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirAuth(req);const d=req.data||{},email=correo(d.correo),numeroRuc=ruc(d.ruc);
  if(email!==correo(req.auth.token.email))throw new HttpsError("permission-denied","El correo no corresponde a la sesión creada.");
  if(!/^\d{11}$/.test(numeroRuc))throw new HttpsError("invalid-argument","El RUC debe tener 11 dígitos.");
  const empresaId=texto(d.empresaId);if(!/^EMP-[A-Z0-9-]+$/.test(empresaId))throw new HttpsError("invalid-argument","Identificador de empresa inválido.");
  const refRuc=db.doc(`indicesRuc/${numeroRuc}`),refCorreo=db.doc(`indicesCorreo/${email}`),refEmpresa=db.doc(`companias/${empresaId}`),refUsuario=db.doc(`usuarios/${req.auth.uid}`);
  await db.runTransaction(async tx=>{
    const [sr,se,sc,su]=await Promise.all([tx.get(refRuc),tx.get(refCorreo),tx.get(refEmpresa),tx.get(refUsuario)]);
    if(sr.exists)throw new HttpsError("already-exists","Este RUC ya se encuentra registrado.");
    if(se.exists)throw new HttpsError("already-exists","Este correo ya está siendo utilizado en el sistema.");
    if(sc.exists||su.exists)throw new HttpsError("already-exists","La cuenta ya posee un registro.");
    const base={empresaId,estado:"PENDIENTE",fechaRegistro:FieldValue.serverTimestamp(),fechaSolicitud:FieldValue.serverTimestamp()};
    tx.create(refRuc,{valor:numeroRuc,empresaId,tipo:"EMPRESA",uid:req.auth.uid,creadoEn:FieldValue.serverTimestamp()});
    tx.create(refCorreo,{valor:email,empresaId,tipo:"ADMINISTRADOR_PRINCIPAL",uid:req.auth.uid,creadoEn:FieldValue.serverTimestamp()});
    tx.create(refEmpresa,{...base,empresa:{ruc:numeroRuc,razonSocial:texto(d.razonSocial),giro:texto(d.giro)},ubicacion:d.ubicacion||{},representantes:Array.isArray(d.representantes)?d.representantes:[],configuracion:{zonaHoraria:"America/Lima",idioma:"es",moneda:"PEN"},plan:{nombre:"BASICO",maxUsuarios:5,maxEmpleados:25,maxSucursales:1,maxAreas:10,maxSubareas:30}});
    tx.create(refUsuario,{uid:req.auth.uid,empresaId,principal:true,nombre:texto(d.nombre),correo:email,rol:"ADMINISTRADOR",estado:"PENDIENTE",fechaRegistro:FieldValue.serverTimestamp()});
  });
  await getAuth().setCustomUserClaims(req.auth.uid,{tipo:"CLIENTE_EMPRESA",empresaId,rol:"ADMINISTRADOR"});
  return {ok:true,empresaId,estado:"PENDIENTE"};
});

exports.validarDisponibilidadGlobal=onCall({region:REGION,enforceAppCheck:false},async req=>{
  const email=correo(req.data?.correo),numeroRuc=ruc(req.data?.ruc),consultas=[];
  if(email)consultas.push(db.doc(`indicesCorreo/${email}`).get());
  if(numeroRuc)consultas.push(db.doc(`indicesRuc/${numeroRuc}`).get());
  const resultados=await Promise.all(consultas);let i=0;
  return {correoDisponible:email?!resultados[i++].exists:null,rucDisponible:numeroRuc?!resultados[i++].exists:null};
});

exports.listarEmpresasSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);
  const snap=await db.collection("companias").limit(500).get();
  const empresas=snap.docs.map(x=>{const d=x.data(),e=d.empresa||{};return{id:x.id,empresaId:d.empresaId||x.id,estado:d.estado||"PENDIENTE",ruc:e.ruc||d.ruc||"",razonSocial:e.razonSocial||d.razonSocial||"Empresa sin razón social",giro:e.giro||d.giro||"",plan:d.plan?.nombre||"BASICO",fechaRegistro:d.fechaRegistro||null};}).sort((a,b)=>a.razonSocial.localeCompare(b.razonSocial,"es"));
  await auditar("LISTAR_EMPRESAS",req,{cantidad:empresas.length});
  return{empresas};
});

exports.buscarEmpresaSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);let empresaId=texto(req.data?.empresaId),empresa=null;
  if(empresaId)empresa=await db.doc(`companias/${empresaId}`).get();
  else{
    const numeroRuc=ruc(req.data?.ruc);if(!/^\d{11}$/.test(numeroRuc))throw new HttpsError("invalid-argument","Selecciona una empresa o ingresa un RUC válido.");
    const indice=await db.doc(`indicesRuc/${numeroRuc}`).get();
    if(indice.exists){empresaId=indice.data().empresaId;empresa=await db.doc(`companias/${empresaId}`).get();}
    else{const antigua=await db.collection("companias").where("empresa.ruc","==",numeroRuc).limit(1).get();if(!antigua.empty){empresa=antigua.docs[0];empresaId=empresa.id;await db.doc(`indicesRuc/${numeroRuc}`).set({valor:numeroRuc,empresaId,tipo:"EMPRESA",migradoEn:FieldValue.serverTimestamp()},{merge:true});}}
  }
  if(!empresa||!empresa.exists)return {encontrada:false};
  const [usuarios,colaboradores,accesos,solicitudes]=await Promise.all([
    db.collection("usuarios").where("empresaId","==",empresaId).get(),db.collection("colaboradores").where("empresaId","==",empresaId).get(),db.collection("accesosMoviles").where("empresaId","==",empresaId).get(),db.collection("solicitudesDispositivoMovil").where("empresaId","==",empresaId).get()
  ]);
  await auditar("CONSULTAR_EMPRESA",req,{empresaId,ruc:empresa.data().empresa?.ruc||null});
  const docs=s=>s.docs.map(x=>({id:x.id,...x.data()}));return {encontrada:true,empresa:{id:empresa.id,...empresa.data()},usuarios:docs(usuarios),colaboradores:docs(colaboradores),accesosMoviles:docs(accesos),historialDispositivos:docs(solicitudes)};
});

exports.cambiarEstadoEmpresaSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);const empresaId=texto(req.data?.empresaId),estado=texto(req.data?.estado).toUpperCase(),motivo=texto(req.data?.motivo);
  if(!["ACTIVO","PENDIENTE","SUSPENDIDO","BLOQUEADO"].includes(estado))throw new HttpsError("invalid-argument","Estado inválido.");if(motivo.length<5)throw new HttpsError("invalid-argument","Indica el motivo del cambio.");
  const ref=db.doc(`companias/${empresaId}`),snap=await ref.get();if(!snap.exists)throw new HttpsError("not-found","Empresa no encontrada.");
  const usuarios=await db.collection("usuarios").where("empresaId","==",empresaId).get(),batch=db.batch();batch.update(ref,{estado,estadoMotivo:motivo,estadoActualizadoEn:FieldValue.serverTimestamp(),estadoActualizadoPor:req.auth.uid});
  usuarios.docs.forEach(x=>batch.update(x.ref,{estado:estado==="ACTIVO"?"ACTIVO":estado}));await batch.commit();
  await Promise.all(usuarios.docs.map(async x=>{try{await getAuth().updateUser(x.id,{disabled:estado!=="ACTIVO"});if(estado!=="ACTIVO")await getAuth().revokeRefreshTokens(x.id);}catch(e){console.warn("Auth",x.id,e.message);}}));
  await auditar("CAMBIAR_ESTADO_EMPRESA",req,{empresaId,estadoAnterior:snap.data().estado||null,estadoNuevo:estado,motivo});return {ok:true,estado};
});

exports.actualizarEmpresaSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);const empresaId=texto(req.data?.empresaId),motivo=texto(req.data?.motivo),c=req.data?.cambios||{};if(motivo.length<5)throw new HttpsError("invalid-argument","Indica el motivo.");
  const permitidos={"empresa.razonSocial":texto(c.razonSocial),"empresa.giro":texto(c.giro),"ubicacion.direccion":texto(c.direccion),"ubicacion.departamento":texto(c.departamento),"ubicacion.provincia":texto(c.provincia),"ubicacion.distrito":texto(c.distrito),"plan.nombre":texto(c.plan||"BASICO").toUpperCase(),actualizadoEn:FieldValue.serverTimestamp(),actualizadoPor:req.auth.uid};
  await db.doc(`companias/${empresaId}`).update(permitidos);await auditar("EDITAR_EMPRESA",req,{empresaId,motivo,cambios:c});return {ok:true};
});

exports.gestionarDispositivoSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);const accion=texto(req.data?.accion).toUpperCase(),colaboradorId=texto(req.data?.colaboradorId),solicitudId=texto(req.data?.solicitudId),motivo=texto(req.data?.motivo);if(motivo.length<5)throw new HttpsError("invalid-argument","Indica el motivo.");
  const accesoRef=db.doc(`accesosMoviles/${colaboradorId}`),acceso=await accesoRef.get();if(!acceso.exists)throw new HttpsError("not-found","Acceso móvil no encontrado.");const a=acceso.data();
  if(accion==="REVOCAR"){await accesoRef.set({estado:"BLOQUEADO",dispositivoAutorizadoId:null,credencialRegistrada:false,revocadoEn:FieldValue.serverTimestamp(),revocadoPor:req.auth.uid},{merge:true});if(a.usuarioId){await db.doc(`usuariosMoviles/${a.usuarioId}`).set({estado:"BLOQUEADO",dispositivoAutorizadoId:null},{merge:true});await getAuth().revokeRefreshTokens(a.usuarioId);}}
  else if(accion==="REACTIVAR"){const s=await db.doc(`solicitudesDispositivoMovil/${solicitudId}`).get();if(!s.exists||s.data().colaboradorId!==colaboradorId)throw new HttpsError("not-found","Dispositivo histórico no encontrado.");const d=s.data();await accesoRef.set({estado:"AUTORIZADO",dispositivoAutorizadoId:d.dispositivoId,dispositivo:d.dispositivo,credencialRegistrada:false,actualizadoEn:FieldValue.serverTimestamp(),actualizadoPor:req.auth.uid},{merge:true});if(a.usuarioId)await db.doc(`usuariosMoviles/${a.usuarioId}`).set({estado:"AUTORIZADO",dispositivoAutorizadoId:d.dispositivoId,dispositivo:d.dispositivo},{merge:true});}
  else throw new HttpsError("invalid-argument","Acción inválida.");await auditar("GESTIONAR_DISPOSITIVO",req,{empresaId:a.empresaId,colaboradorId,solicitudId:solicitudId||null,accion,motivo});return {ok:true};
});

exports.enviarRestablecimientoSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);const email=correo(req.data?.correo),empresaId=texto(req.data?.empresaId),motivo=texto(req.data?.motivo);
  if(motivo.length<5)throw new HttpsError("invalid-argument","Indica el motivo.");
  const user=await usuarioAuthPorCorreo(email),perfil=await db.doc(`usuarios/${user.uid}`).get();
  if(!perfil.exists||perfil.data().empresaId!==empresaId||!esAdministradorSistema(perfil.data()))throw new HttpsError("permission-denied","La cuenta no es un administrador de la empresa seleccionada.");
  const enlace=await getAuth().generatePasswordResetLink(email,{url:"https://zavalachumpitazoscar.github.io/control-asistencia/index.html"});
  await db.collection("mail").add({to:[email],message:{subject:"Restablecimiento de acceso",html:`<div style="font-family:Arial;max-width:560px;margin:auto"><h2>Restablece tu contraseña</h2><p>El administrador general recibió una solicitud de recuperación para tu cuenta.</p><p><a style="display:inline-block;padding:12px 18px;background:#2388ff;color:#fff;text-decoration:none;border-radius:8px" href="${enlace}">Crear nueva contraseña</a></p><p>Si no solicitaste este cambio, comunícate con tu empresa.</p></div>`},empresaId,tipo:"RESET_SUPERADMIN",creadoEn:FieldValue.serverTimestamp()});
  await auditar("ENVIAR_RESTABLECIMIENTO_PASSWORD",req,{empresaId,uidObjetivo:user.uid,correo:email,motivo});return {ok:true};
});

exports.generarPasswordTemporalSuperadmin=onCall({region:REGION,enforceAppCheck:false},async req=>{
  exigirSuper(req);
  const email=correo(req.data?.correo),empresaId=texto(req.data?.empresaId),motivo=texto(req.data?.motivo),solicitada=texto(req.data?.passwordNueva);
  if(motivo.length<5)throw new HttpsError("invalid-argument","Indica el motivo.");
  const user=await usuarioAuthPorCorreo(email);
  if(user.uid===SUPERADMIN_UID)throw new HttpsError("permission-denied","No puedes modificar la contraseña del superadministrador desde esta opción.");
  const perfilRef=db.doc(`usuarios/${user.uid}`),perfil=await perfilRef.get();
  if(!perfil.exists||perfil.data().empresaId!==empresaId||!esAdministradorSistema(perfil.data()))throw new HttpsError("permission-denied","La cuenta no es un administrador de la empresa seleccionada.");
  const temporal=solicitada||`Ce!${crypto.randomBytes(7).toString("base64url")}9a`;
  if(temporal.length<10||temporal.length>128||!/[a-z]/.test(temporal)||!/[A-Z]/.test(temporal)||!/[0-9]/.test(temporal)||!/[.!@#$%_-]/.test(temporal))throw new HttpsError("invalid-argument","La contraseña debe tener al menos 10 caracteres, mayúscula, minúscula, número y símbolo.");
  try{await getAuth().updateUser(user.uid,{password:temporal});await getAuth().revokeRefreshTokens(user.uid);}catch(e){console.error("No se pudo actualizar la contraseña",e);if(e?.code==="auth/invalid-password")throw new HttpsError("invalid-argument","Firebase rechazó la contraseña indicada.");throw new HttpsError("internal","No se pudo actualizar la contraseña en el servicio de acceso.");}
  await perfilRef.set({requiereCambioPassword:true,passwordTemporalAsignadoEn:FieldValue.serverTimestamp(),passwordTemporalAsignadoPor:req.auth.uid},{merge:true});
  await auditar("GENERAR_PASSWORD_TEMPORAL",req,{empresaId,uidObjetivo:user.uid,correo:email,motivo});
  return {ok:true,correo:email,passwordTemporal:temporal};
});
