import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

const funciones=getFunctions(undefined,"us-central1");
const llamar=(nombre,datos={})=>httpsCallable(funciones,nombre)(datos).then(r=>r.data);
let perfil=null,ubicacion=null,cargando=false;
const dispositivoId=obtenerDispositivoId();

document.getElementById("ingresarMovil").addEventListener("click",ingresar);
document.getElementById("recuperarPasswordMovil").addEventListener("click",recuperar);
document.getElementById("solicitarDispositivoMovil").addEventListener("click",solicitarDispositivo);
document.getElementById("registrarBiometriaMovil").addEventListener("click",registrarBiometria);
document.getElementById("actualizarUbicacionMovil").addEventListener("click",obtenerUbicacion);
document.querySelectorAll("[data-salir-movil]").forEach(b=>b.addEventListener("click",()=>signOut(auth)));
document.querySelector(".botones-marcacion").addEventListener("click",e=>{const b=e.target.closest("[data-tipo-marca]");if(b)marcar(b.dataset.tipoMarca,b);});
setInterval(actualizarReloj,1000);actualizarReloj();

onAuthStateChanged(auth,async usuario=>{
  if(!usuario){mostrar("pantallaLogin");perfil=null;return;}
  try{await cargarEstado();}catch(error){mensajeLogin(error.message);await signOut(auth);}
});

async function ingresar(){
  if(cargando)return;const correo=document.getElementById("correoMovil").value.trim(),password=document.getElementById("passwordMovil").value;
  if(!correo||!password)return mensajeLogin("Ingresa correo y contraseña.");
  cargando=true;try{await signInWithEmailAndPassword(auth,correo,password);}catch{mensajeLogin("No se pudo ingresar. Revisa tus credenciales.");}finally{cargando=false;}
}
async function recuperar(){const correo=document.getElementById("correoMovil").value.trim();if(!correo)return mensajeLogin("Escribe primero tu correo.");try{await sendPasswordResetEmail(auth,correo);mensajeLogin("Te enviamos un enlace para crear una nueva contraseña.",true);}catch{mensajeLogin("No se pudo enviar el enlace.");}}

async function cargarEstado(){
  perfil=await llamar("estadoPortalMovil",{dispositivoId});
  if(perfil.estadoAcceso==="NO_HABILITADO")throw new Error("Tu empresa todavía no habilitó la marcación móvil.");
  if(perfil.estadoDispositivo!=="AUTORIZADO"){
    document.getElementById("detalleDispositivoMovil").textContent=descripcionDispositivo();
    document.getElementById("textoPendienteMovil").textContent=perfil.estadoDispositivo==="PENDIENTE"?"La solicitud ya fue enviada. Espera que tu empresa autorice este celular.":"Este celular todavía no está autorizado para realizar marcaciones.";
    document.getElementById("solicitarDispositivoMovil").hidden=perfil.estadoDispositivo==="PENDIENTE";mostrar("pantallaPendiente");return;
  }
  if(!perfil.credencialRegistrada){mostrar("pantallaBiometria");return;}
  pintarPortal();mostrar("pantallaMarcacion");obtenerUbicacion();
}

async function solicitarDispositivo(){
  try{await llamar("solicitarDispositivoMovil",{dispositivoId,dispositivo:datosDispositivo()});await cargarEstado();}catch(e){aviso("No se pudo enviar",e.message,"error");}
}

async function registrarBiometria(){
  if(!window.PublicKeyCredential)return aviso("Dispositivo no compatible","Este navegador no permite registrar una credencial segura.","warning");
  try{
    const opciones=await llamar("iniciarRegistroWebAuthnMovil",{dispositivoId});
    opciones.challenge=base64urlAB(opciones.challenge);opciones.user.id=base64urlAB(opciones.user.id);opciones.excludeCredentials=(opciones.excludeCredentials||[]).map(c=>({...c,id:base64urlAB(c.id)}));
    const credencial=await navigator.credentials.create({publicKey:opciones});
    await llamar("finalizarRegistroWebAuthnMovil",{dispositivoId,credencial:serializarRegistro(credencial)});await cargarEstado();
  }catch(e){aviso("No se pudo registrar",e.message||"La validación fue cancelada.","error");}
}

async function marcar(tipo,boton){
  if(cargando)return;if(!ubicacion)return aviso("Ubicación requerida","Activa el GPS y actualiza tu ubicación.","warning");
  cargando=true;boton.disabled=true;
  try{
    const opciones=await llamar("iniciarAutenticacionWebAuthnMovil",{dispositivoId,tipo});
    opciones.challenge=base64urlAB(opciones.challenge);opciones.allowCredentials=(opciones.allowCredentials||[]).map(c=>({...c,id:base64urlAB(c.id)}));
    const credencial=await navigator.credentials.get({publicKey:opciones});
    const resultado=await llamar("registrarMarcacionMovil",{dispositivoId,tipo,ubicacion,credencial:serializarAutenticacion(credencial)});
    await aviso("Marcación registrada",`${etiqueta(tipo)} · ${resultado.hora}`,"success");await cargarEstado();
  }catch(e){aviso("No se pudo marcar",limpiarError(e),"error");}finally{cargando=false;boton.disabled=false;}
}

