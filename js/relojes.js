import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { sincronizarColaboradoresConRelojes } from "./empleados/sincronizacion-relojes.js?v=20260826-3";
import { obtenerEImportarUsuariosReloj } from "./empleados/gestion-reloj-colaboradores.js?v=20260826-3";

const texto=(v)=>String(v??"").trim();
const escapar=(v)=>texto(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const empresaId=()=>sessionStorage.getItem("empresaId")||"";
const fechaMs=(v)=>v?.toMillis?.()||Date.parse(v||"")||0;
const fechaVisible=(v)=>{const ms=fechaMs(v);return ms?new Date(ms).toLocaleString("es-PE"):"Sin registro";};
const estaConectado=(r)=>Date.now()-fechaMs(r.ultimaConexionEn)<7*60*1000;
const comando=(contenido)=>`C:${Date.now()}${Math.floor(Math.random()*900+100)}:${contenido}`;
let relojes=[],colaboradores=[],usuariosReloj=[];

async function cargar(){
  const id=empresaId();if(!id)return;
  const [r,c,u]=await Promise.all([
    getDocs(query(collection(db,"relojesBiometricos"),where("empresaId","==",id))),
    getDocs(query(collection(db,"colaboradores"),where("empresaId","==",id))),
    getDocs(query(collection(db,"usuariosRelojDetectados"),where("empresaId","==",id)))
  ]);
  relojes=r.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>texto(a.nombre).localeCompare(texto(b.nombre),"es"));
  colaboradores=c.docs.map(d=>({id:d.id,...d.data()}));
  usuariosReloj=u.docs.map(d=>({id:d.id,...d.data()}));
  renderizar();
}
function actualizarSelectores(){
  ["relojesSelector","relojColaboradoresSelector"].forEach(id=>{
    const s=document.getElementById(id),actual=s?.value;if(!s)return;
    s.innerHTML=relojes.map(r=>`<option value="${escapar(r.id)}">${escapar(r.nombre||"Reloj ZKTeco")} · ${escapar(r.id)}</option>`).join("");
    if(relojes.some(r=>r.id===actual))s.value=actual;
  });
}
function renderizar(){
  const conectados=relojes.filter(estaConectado).length;
  document.getElementById("relojesResumen").innerHTML=`<div class="reloj-metrica"><b>${relojes.length}</b><span>Relojes registrados</span></div><div class="reloj-metrica"><b>${conectados}</b><span>Conectados ahora</span></div><div class="reloj-metrica"><b>${relojes.reduce((n,r)=>n+(r.comandosPendientes?.length||0),0)}</b><span>Comandos pendientes</span></div>`;
  actualizarSelectores();
  document.getElementById("relojesLista").innerHTML=relojes.map(r=>`<article class="reloj-cliente-card"><div><h3>${escapar(r.nombre||"Reloj ZKTeco")}</h3><p>${escapar(r.modelo||"Modelo no indicado")} · Serie ${escapar(r.id)}</p><small>Última conexión: ${escapar(fechaVisible(r.ultimaConexionEn))}</small><small>Última marcación: ${escapar(fechaVisible(r.ultimaMarcacionEn))}</small><div class="reloj-comandos">Pendientes: ${r.comandosPendientes?.length||0} · Último enviado: ${escapar(r.ultimoComandoEnviado||"Ninguno")}</div></div><span class="reloj-conexion ${estaConectado(r)?"":"desconectado"}">${estaConectado(r)?"CONECTADO":"DESCONECTADO"}</span></article>`).join("");
  renderizarColaboradores();
}
function relojActual(id="relojesSelector"){return relojes.find(r=>r.id===document.getElementById(id)?.value);}
function usuariosDelReloj(){
  const reloj=relojActual("relojColaboradoresSelector");
  return reloj?usuariosReloj.filter(u=>u.relojSerial===reloj.id).sort((a,b)=>texto(a.nombre).localeCompare(texto(b.nombre),"es")):[];
}
function renderizarColaboradores(){
  const lista=usuariosDelReloj(),administradores=lista.filter(u=>texto(u.privilegio)!=="0").length;
  document.getElementById("relojColaboradoresResumen").innerHTML=`<div class="reloj-metrica"><b>${lista.length}</b><span>Colaboradores en el reloj</span></div><div class="reloj-metrica"><b>${lista.filter(u=>(u.huellasRegistradas||0)>0).length}</b><span>Con huellas detectadas</span></div><div class="reloj-metrica"><b>${administradores}</b><span>Administradores del equipo</span></div>`;
  document.getElementById("relojColaboradoresLista").innerHTML=lista.length?lista.map(u=>`<article class="reloj-persona"><div><h3>${escapar(u.nombre||"Sin nombre")}</h3><small>Código o DNI en reloj: ${escapar(u.pin)}</small></div><div class="reloj-dato"><b>${u.huellasRegistradas??"—"}</b><span>Huellas</span></div><div class="reloj-dato"><b>${u.rostrosRegistrados??"—"}</b><span>Rostros</span></div><div class="reloj-dato"><b>${u.tienePassword?"Sí":"No"}</b><span>Contraseña</span></div><div class="reloj-dato"><b>${texto(u.privilegio)!=="0"?"Administrador":"Usuario"}</b><span>Privilegio</span></div><div class="reloj-persona-acciones"><button data-password-pin="${escapar(u.pin)}">Cambiar contraseña</button><button class="admin" data-privilegio-pin="${escapar(u.pin)}" data-privilegio="${texto(u.privilegio)!=="0"?"0":"14"}">${texto(u.privilegio)!=="0"?"Quitar administrador":"Hacer administrador"}</button></div></article>`).join(""):'<div class="reloj-vacio">Obtén los colaboradores del reloj para consultar sus datos.</div>';
}
async function encolar(reloj,comandos){
  await updateDoc(doc(db,"relojesBiometricos",reloj.id),{comandosPendientes:arrayUnion(...comandos),comandosActualizadosEn:serverTimestamp()});
}
async function programar(contenido,mensaje){
  const reloj=relojActual();if(!reloj)return;
  await encolar(reloj,[comando(contenido)]);
  await Swal.fire({icon:"success",title:"Orden programada",text:mensaje});await cargar();
}
async function actualizarDetalles(){
  const reloj=relojActual("relojColaboradoresSelector");if(!reloj)return;
  await encolar(reloj,[comando("DATA QUERY USERINFO"),comando("DATA QUERY FINGERTMP"),comando("DATA QUERY FACE")]);
  await Swal.fire({icon:"success",title:"Consulta enviada",text:"Los datos se actualizarán en aproximadamente 30 segundos. No se descargarán las plantillas biométricas."});await cargar();
}
async function cambiarPassword(pin){
  const reloj=relojActual("relojColaboradoresSelector");if(!reloj)return;
  const r=await Swal.fire({title:"Cambiar contraseña del reloj",input:"password",inputLabel:`Código/DNI: ${pin}`,inputPlaceholder:"4 a 8 números",showCancelButton:true,confirmButtonText:"Guardar",cancelButtonText:"Cancelar",inputAttributes:{maxlength:"8",inputmode:"numeric"},inputValidator:v=>!/^\d{4,8}$/.test(v||"")?"Ingresa una contraseña de 4 a 8 números.":undefined});
  if(!r.isConfirmed)return;
  await encolar(reloj,[comando(`DATA UPDATE USERINFO PIN=${pin}\tPasswd=${r.value}`)]);
  await Swal.fire({icon:"success",title:"Cambio programado",text:"La contraseña se enviará al reloj sin modificar huellas, rostro, tarjeta ni nombre."});
}
async function cambiarPrivilegio(pin,privilegio){
  const reloj=relojActual("relojColaboradoresSelector");if(!reloj)return;
  const hacerAdmin=privilegio==="14";
  const r=await Swal.fire({icon:"warning",title:hacerAdmin?"Convertir en administrador":"Quitar privilegio de administrador",text:hacerAdmin?"Este colaborador podrá abrir el menú protegido del equipo usando sus credenciales registradas.":"El colaborador conservará sus marcaciones y credenciales, pero perderá acceso al menú.",showCancelButton:true,confirmButtonText:"Confirmar",cancelButtonText:"Cancelar"});
  if(!r.isConfirmed)return;
  await encolar(reloj,[comando(`DATA UPDATE USERINFO PIN=${pin}\tPri=${privilegio}`)]);
  await Swal.fire({icon:"success",title:"Cambio programado",text:"El reloj aplicará el privilegio en su próxima consulta."});
}
export async function iniciarRelojes(){
  document.querySelectorAll("[data-reloj-tab]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-reloj-tab]").forEach(x=>x.classList.toggle("activo",x===b));document.querySelectorAll("[data-reloj-panel]").forEach(p=>p.hidden=p.dataset.relojPanel!==b.dataset.relojTab);}));
  document.getElementById("relojesActualizar")?.addEventListener("click",cargar);
  document.getElementById("relojColaboradoresSelector")?.addEventListener("change",renderizarColaboradores);
  document.getElementById("relojActualizarDetalles")?.addEventListener("click",actualizarDetalles);
  document.getElementById("relojSolicitarMarcaciones")?.addEventListener("click",()=>programar("DATA QUERY ATTLOG","El reloj enviará inmediatamente las marcaciones almacenadas."));
  document.getElementById("relojSincronizarEmpleados")?.addEventListener("click",async()=>{const reloj=relojActual();if(!reloj)return;const activos=colaboradores.filter(c=>c.estado!=="INACTIVO"),inactivos=colaboradores.filter(c=>c.estado==="INACTIVO");const r=await Swal.fire({icon:"question",title:"Sincronizar empleados",html:`Se enviarán <b>${activos.length}</b> activos y se retirarán <b>${inactivos.length}</b> inactivos de <b>${escapar(reloj.nombre||reloj.id)}</b>.<br><small>Los usuarios existentes conservarán contraseña, huellas, rostro, tarjeta y privilegios.</small>`,showCancelButton:true,confirmButtonText:"Sincronizar",cancelButtonText:"Cancelar"});if(!r.isConfirmed)return;await sincronizarColaboradoresConRelojes(activos,{estado:"ACTIVO",relojSeriales:[reloj.id]});await sincronizarColaboradoresConRelojes(inactivos,{estado:"INACTIVO",relojSeriales:[reloj.id]});await Swal.fire({icon:"success",title:"Sincronización programada",text:"El reloj procesará las órdenes en aproximadamente 30 segundos."});await cargar();});
  document.getElementById("relojObtenerUsuarios")?.addEventListener("click",async()=>{const reloj=relojActual();if(reloj)await obtenerEImportarUsuariosReloj({empresaId:empresaId(),reloj,colaboradores});await cargar();});
  document.getElementById("relojColaboradoresLista")?.addEventListener("click",e=>{const p=e.target.closest("[data-password-pin]"),a=e.target.closest("[data-privilegio-pin]");if(p)cambiarPassword(p.dataset.passwordPin);if(a)cambiarPrivilegio(a.dataset.privilegioPin,a.dataset.privilegio);});
  await cargar();
}