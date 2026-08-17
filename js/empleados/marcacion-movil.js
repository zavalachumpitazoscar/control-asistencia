import { db } from "../firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

let colaboradores=[];
let accesos=[];
let solicitudes=[];
let sucursales=[];
let control=null;
const funciones=getFunctions(undefined,"us-central1");

export function iniciarAdministracionMarcacionMovil(){
  control?.abort();control=new AbortController();const opciones={signal:control.signal};
  document.getElementById("buscarAccesoMovil")?.addEventListener("input",renderizarAccesos,opciones);
  document.getElementById("listaAccesosMoviles")?.addEventListener("click",procesarAccion,opciones);
  document.getElementById("listaGeocercasMoviles")?.addEventListener("click",procesarGeocerca,opciones);
  cargarTodo();
}

async function cargarTodo(){
  const empresaId=sessionStorage.getItem("empresaId");if(!empresaId)return;
  try{
    const [c,a,s,u]=await Promise.all(["colaboradores","accesosMoviles","solicitudesDispositivoMovil","sucursales"].map(nombre=>getDocs(query(collection(db,nombre),where("empresaId","==",empresaId)))));
    colaboradores=c.docs.map(d=>({id:d.id,...d.data()}));
    accesos=a.docs.map(d=>({id:d.id,...d.data()}));
    solicitudes=s.docs.map(d=>({id:d.id,...d.data()}));
    sucursales=u.docs.map(d=>({id:d.id,...d.data()}));
    renderizarAccesos();renderizarGeocercas();actualizarResumen();
  }catch(error){aviso("No se pudo cargar",mensajeFuncion(error),"error");}
}

function renderizarAccesos(){
  const q=normalizar(document.getElementById("buscarAccesoMovil")?.value);const lista=document.getElementById("listaAccesosMoviles");if(!lista)return;
  const accesoPorColaborador=new Map(accesos.map(a=>[a.colaboradorId,a]));
  const filas=colaboradores.filter(c=>c.estado!=="INACTIVO").map(c=>{const a=accesoPorColaborador.get(c.id);const solicitud=solicitudes.find(s=>s.colaboradorId===c.id&&s.estado==="PENDIENTE");return {c,a,solicitud,nombre:nombre(c),dni:documento(c),correo:c.contacto?.correo||c.correo||""};}).filter(x=>!q||normalizar(`${x.nombre} ${x.dni} ${x.correo}`).includes(q));
  lista.innerHTML=filas.length?filas.map(({c,a,solicitud,nombre,dni,correo})=>`<article class="fila-acceso-movil"><div class="avatar-acceso-movil">${html(iniciales(nombre))}</div><div><strong>${html(nombre)}</strong><small>${html(dni)} · ${html(correo||"Sin correo")}</small><em class="estado-acceso-movil ${html(estado(a,solicitud))}">${html(etiquetaEstado(a,solicitud))}</em>${solicitud?`<small><i class="bi bi-phone"></i> ${html(solicitud.dispositivo?.descripcion||"Dispositivo móvil")} · ${html(solicitud.dispositivo?.plataforma||"")}</small>`:""}</div><div class="acciones-acceso-movil">${!a?`<button class="primario" data-invitar="${c.id}"><i class="bi bi-envelope"></i> Habilitar</button>`:""}${solicitud?`<button class="primario" data-autorizar="${solicitud.id}"><i class="bi bi-shield-check"></i> Autorizar dispositivo</button><button data-rechazar="${solicitud.id}">Rechazar</button>`:""}${a?`<button data-reenviar="${c.id}">Reenviar invitación</button><button class="peligro" data-revocar="${c.id}">Revocar acceso</button>`:""}</div></article>`).join(""):'<p class="movil-vacio">No se encontraron colaboradores.</p>';
}