function obtenerUbicacion(){
  const estado=document.getElementById("estadoUbicacionMovil"),precision=document.getElementById("precisionUbicacionMovil");estado.textContent="Obteniendo ubicación…";
  navigator.geolocation.getCurrentPosition(p=>{ubicacion={latitud:p.coords.latitude,longitud:p.coords.longitude,precisionMetros:p.coords.accuracy,altitud:p.coords.altitude??null,obtenidaEn:new Date(p.timestamp).toISOString()};estado.textContent="Ubicación obtenida";precision.textContent=`Precisión aproximada: ${Math.round(p.coords.accuracy)} m`;},()=>{ubicacion=null;estado.textContent="No se pudo obtener la ubicación";precision.textContent="Autoriza el GPS con ubicación precisa.";},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function pintarPortal(){
  document.getElementById("nombreColaboradorMovil").textContent=perfil.nombre;document.getElementById("organizacionColaboradorMovil").textContent=[perfil.sucursal,perfil.area].filter(Boolean).join(" · ")||"Sin ubicación organizacional";
  const historial=document.getElementById("historialMarcacionesMovil");historial.innerHTML=perfil.marcacionesHoy?.length?perfil.marcacionesHoy.map(m=>`<div class="marca-historial"><strong>${html(etiqueta(m.tipo))}</strong><time>${html(m.hora)}</time></div>`).join(""):'<p>Aún no existen marcaciones.</p>';
  const siguiente=perfil.siguienteMarcacion;document.querySelectorAll("[data-tipo-marca]").forEach(b=>{b.disabled=b.dataset.tipoMarca!==siguiente;b.classList.toggle("siguiente",b.dataset.tipoMarca===siguiente);});
}

function actualizarReloj(){const d=new Date();document.getElementById("horaOficialMovil").textContent=d.toLocaleTimeString("es-PE",{hour12:false});document.getElementById("fechaOficialMovil").textContent=d.toLocaleDateString("es-PE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});}
function mostrar(id){["pantallaLogin","pantallaPendiente","pantallaBiometria","pantallaMarcacion"].forEach(x=>document.getElementById(x).hidden=x!==id);}
function obtenerDispositivoId(){let id=localStorage.getItem("dispositivoMarcacionMovil");if(!id){id=crypto.randomUUID();localStorage.setItem("dispositivoMarcacionMovil",id);}return id;}
function datosDispositivo(){return {descripcion:descripcionDispositivo(),plataforma:navigator.userAgentData?.platform||navigator.platform||"Desconocida",navegador:navigator.userAgent,idioma:navigator.language,zonaHoraria:Intl.DateTimeFormat().resolvedOptions().timeZone,pantalla:`${screen.width}x${screen.height}`};}
function descripcionDispositivo(){const plataforma=navigator.userAgentData?.platform||navigator.platform||"Celular";return `${plataforma} · ${navigator.userAgent.includes("Android")?"Android":navigator.userAgent.includes("iPhone")?"iPhone":"Navegador móvil"}`;}
function serializarRegistro(c){return {id:c.id,rawId:abBase64url(c.rawId),type:c.type,response:{clientDataJSON:abBase64url(c.response.clientDataJSON),attestationObject:abBase64url(c.response.attestationObject)},clientExtensionResults:c.getClientExtensionResults()};}
function serializarAutenticacion(c){return {id:c.id,rawId:abBase64url(c.rawId),type:c.type,response:{clientDataJSON:abBase64url(c.response.clientDataJSON),authenticatorData:abBase64url(c.response.authenticatorData),signature:abBase64url(c.response.signature),userHandle:c.response.userHandle?abBase64url(c.response.userHandle):null},clientExtensionResults:c.getClientExtensionResults()};}
function abBase64url(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}function base64urlAB(s){const b=s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4);return Uint8Array.from(atob(b),c=>c.charCodeAt(0));}
function etiqueta(t){return ({ENTRADA:"Entrada",INICIO_ALMUERZO:"Inicio de almuerzo",FIN_ALMUERZO:"Fin de almuerzo",SALIDA:"Salida"})[t]||t;}function mensajeLogin(m,ok=false){const e=document.getElementById("mensajeLoginMovil");e.textContent=m;e.style.color=ok?"#047857":"#dc2626";}function limpiarError(e){return String(e?.message||"Error inesperado").replace(/^FirebaseError:\s*/,"").replace(/functions\/[\w-]+/g,"").trim();}function aviso(t,x,i){return typeof Swal!=="undefined"?Swal.fire({title:t,text:x,icon:i,confirmButtonColor:"#2563eb"}):Promise.resolve(alert(`${t}\n${x}`));}function html(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}
