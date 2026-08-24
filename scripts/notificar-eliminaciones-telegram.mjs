const required=["FIREBASE_API_KEY","FIREBASE_SUPERADMIN_EMAIL","FIREBASE_SUPERADMIN_PASSWORD","TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID"];
const missing=required.filter(name=>!process.env[name]?.trim());
if(missing.length)throw new Error(`Faltan secretos obligatorios: ${missing.join(", ")}`);

const projectId=process.env.FIREBASE_PROJECT_ID?.trim()||"control-asistencia-958aa";
const superadminUrl=process.env.SUPERADMIN_URL?.trim()||"https://zavalachumpitazoscar.github.io/control-asistencia/superadmin.html";
const firestoreBase=`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

function decodeValue(value){
  if(!value)return null;
  if("stringValue" in value)return value.stringValue;
  if("booleanValue" in value)return value.booleanValue;
  if("timestampValue" in value)return value.timestampValue;
  return null;
}
function decodeFields(fields={}){return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,decodeValue(value)]))}

async function requestJson(url,options={}){
  const response=await fetch(url,options),body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error?.message||body?.description||`${response.status} ${response.statusText}`);
  return body;
}

async function firebaseLogin(){
  const url=`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(process.env.FIREBASE_API_KEY.trim())}`;
  const result=await requestJson(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:process.env.FIREBASE_SUPERADMIN_EMAIL.trim(),password:process.env.FIREBASE_SUPERADMIN_PASSWORD,returnSecureToken:true})});
  return result.idToken;
}

async function listPendingRequests(idToken){
  const requests=[];let pageToken="";
  do{
    const url=new URL(`${firestoreBase}/solicitudesEliminacionAuth`);url.searchParams.set("pageSize","100");if(pageToken)url.searchParams.set("pageToken",pageToken);
    const page=await requestJson(url,{headers:{Authorization:`Bearer ${idToken}`}});
    for(const document of page.documents||[]){const data=decodeFields(document.fields);if(data.estado==="PENDIENTE"&&!data.telegramNotificadoEn)requests.push(document.name.split("/").pop())}
    pageToken=page.nextPageToken||"";
  }while(pageToken);
  return requests;
}

async function sendTelegram(total){
  const text=["🔔 <b>Control Empresarial</b>","",`Tienes <b>${total}</b> ${total===1?"eliminación pendiente":"eliminaciones pendientes"} de revisión manual en Firebase Authentication.`,"","Ingresa al panel de superadministrador para revisar los detalles."].join("\n");
  return requestJson(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN.trim()}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID.trim(),text,parse_mode:"HTML",disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:"Abrir superadministrador",url:superadminUrl}]]}})});
}

async function markAsNotified(idToken,requestId,messageId){
  const url=new URL(`${firestoreBase}/solicitudesEliminacionAuth/${encodeURIComponent(requestId)}`);
  for(const field of ["telegramNotificadoEn","telegramEstado","telegramMensajeId"])url.searchParams.append("updateMask.fieldPaths",field);
  url.searchParams.set("currentDocument.exists","true");
  await requestJson(url,{method:"PATCH",headers:{Authorization:`Bearer ${idToken}`,"Content-Type":"application/json"},body:JSON.stringify({fields:{telegramNotificadoEn:{timestampValue:new Date().toISOString()},telegramEstado:{stringValue:"ENVIADO"},telegramMensajeId:{integerValue:String(messageId)}}})});
}

const idToken=await firebaseLogin(),pending=await listPendingRequests(idToken);
if(!pending.length){console.log("No hay eliminaciones nuevas para notificar.");process.exit(0)}
const telegramResult=await sendTelegram(pending.length);
for(const requestId of pending)await markAsNotified(idToken,requestId,telegramResult.result.message_id);
console.log(`Telegram recibió el aviso de ${pending.length} pendiente(s), sin datos personales.`);
