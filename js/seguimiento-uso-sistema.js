import {collection,doc,serverTimestamp,setDoc} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {db} from "./firebase-config.js";

const INTERVALO_GUARDADO_MS=10*60*1000;
const MAXIMO_TRAMO_MS=10*60*1000;
const EVENTOS_ACTIVIDAD=["click","keydown","pointerdown","scroll","touchstart"];
let sesion=null,temporizador=null,ultimaInteraccion=Date.now(),ultimoGuardado=Date.now(),guardando=false;

function fechaLocal(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function marcarActividad(){ultimaInteraccion=Date.now()}
async function guardarSesion(finalizada=false){if(!sesion||guardando)return;const ahora=Date.now(),activo=document.visibilityState==="visible"&&ahora-ultimaInteraccion<=INTERVALO_GUARDADO_MS,tramo=activo?Math.min(MAXIMO_TRAMO_MS,Math.max(0,ahora-ultimoGuardado)):0;sesion.duracionActivaSegundos+=Math.round(tramo/1000);ultimoGuardado=ahora;guardando=true;const payload={empresaId:sesion.empresaId,usuarioId:sesion.usuarioId,usuarioNombre:sesion.usuarioNombre,usuarioCorreo:sesion.usuarioCorreo,fecha:sesion.fecha,inicioISO:sesion.inicioISO,duracionActivaSegundos:sesion.duracionActivaSegundos,ultimaActividad:serverTimestamp(),ultimaActividadISO:new Date().toISOString(),estado:finalizada?"FINALIZADA":"ACTIVA",fin:finalizada?serverTimestamp():null,finISO:finalizada?new Date().toISOString():null,origen:"PANEL_EMPRESARIAL"};if(!sesion.inicioRegistrado){payload.inicio=serverTimestamp();sesion.inicioRegistrado=true}try{await setDoc(sesion.ref,payload,{merge:true})}catch(e){sesion.inicioRegistrado=false;console.warn("No se pudo actualizar la medición de uso",e)}finally{guardando=false}}

export async function iniciarSeguimientoUsoSistema(usuario,empresaId){if(sesion||!usuario||!empresaId)return;const ref=doc(collection(db,"sesionesSistema")),ahora=new Date();sesion={ref,empresaId,usuarioId:usuario.uid,usuarioNombre:sessionStorage.getItem("nombre")||usuario.displayName||"Administrador",usuarioCorreo:usuario.email||sessionStorage.getItem("correo")||"",fecha:fechaLocal(),inicioISO:ahora.toISOString(),inicioRegistrado:false,duracionActivaSegundos:0};EVENTOS_ACTIVIDAD.forEach(nombre=>document.addEventListener(nombre,marcarActividad,{passive:true}));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")guardarSesion(false);else{ultimaInteraccion=Date.now();ultimoGuardado=Date.now()}});await guardarSesion(false);temporizador=setInterval(()=>guardarSesion(false),INTERVALO_GUARDADO_MS)}

export async function cerrarSeguimientoUsoSistema(){if(!sesion)return;clearInterval(temporizador);await guardarSesion(true);EVENTOS_ACTIVIDAD.forEach(nombre=>document.removeEventListener(nombre,marcarActividad));sesion=null}
