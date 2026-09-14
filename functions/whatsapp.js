const {onRequest}=require("firebase-functions/v2/https");
const {defineSecret}=require("firebase-functions/params");
const {getApps,initializeApp}=require("firebase-admin/app");
const {getFirestore,FieldValue}=require("firebase-admin/firestore");
const {getStorage}=require("firebase-admin/storage");
const crypto=require("crypto");

if(!getApps().length)initializeApp();
const db=getFirestore();
const REGION="us-central1";
const GRAPH_VERSION="v25.0";
const SECUENCIA=["ENTRADA","INICIO_ALMUERZO","FIN_ALMUERZO","SALIDA"];
const ETIQUETAS={ENTRADA:"Entrada",INICIO_ALMUERZO:"Inicio de refrigerio",FIN_ALMUERZO:"Fin de refrigerio",SALIDA:"Salida"};
const VERIFY_TOKEN=defineSecret("WHATSAPP_VERIFY_TOKEN");
const ACCESS_TOKEN=defineSecret("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID=defineSecret("WHATSAPP_PHONE_NUMBER_ID");
const APP_SECRET=defineSecret("WHATSAPP_APP_SECRET");
const STORAGE_BUCKET=defineSecret("WHATSAPP_STORAGE_BUCKET");

exports.whatsappWebhook=onRequest({region:REGION,secrets:[VERIFY_TOKEN,ACCESS_TOKEN,PHONE_NUMBER_ID,APP_SECRET,STORAGE_BUCKET]},async(req,res)=>{
  if(req.method==="GET"){
    if(req.query["hub.mode"]==="subscribe"&&req.query["hub.verify_token"]===VERIFY_TOKEN.value())return res.status(200).send(req.query["hub.challenge"]);
    return res.sendStatus(403);
  }
  if(req.method!=="POST")return res.sendStatus(405);
  if(!firmaValida(req))return res.sendStatus(401);
  res.sendStatus(200);
  const mensajes=extraerMensajes(req.body);
  for(const mensaje of mensajes){
    try{await procesarMensaje(mensaje);}catch(error){
      console.error("Error procesando mensaje de WhatsApp",mensaje?.id,error);
      const telefono=normalizarTelefono(mensaje?.from);
      if(telefono)try{await enviarTexto(telefono,`❌ No se pudo registrar la marcación. ${mensajeSeguro(error)}`);}catch(errorEnvio){console.error("No se pudo informar el error",errorEnvio);}
    }
  }
});

async function procesarMensaje(mensaje){
  const telefono=normalizarTelefono(mensaje.from);
  if(!telefono)return;
  const colaborador=await buscarColaborador(telefono);
  if(!colaborador){
    await enviarTexto(telefono,"Este número no está asociado a un colaborador activo. Solicita a tu administrador que registre tu celular con código de país.");
    return;
  }
  const sesionRef=db.doc(`sesionesWhatsApp/${telefono}`);
  const sesionSnap=await sesionRef.get();
  const sesion=sesionSnap.exists?sesionSnap.data():null;
  if(mensaje.type==="interactive"&&["button_reply","list_reply"].includes(mensaje.interactive?.type)){
    const respuesta=mensaje.interactive.button_reply||mensaje.interactive.list_reply;
    const tipo=String(respuesta?.id||"").replace("MARCAR_","");
    if(!SECUENCIA.includes(tipo))return enviarMenu(telefono,colaborador);
    await sesionRef.set(baseSesion(colaborador,tipo),{merge:true});
    return solicitarUbicacion(telefono,tipo);
  }
  if(mensaje.type==="location"){
    if(!sesionVigente(sesion)||sesion.estado!=="ESPERANDO_UBICACION")return enviarTexto(telefono,"La solicitud expiró. Escribe MARCAR para comenzar nuevamente.");
    const ubicacion={latitud:Number(mensaje.location.latitude),longitud:Number(mensaje.location.longitude)};
    const validacion=await validarGeocerca(colaborador,ubicacion);
    if(!validacion.ok){
      await sesionRef.set({estado:"RECHAZADA",motivo:validacion.mensaje,actualizadoEn:FieldValue.serverTimestamp()},{merge:true});
      return enviarTexto(telefono,`❌ Marcación rechazada. ${validacion.mensaje}`);
    }
    await sesionRef.set({estado:"ESPERANDO_FOTO",ubicacion:{...ubicacion,...validacion.datos},actualizadoEn:FieldValue.serverTimestamp(),expiraEnMs:Date.now()+3*60*1000},{merge:true});
    return enviarTexto(telefono,"📷 Ubicación validada. Envía ahora una foto como evidencia. Debe enviarse dentro de los próximos 3 minutos.");
  }
  if(mensaje.type==="image"){
    if(!sesionVigente(sesion)||sesion.estado!=="ESPERANDO_FOTO")return enviarTexto(telefono,"Primero selecciona una marcación y comparte tu ubicación actual.");
    const foto=await guardarFoto(mensaje.image.id,colaborador,sesion.tipo);
    const resultado=await registrarMarcacion(colaborador,telefono,sesion,foto,mensaje.id);
    await sesionRef.set({estado:"COMPLETADA",marcacionId:resultado.id,completadaEn:FieldValue.serverTimestamp()},{merge:true});
    return enviarTexto(telefono,`✅ ${ETIQUETAS[sesion.tipo]} registrada correctamente\n🕐 ${resultado.hora}\n📍 ${Math.round(sesion.ubicacion.distanciaSucursalMetros)} m de la sede autorizada\n📷 Evidencia recibida`);
  }
  return enviarMenu(telefono,colaborador);
}

async function buscarColaborador(telefono){
  const variantes=variantesTelefono(telefono);
  const consultas=[
    db.collection("colaboradores").where("contacto.telefono","in",variantes),
    db.collection("colaboradores").where("telefono","in",variantes)
  ];
  for(const consulta of consultas){
    const snap=await consulta.limit(2).get();
    const activos=snap.docs.filter(d=>String(d.data().estado||"ACTIVO").toUpperCase()==="ACTIVO");
    if(activos.length===1)return {id:activos[0].id,...activos[0].data()};
    if(activos.length>1)throw new Error(`Teléfono duplicado entre colaboradores: ${telefono}`);
  }
  return null;
}

async function enviarMenu(telefono,c){
  const nombre=[c.datosPersonales?.nombres,c.datosPersonales?.apellidos].filter(Boolean).join(" ")||"colaborador";
  return enviar(telefono,{type:"interactive",interactive:{type:"list",body:{text:`Hola, ${nombre}. Selecciona la marcación que deseas registrar:`},action:{button:"Elegir marcación",sections:[{title:"Tipos de marcación",rows:[
    {id:"MARCAR_ENTRADA",title:"Entrada"},
    {id:"MARCAR_INICIO_ALMUERZO",title:"Inicio de refrigerio"},
    {id:"MARCAR_FIN_ALMUERZO",title:"Fin de refrigerio"},
    {id:"MARCAR_SALIDA",title:"Salida"}
  ]}]}}});
}

async function solicitarUbicacion(telefono,tipo){
  await db.doc(`sesionesWhatsApp/${telefono}`).set({estado:"ESPERANDO_UBICACION"},{merge:true});
  return enviar(telefono,{type:"interactive",interactive:{type:"location_request_message",body:{text:`Seleccionaste ${ETIQUETAS[tipo]}. Pulsa el botón y comparte tu ubicación actual.`},action:{name:"send_location"}}});
}

async function enviarTexto(telefono,body){return enviar(telefono,{type:"text",text:{preview_url:false,body}});}
async function enviar(telefono,contenido){
  const respuesta=await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID.value()}/messages`,{method:"POST",headers:{Authorization:`Bearer ${ACCESS_TOKEN.value()}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:telefono,...contenido})});
  if(!respuesta.ok)throw new Error(`WhatsApp ${respuesta.status}: ${await respuesta.text()}`);
  return respuesta.json();
}

