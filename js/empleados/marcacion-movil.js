import { auth, db } from "../firebase-config.js";
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let colaboradores=[], accesos=[], solicitudes=[], sucursales=[], control;

export function iniciarAdministracionMarcacionMovil(){
  control?.abort(); control=new AbortController(); const o={signal:control.signal};
  document.getElementById("buscarAccesoMovil")?.addEventListener("input",renderizar,o);
  document.getElementById("listaAccesosMoviles")?.addEventListener("click",accion,o);
  document.getElementById("listaGeocercasMoviles")?.addEventListener("click",geocerca,o);
  cargar();
}

async function cargar(){
  const empresaId=sessionStorage.getItem("empresaId"); if(!empresaId)return;
  try{
    const datos=await Promise.all(["colaboradores","accesosMoviles","solicitudesDispositivoMovil","sucursales"].map(n=>getDocs(query(collection(db,n),where("empresaId","==",empresaId)))));
    [colaboradores,accesos,solicitudes,sucursales]=datos.map(s=>s.docs.map(d=>({id:d.id,...d.data()})));
    renderizar(); renderizarGeocercas(); resumen();
  }catch(e){alerta("No se pudo cargar",mensaje(e),"error");}
}

function renderizar(){
  const lista=document.getElementById("listaAccesosMoviles"); if(!lista)return;
  const q=normalizar(document.getElementById("buscarAccesoMovil")?.value), mapa=new Map(accesos.map(a=>[a.colaboradorId,a]));
  const filas=colaboradores.filter(c=>c.estado!=="INACTIVO").map(c=>{const a=mapa.get(c.id),s=solicitudes.find(x=>x.colaboradorId===c.id&&x.estado==="PENDIENTE");return {c,a,s,n:nombre(c),dni:documento(c),correo:String(c.contacto?.correo||c.correo||"").trim().toLowerCase()};}).filter(x=>!q||normalizar(`${x.n} ${x.dni} ${x.correo}`).includes(q));
  lista.innerHTML=filas.length?filas.map(({c,a,s,n,dni,correo})=>`<article class="fila-acceso-movil"><div class="avatar-acceso-movil">${html(iniciales(n))}</div><div><strong>${html(n)}</strong><small>${html(dni)} · ${html(correo||"Sin correo")}</small><em class="estado-acceso-movil ${s?"PENDIENTE_AUTORIZACION":a?.estado||"NO_HABILITADO"}">${s?"Dispositivo por autorizar":a?.estado==="AUTORIZADO"?"Dispositivo autorizado":a?.usuarioId?"Esperando autorización":"Esperando registro"}</em>${s?`<small>${html(s.dispositivo?.descripcion||"Dispositivo móvil")}</small>`:""}</div><div class="acciones-acceso-movil">${!a?`<button class="primario" data-habilitar="${c.id}">Habilitar</button>`:""}${s?`<button class="primario" data-autorizar="${s.id}">Autorizar dispositivo</button><button data-rechazar="${s.id}">Rechazar</button>`:""}${a?`<button data-copiar="${c.id}">Copiar enlace</button><button class="peligro" data-revocar="${c.id}">Revocar</button>`:""}</div></article>`).join(""):'<p class="movil-vacio">No se encontraron colaboradores.</p>';
}

async function accion(e){
  const b=e.target.closest("button"); if(!b)return;
  try{
    if(b.dataset.copiar){await copiarEnlace(); return;}
    if(b.dataset.habilitar){
      const c=colaboradores.find(x=>x.id===b.dataset.habilitar), correo=String(c?.contacto?.correo||c?.correo||"").trim().toLowerCase();
      if(!correo)return alerta("Correo obligatorio","Registra el correo del colaborador.","warning");
      await setDoc(doc(db,"accesosMoviles",c.id),{empresaId:sessionStorage.getItem("empresaId"),colaboradorId:c.id,correo,nombre:nombre(c),sucursalId:c.sucursalId||c.ubicacionOrganizacional?.sucursalId||null,areaId:c.areaId||c.ubicacionOrganizacional?.areaId||null,estado:"ESPERANDO_REGISTRO",usuarioId:null,creadoEn:serverTimestamp(),actualizadoEn:serverTimestamp(),actualizadoPor:auth.currentUser?.uid||null});
      await copiarEnlace("Acceso habilitado");
    }else if(b.dataset.autorizar){
      const s=solicitudes.find(x=>x.id===b.dataset.autorizar); if(!s)throw new Error("Solicitud no encontrada.");
      await updateDoc(doc(db,"accesosMoviles",s.colaboradorId),{estado:"AUTORIZADO",dispositivoAutorizadoId:s.dispositivoId,dispositivo:s.dispositivo,autorizadoEn:serverTimestamp(),actualizadoPor:auth.currentUser?.uid||null});
      await updateDoc(doc(db,"solicitudesDispositivoMovil",s.id),{estado:"AUTORIZADO",resueltoEn:serverTimestamp()}); await cargar();
    }else if(b.dataset.rechazar){await updateDoc(doc(db,"solicitudesDispositivoMovil",b.dataset.rechazar),{estado:"RECHAZADO",resueltoEn:serverTimestamp()});await cargar();}
    else if(b.dataset.revocar){const r=await Swal.fire({title:"¿Revocar acceso móvil?",icon:"warning",showCancelButton:true,confirmButtonText:"Revocar"});if(r.isConfirmed){await deleteDoc(doc(db,"accesosMoviles",b.dataset.revocar));await cargar();}}
  }catch(e){alerta("No se pudo completar",mensaje(e),"error");}
}

