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

function dniColaborador(d){return texto(d?.documento?.numero||d?.dni||d?.numeroDocumento).replace(/\D/g,"");}
function nombreColaborador(d){return texto(d?.nombreCompleto||[d?.datosPersonales?.nombres||d?.nombres||d?.nombre,d?.datosPersonales?.apellidos||d?.apellidos||d?.apellido].filter(Boolean).join(" "))||"Colaborador sin nombre";}
async function empresaPorRuc(numeroRuc){
  const indice=await db.doc(\`indicesRuc/\${numeroRuc}\`).get();
  if(indice.exists){const id=texto(indice.data().empresaId),snap=await db.doc(\`companias/\${id}\`).get();if(snap.exists)return{id,snap};}
  const antigua=await db.collection("companias").where("empresa.ruc","==",numeroRuc).limit(1).get();
  if(antigua.empty)throw new HttpsError("not-found","No se encontró una empresa con ese RUC.");
  return{id:antigua.docs[0].id,snap:antigua.docs[0]};
}
async function contextoUnificacion(data){
  const numeroRuc=ruc(data?.ruc),dniOrigen=ruc(data?.dniOrigen),dniDestino=ruc(data?.dniDestino);
  if(!/^\d{11}$/.test(numeroRuc))throw new HttpsError("invalid-argument","El RUC debe tener 11 dígitos.");
  if(!/^\d{8}$/.test(dniOrigen)||!/^\d{8}$/.test(dniDestino))throw new HttpsError("invalid-argument","Ambos DNI deben tener 8 dígitos.");
  if(dniOrigen===dniDestino)throw new HttpsError("invalid-argument","El DNI incorrecto y el correcto no pueden ser iguales.");
  const empresa=await empresaPorRuc(numeroRuc),snap=await db.collection("colaboradores").where("empresaId","==",empresa.id).get();
  const coincidencias=snap.docs.filter(x=>[dniColaborador(x.data()),ruc(x.id)].includes(dniOrigen)||[dniColaborador(x.data()),ruc(x.id)].includes(dniDestino));
  const origen=coincidencias.find(x=>dniColaborador(x.data())===dniOrigen||ruc(x.id)===dniOrigen);
  const destino=coincidencias.find(x=>dniColaborador(x.data())===dniDestino||ruc(x.id)===dniDestino);
  if(!origen)throw new HttpsError("not-found","No se encontró el colaborador con el DNI incorrecto en esta empresa.");
  if(!destino)throw new HttpsError("not-found","Primero crea al colaborador con el DNI correcto en esta empresa.");
  if(origen.id===destino.id)throw new HttpsError("failed-precondition","Los dos DNI corresponden al mismo colaborador.");
  return{numeroRuc,dniOrigen,dniDestino,empresa,origen,destino};
}
const COLECCIONES_NO_UNIFICABLES=new Set(["colaboradores","auditoriaSistema","auditoriaSuperadmin","historialOperacionesAsistencia","fusionesColaboradores","accesosMoviles"]);
async function referenciasUnificacion(empresaId,origenId){
  const colecciones=await db.listCollections(),halladas=[];
  for(const col of colecciones){
    if(COLECCIONES_NO_UNIFICABLES.has(col.id))continue;
    const [simples,listas]=await Promise.all([col.where("colaboradorId","==",origenId).get(),col.where("colaboradorIds","array-contains",origenId).get()]);
    const docs=new Map();
    simples.docs.forEach(x=>{if(x.data().empresaId===empresaId)docs.set(x.ref.path,{doc:x,tipo:"simple"});});
    listas.docs.forEach(x=>{if(x.data().empresaId===empresaId)docs.set(x.ref.path,{doc:x,tipo:docs.get(x.ref.path)?.tipo==="simple"?"ambos":"lista"});});
    if(docs.size)halladas.push({coleccion:col.id,docs:[...docs.values()]});
  }
  return halladas;
}
function resumenReferencias(grupos){return grupos.map(x=>({coleccion:x.coleccion,cantidad:x.docs.length})).sort((a,b)=>b.cantidad-a.cantidad||a.coleccion.localeCompare(b.coleccion));}

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
    tx.create(refEmpresa,{...base,empresa:{ruc:numeroRuc,razonSocial:texto(d.razonSocial),giro:texto(d.giro)},ubicacion:d.ubicacion||{},representantes:Array.isArray(d.representantes)?d.representantes:[],configuracion:{zonaHoraria:"America/Lima",idioma:"es",moneda:"PEN"},plan:{nombre:"BASICO",maxUsuarios:5,maxEmpleados:20,maxSucursales:1,maxAreas:10,maxSubareas:30}});
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

exports.unificarColaboradoresSuperadmin=onCall({region:REGION,enforceAppCheck:false,timeoutSeconds:540,memory:"512MiB"},async req=>{
  exigirSuper(req);
  const accion=texto(req.data?.accion||"PREVISUALIZAR").toUpperCase(),ctx=await contextoUnificacion(req.data),origen=ctx.origen.data(),destino=ctx.destino.data();
  const [grupos,accesoOrigen,accesoDestino]=await Promise.all([
    referenciasUnificacion(ctx.empresa.id,ctx.origen.id),db.doc(\`accesosMoviles/\${ctx.origen.id}\`).get(),db.doc(\`accesosMoviles/\${ctx.destino.id}\`).get()
  ]);
  const conflictoAccesoMovil=accesoOrigen.exists&&accesoDestino.exists;
  const base={empresa:{id:ctx.empresa.id,ruc:ctx.numeroRuc,razonSocial:ctx.empresa.snap.data().empresa?.razonSocial||ctx.empresa.snap.data().razonSocial||"Empresa"},origen:{id:ctx.origen.id,dni:ctx.dniOrigen,nombre:nombreColaborador(origen)},destino:{id:ctx.destino.id,dni:ctx.dniDestino,nombre:nombreColaborador(destino)},referencias:resumenReferencias(grupos),totalReferencias:grupos.reduce((n,x)=>n+x.docs.length,0)+(accesoOrigen.exists?1:0),accesoMovilOrigen:accesoOrigen.exists,accesoMovilDestino:accesoDestino.exists,conflictoAccesoMovil};
  if(accion==="PREVISUALIZAR")return{ok:true,...base};
  if(accion!=="EJECUTAR")throw new HttpsError("invalid-argument","Acción de unificación inválida.");
  const motivo=texto(req.data?.motivo),confirmacion=ruc(req.data?.confirmacion);
  if(motivo.length<5)throw new HttpsError("invalid-argument","Indica el motivo de la unificación.");
  if(confirmacion!==ctx.dniDestino)throw new HttpsError("failed-precondition","La confirmación no coincide con el DNI correcto.");
  if(conflictoAccesoMovil)throw new HttpsError("failed-precondition","Ambos colaboradores tienen acceso móvil. Revoca uno de los accesos antes de unificarlos.");
  const fusionRef=db.collection("fusionesColaboradores").doc(),ahora=FieldValue.serverTimestamp();
  await fusionRef.set({estado:"EN_PROCESO",empresaId:ctx.empresa.id,ruc:ctx.numeroRuc,origenId:ctx.origen.id,dniOrigen:ctx.dniOrigen,datosOrigen:origen,destinoId:ctx.destino.id,dniDestino:ctx.dniDestino,datosDestinoAntes:destino,motivo,referencias:base.referencias,iniciadoEn:ahora,iniciadoPor:req.auth.uid});
  await ctx.origen.ref.set({unificacionEnProceso:true,unificacionDestinoId:ctx.destino.id,unificacionIniciadaEn:ahora},{merge:true});
  try{
    const writer=db.bulkWriter(),nombreDestino=nombreColaborador(destino);
    for(const grupo of grupos)for(const item of grupo.docs){
      const actual=item.doc.data(),cambios={actualizadoEn:FieldValue.serverTimestamp()};
      if(item.tipo==="simple"||item.tipo==="ambos"){cambios.colaboradorId=ctx.destino.id;if(Object.prototype.hasOwnProperty.call(actual,"colaboradorDocumento"))cambios.colaboradorDocumento=ctx.dniDestino;if(Object.prototype.hasOwnProperty.call(actual,"colaboradorNombre"))cambios.colaboradorNombre=nombreDestino;}
      if(item.tipo==="lista"||item.tipo==="ambos")cambios.colaboradorIds=[...new Set((actual.colaboradorIds||[]).map(id=>id===ctx.origen.id?ctx.destino.id:id))];
      writer.set(item.doc.ref,cambios,{merge:true});
    }
    if(accesoOrigen.exists){const datosAcceso={...accesoOrigen.data(),colaboradorId:ctx.destino.id,nombre:nombreDestino,documento:ctx.dniDestino,actualizadoEn:FieldValue.serverTimestamp(),actualizadoPor:req.auth.uid};writer.set(db.doc(\`accesosMoviles/\${ctx.destino.id}\`),datosAcceso,{merge:true});writer.delete(accesoOrigen.ref);}
    await writer.close();
    if(accesoOrigen.exists&&accesoOrigen.data().usuarioId){const uid=accesoOrigen.data().usuarioId,usuario=await getAuth().getUser(uid),claims={...(usuario.customClaims||{}),empresaId:ctx.empresa.id,colaboradorId:ctx.destino.id};await getAuth().setCustomUserClaims(uid,claims);}
    await ctx.destino.ref.set({actualizadoEn:FieldValue.serverTimestamp(),unificadoDesde:FieldValue.arrayUnion(ctx.origen.id),unificadoDesdeDni:FieldValue.arrayUnion(ctx.dniOrigen)},{merge:true});
    await ctx.origen.ref.delete();
    await fusionRef.set({estado:"COMPLETADO",completadoEn:FieldValue.serverTimestamp(),totalReferencias:base.totalReferencias},{merge:true});
    await auditar("UNIFICAR_COLABORADORES",req,{empresaId:ctx.empresa.id,ruc:ctx.numeroRuc,origenId:ctx.origen.id,dniOrigen:ctx.dniOrigen,destinoId:ctx.destino.id,dniDestino:ctx.dniDestino,totalReferencias:base.totalReferencias,motivo,fusionId:fusionRef.id});
    return{ok:true,fusionId:fusionRef.id,...base};
  }catch(e){console.error("Error al unificar colaboradores",e);await fusionRef.set({estado:"ERROR",error:texto(e?.message).slice(0,500),falloEn:FieldValue.serverTimestamp()},{merge:true});throw e instanceof HttpsError?e:new HttpsError("internal","La unificación no terminó. El colaborador incorrecto se conservó para poder reintentar de forma segura.");}
});