async function validarGeocerca(c,u){
  const sucursalId=c.organizacion?.sucursalId||c.sucursalId;
  if(!sucursalId)return {ok:false,mensaje:"El colaborador no tiene una sucursal asignada."};
  const s=await db.doc(`sucursales/${sucursalId}`).get();
  if(!s.exists||!s.data().geocercaMovil)return {ok:false,mensaje:"La sucursal no tiene una geocerca configurada."};
  const geo=s.data().geocercaMovil;
  const distancia=distanciaMetros(u.latitud,u.longitud,Number(geo.latitud),Number(geo.longitud));
  if(distancia>Number(geo.radioMetros))return {ok:false,mensaje:`Estás fuera del perímetro autorizado (${Math.round(distancia)} m).`};
  return {ok:true,datos:{distanciaSucursalMetros:distancia,radioAutorizadoMetros:Number(geo.radioMetros),sucursalId}};
}

async function registrarMarcacion(c,telefono,sesion,foto,mensajeId){
  const ahora=new Date(),fecha=fechaLima(ahora),hora=horaLima(ahora);
  const marcas=await db.collection("marcaciones").where("empresaId","==",c.empresaId).where("colaboradorId","==",c.id).where("fecha","==",fecha).get();
  const orden=marcas.docs.map(d=>d.data()).filter(m=>SECUENCIA.includes(m.tipo)).sort((a,b)=>String(a.hora).localeCompare(String(b.hora)));
  const esperada=SECUENCIA[orden.length];
  if(!esperada)throw new Error("La jornada ya tiene sus cuatro marcaciones.");
  if(esperada!==sesion.tipo)throw new Error(`La siguiente marcación permitida es ${ETIQUETAS[esperada]}.`);
  const id=[c.empresaId,c.id,fecha,sesion.tipo].join("_");
  await db.doc(`marcaciones/${id}`).create({empresaId:c.empresaId,colaboradorId:c.id,colaboradorNombre:[c.datosPersonales?.nombres,c.datosPersonales?.apellidos].filter(Boolean).join(" "),colaboradorDocumento:c.documento?.numero||c.dni||"",fecha,hora,fechaHora:FieldValue.serverTimestamp(),fechaHoraISO:ahora.toISOString(),tipo:sesion.tipo,tipoOriginal:sesion.tipo,tipoInterpretado:sesion.tipo,origen:"WHATSAPP",estado:"VALIDA",telefonoWhatsApp:telefono,ubicacion:sesion.ubicacion,fotoEvidencia:foto,mensajeWhatsAppId:mensajeId,riesgos:{origenDispositivoNoDisponibleEnApi:true},fechaCreacion:FieldValue.serverTimestamp()});
  return {id,hora};
}