async function copiarEnlace(titulo="Enlace copiado"){const url=new URL("movil.html",location.href).href;try{await navigator.clipboard.writeText(url);}catch{}await alerta(titulo,"Envía el enlace al colaborador para que cree su contraseña y verifique su correo.","success");await cargar();}

function renderizarGeocercas(){const l=document.getElementById("listaGeocercasMoviles");if(!l)return;l.innerHTML=sucursales.length?sucursales.map(s=>`<div class="fila-geocerca" data-sucursal="${s.id}"><div><strong>${html(s.nombre)}</strong><p>${html(s.direccion||"Sin dirección")}</p></div><label>Latitud<input data-lat type="number" step="any" value="${html(s.geocercaMovil?.latitud??"")}"></label><label>Longitud<input data-lng type="number" step="any" value="${html(s.geocercaMovil?.longitud??"")}"></label><label>Radio (metros)<input data-radio type="number" min="20" max="5000" value="${html(s.geocercaMovil?.radioMetros??150)}"></label><div class="geocerca-acciones"><button data-ubicacion-actual>Usar mi ubicación</button><button class="primario" data-guardar-geocerca>Guardar</button></div></div>`).join(""):'<p class="movil-vacio">No existen sucursales.</p>';}
async function geocerca(e){const f=e.target.closest("[data-sucursal]");if(!f)return;if(e.target.closest("[data-ubicacion-actual]")){navigator.geolocation.getCurrentPosition(p=>{f.querySelector("[data-lat]").value=p.coords.latitude;f.querySelector("[data-lng]").value=p.coords.longitude;},()=>alerta("Sin ubicación","Autoriza la ubicación.","warning"),{enableHighAccuracy:true});return;}if(e.target.closest("[data-guardar-geocerca]")){try{await updateDoc(doc(db,"sucursales",f.dataset.sucursal),{geocercaMovil:{latitud:Number(f.querySelector("[data-lat]").value),longitud:Number(f.querySelector("[data-lng]").value),radioMetros:Number(f.querySelector("[data-radio]").value)},actualizadoEn:serverTimestamp()});alerta("Perímetro guardado","Geocerca actualizada.","success");}catch(e){alerta("No se pudo guardar",mensaje(e),"error");}}}
function resumen(){asignar("movilPendientes",solicitudes.filter(s=>s.estado==="PENDIENTE").length);asignar("movilAutorizados",accesos.filter(a=>a.estado==="AUTORIZADO").length);asignar("movilSinHabilitar",Math.max(0,colaboradores.filter(c=>c.estado!=="INACTIVO").length-accesos.length));asignar("movilObservaciones",0);}function nombre(c){return [c.datosPersonales?.nombres||c.nombres,c.datosPersonales?.apellidos||c.apellidos].filter(Boolean).join(" ")||"Colaborador";}function documento(c){return c.documento?.numero||c.numeroDocumento||c.dni||"Sin DNI";}function iniciales(n){return n.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();}function normalizar(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}function html(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}function asignar(id,v){const x=document.getElementById(id);if(x)x.textContent=v;}function mensaje(e){return String(e?.message||"Error inesperado").replace(/^FirebaseError:\s*/,"");}function alerta(t,x,i){return Swal.fire({title:t,text:x,icon:i,confirmButtonColor:"#2563eb"});}