async function procesarAccion(e){
  const boton=e.target.closest("button");if(!boton)return;
  const mapa=[['invitar','invitarColaboradorMovil'],['reenviar','invitarColaboradorMovil'],['autorizar','autorizarDispositivoMovil'],['rechazar','rechazarDispositivoMovil'],['revocar','revocarAccesoMovil']];
  const accion=mapa.find(([dato])=>boton.dataset[dato]);if(!accion)return;
  if(accion[0]==="invitar"||accion[0]==="reenviar"){
    const c=colaboradores.find(x=>x.id===boton.dataset[accion[0]]);const correo=c?.contacto?.correo||c?.correo;
    if(!correo)return aviso("Correo obligatorio","Edita al colaborador y registra su correo antes de habilitar la marcación móvil.","warning");
  }
  if(accion[0]==="revocar"){const r=await Swal.fire({title:"¿Revocar acceso móvil?",text:"El colaborador y su dispositivo dejarán de poder marcar.",icon:"warning",showCancelButton:true,confirmButtonText:"Revocar",confirmButtonColor:"#dc2626"});if(!r.isConfirmed)return;}
  boton.disabled=true;
  try{
    const callable=httpsCallable(funciones,accion[1]);
    const dato=accion[0]==="autorizar"||accion[0]==="rechazar"?{solicitudId:boton.dataset[accion[0]]}:{colaboradorId:boton.dataset[accion[0]]};
    await callable(dato);await aviso("Operación completada",accion[0]==="autorizar"?"El dispositivo ya puede registrar la credencial segura.":accion[0]==="revocar"?"El acceso móvil fue revocado.":"La invitación o solicitud fue procesada.","success");await cargarTodo();
  }catch(error){aviso("No se pudo completar",mensajeFuncion(error),"error");boton.disabled=false;}
}

function renderizarGeocercas(){
  const lista=document.getElementById("listaGeocercasMoviles");if(!lista)return;
  lista.innerHTML=sucursales.length?sucursales.map(s=>`<div class="fila-geocerca" data-sucursal="${s.id}"><div><strong>${html(s.nombre)}</strong><p>${html(s.direccion||"Sin dirección")}</p></div><label>Latitud<input data-lat type="number" step="any" value="${html(s.geocercaMovil?.latitud??"")}"></label><label>Longitud<input data-lng type="number" step="any" value="${html(s.geocercaMovil?.longitud??"")}"></label><label>Radio (metros)<input data-radio type="number" min="20" max="5000" value="${html(s.geocercaMovil?.radioMetros??150)}"></label><div class="geocerca-acciones"><button data-ubicacion-actual><i class="bi bi-crosshair"></i> Usar mi ubicación</button><button class="primario" data-guardar-geocerca>Guardar</button></div></div>`).join(""):'<p class="movil-vacio">No existen sucursales registradas.</p>';
}

async function procesarGeocerca(e){
  const fila=e.target.closest("[data-sucursal]");if(!fila)return;
  if(e.target.closest("[data-ubicacion-actual]")){navigator.geolocation.getCurrentPosition(p=>{fila.querySelector("[data-lat]").value=p.coords.latitude;fila.querySelector("[data-lng]").value=p.coords.longitude;},()=>aviso("Sin ubicación","Autoriza la ubicación del navegador.","warning"),{enableHighAccuracy:true});return;}
  if(!e.target.closest("[data-guardar-geocerca]"))return;
  try{await httpsCallable(funciones,"guardarGeocercaMovil")({sucursalId:fila.dataset.sucursal,latitud:Number(fila.querySelector("[data-lat]").value),longitud:Number(fila.querySelector("[data-lng]").value),radioMetros:Number(fila.querySelector("[data-radio]").value)});aviso("Perímetro guardado","Las marcaciones móviles se validarán contra esta ubicación.","success");}catch(error){aviso("No se pudo guardar",mensajeFuncion(error),"error");}
}

function actualizarResumen(){const pendientes=solicitudes.filter(s=>s.estado==="PENDIENTE").length,autorizados=accesos.filter(a=>a.estado==="AUTORIZADO").length;asignar("movilPendientes",pendientes);asignar("movilAutorizados",autorizados);asignar("movilSinHabilitar",Math.max(0,colaboradores.filter(c=>c.estado!=="INACTIVO").length-accesos.length));asignar("movilObservaciones",accesos.filter(a=>a.estado==="BLOQUEADO"||a.alertaRiesgo).length);}
function estado(a,s){return s?"PENDIENTE_AUTORIZACION":a?.estado||"NO_HABILITADO";}function etiquetaEstado(a,s){return s?"Dispositivo por autorizar":a?.estado==="AUTORIZADO"?"Dispositivo autorizado":a?"Esperando primer acceso":"No habilitado";}
function nombre(c){return [c.datosPersonales?.nombres||c.nombres,c.datosPersonales?.apellidos||c.apellidos].filter(Boolean).join(" ")||"Colaborador";}function documento(c){return c.documento?.numero||c.numeroDocumento||c.dni||"Sin DNI";}function iniciales(n){return n.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();}function normalizar(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}function html(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}function asignar(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}function mensajeFuncion(e){return String(e?.message||"Error inesperado").replace(/^FirebaseError:\s*/,"");}function aviso(t,x,i){return Swal.fire({title:t,text:x,icon:i,confirmButtonColor:"#2563eb"});}