async function guardarFoto(mediaId,c,tipo){
  const meta=await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,{headers:{Authorization:`Bearer ${ACCESS_TOKEN.value()}`}});
  if(!meta.ok)throw new Error("No se pudo obtener la fotografía de WhatsApp.");
  const info=await meta.json();
  const archivo=await fetch(info.url,{headers:{Authorization:`Bearer ${ACCESS_TOKEN.value()}`}});
  if(!archivo.ok)throw new Error("No se pudo descargar la fotografía de WhatsApp.");
  const buffer=Buffer.from(await archivo.arrayBuffer());
  if(buffer.length>8*1024*1024)throw new Error("La fotografía supera el tamaño permitido.");
  const mime=archivo.headers.get("content-type")||info.mime_type||"image/jpeg";
  if(!mime.startsWith("image/"))throw new Error("El archivo recibido no es una imagen.");
  const nombre=`evidencias-whatsapp/${c.empresaId}/${c.id}/${Date.now()}-${tipo}.jpg`;
  const bucket=getStorage().bucket(STORAGE_BUCKET.value());
  await bucket.file(nombre).save(buffer,{contentType:mime,metadata:{cacheControl:"private,max-age=0",metadata:{colaboradorId:c.id,empresaId:c.empresaId,mediaId}}});
  return {bucket:bucket.name,path:nombre,mimeType:mime,tamano:buffer.length,mediaId};
}

function baseSesion(c,tipo){return {empresaId:c.empresaId,colaboradorId:c.id,tipo,estado:"ESPERANDO_UBICACION",iniciadaEn:FieldValue.serverTimestamp(),actualizadoEn:FieldValue.serverTimestamp(),expiraEnMs:Date.now()+5*60*1000};}
function sesionVigente(s){return Boolean(s&&Number(s.expiraEnMs)>Date.now());}
function firmaValida(req){const firma=String(req.get("x-hub-signature-256")||"");if(!firma.startsWith("sha256="))return false;const calculada=`sha256=${crypto.createHmac("sha256",APP_SECRET.value()).update(req.rawBody).digest("hex")}`;try{return crypto.timingSafeEqual(Buffer.from(firma),Buffer.from(calculada));}catch{return false;}}
function extraerMensajes(body){return (body.entry||[]).flatMap(e=>e.changes||[]).flatMap(c=>c.value?.messages||[]);}
function mensajeSeguro(error){const m=String(error?.message||"");return /^(La jornada|La siguiente marcación|El colaborador|La sucursal|Estás fuera|La fotografía)/.test(m)?m:"Intenta nuevamente escribiendo MARCAR.";}
function normalizarTelefono(v){const n=String(v||"").replace(/\D/g,"");return n.length===9?`51${n}`:n;}
function variantesTelefono(v){const n=normalizarTelefono(v),local=n.startsWith("51")?n.slice(2):n;return [...new Set([n,`+${n}`,local,`+51${local}`,`51${local}`])].slice(0,10);}
function fechaLima(d){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}
function horaLima(d){return new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(d);}
function distanciaMetros(a,b,c,d){const r=6371000,p=x=>x*Math.PI/180,dp=p(c-a),dl=p(d-b),q=Math.sin(dp/2)**2+Math.cos(p(a))*Math.cos(p(c))*Math.sin(dl/2)**2;return 2*r*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
