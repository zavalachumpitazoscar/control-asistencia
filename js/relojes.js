import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { sincronizarColaboradoresConRelojes } from "./empleados/sincronizacion-relojes.js?v=20260826-2";
import { obtenerEImportarUsuariosReloj } from "./empleados/gestion-reloj-colaboradores.js?v=20260826-3";

const texto=(v)=>String(v??"").trim();
const empresaId=()=>sessionStorage.getItem("empresaId")||"";
const fechaMs=(v)=>v?.toMillis?.()||Date.parse(v||"")||0;
const fechaVisible=(v)=>{const ms=fechaMs(v);return ms?new Date(ms).toLocaleString("es-PE"):"Sin registro";};
const estaConectado=(reloj)=>Date.now()-fechaMs(reloj.ultimaConexionEn)<7*60*1000;
const comando=(contenido)=>`C:${Date.now()}${Math.floor(Math.random()*900+100)}:${contenido}`;
let relojes=[],colaboradores=[];

async function cargar(){
  const id=empresaId();
  if(!id)return;
  const [r,c]=await Promise.all([
    getDocs(query(collection(db,"relojesBiometricos"),where("empresaId","==",id))),
    getDocs(query(collection(db,"colaboradores"),where("empresaId","==",id)))
  ]);
  relojes=r.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>texto(a.nombre).localeCompare(texto(b.nombre),"es"));
  colaboradores=c.docs.map(d=>({id:d.id,...d.data()}));
  renderizar();
}
function renderizar(){
  const conectados=relojes.filter(estaConectado).length;
  document.getElementById("relojesResumen").innerHTML=`<div class="reloj-metrica"><b>${relojes.length}</b><span>Relojes registrados</span></div><div class="reloj-metrica"><b>${conectados}</b><span>Conectados ahora</span></div><div class="reloj-metrica"><b>${relojes.reduce((n,r)=>n+(r.comandosPendientes?.length||0),0)}</b><span>Comandos pendientes</span></div>`;
  const selector=document.getElementById("relojesSelector"),actual=selector.value;
  selector.innerHTML=relojes.map(r=>`<option value="${r.id}">${texto(r.nombre)||"Reloj ZKTeco"} · ${r.id}</option>`).join("");
  if(relojes.some(r=>r.id===actual))selector.value=actual;
  document.getElementById("relojesLista").innerHTML=relojes.map(r=>`<article class="reloj-cliente-card"><div><h3>${texto(r.nombre)||"Reloj ZKTeco"}</h3><p>${texto(r.modelo)||"Modelo no indicado"} · Serie ${r.id}</p><small>Última conexión: ${fechaVisible(r.ultimaConexionEn)}</small><small>Última marcación: ${fechaVisible(r.ultimaMarcacionEn)}</small><div class="reloj-comandos">Pendientes: ${r.comandosPendientes?.length||0} · Último enviado: ${texto(r.ultimoComandoEnviado)||"Ninguno"}</div></div><span class="reloj-conexion ${estaConectado(r)?"":"desconectado"}">${estaConectado(r)?"CONECTADO":"DESCONECTADO"}</span></article>`).join("");
}
const relojSeleccionado=()=>relojes.find(r=>r.id===document.getElementById("relojesSelector")?.value);
async function programar(contenido,mensaje){
  const reloj=relojSeleccionado();
  if(!reloj)return;
  await updateDoc(doc(db,"relojesBiometricos",reloj.id),{comandosPendientes:arrayUnion(comando(contenido)),comandosActualizadosEn:serverTimestamp()});
  await Swal.fire({icon:"success",title:"Orden programada",text:mensaje});
  await cargar();
}
export async function iniciarRelojes(){
  document.getElementById("relojesActualizar")?.addEventListener("click",cargar);
  document.getElementById("relojSolicitarMarcaciones")?.addEventListener("click",()=>programar("DATA QUERY ATTLOG","El reloj enviará las marcaciones almacenadas cuando consulte el servidor."));
  document.getElementById("relojSincronizarEmpleados")?.addEventListener("click",async()=>{
    const reloj=relojSeleccionado();if(!reloj)return;
    const activos=colaboradores.filter(c=>c.estado!=="INACTIVO"),inactivos=colaboradores.filter(c=>c.estado==="INACTIVO");
    const confirmacion=await Swal.fire({icon:"question",title:"Sincronizar empleados",html:`Se enviarán <b>${activos.length}</b> activos y se retirarán <b>${inactivos.length}</b> inactivos de <b>${texto(reloj.nombre)||reloj.id}</b>.`,showCancelButton:true,confirmButtonText:"Sincronizar",cancelButtonText:"Cancelar"});
    if(!confirmacion.isConfirmed)return;
    await sincronizarColaboradoresConRelojes(activos,{estado:"ACTIVO",relojSeriales:[reloj.id]});
    await sincronizarColaboradoresConRelojes(inactivos,{estado:"INACTIVO",relojSeriales:[reloj.id]});
    await Swal.fire({icon:"success",title:"Sincronización programada",text:"El reloj procesará las órdenes cuando se conecte."});await cargar();
  });
  document.getElementById("relojObtenerUsuarios")?.addEventListener("click",async()=>{const reloj=relojSeleccionado();if(reloj)await obtenerEImportarUsuariosReloj({empresaId:empresaId(),reloj,colaboradores});await cargar();});
  await cargar();
}