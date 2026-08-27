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
let busquedaColaborador="",filtroProcedencia="",filtroPrivilegio="",paginaColaboradores=1,porPaginaColaboradores=10;
const privilegiosPendientes=new Map();

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
  renderizarActividad();
}
function descripcionComando(valor){const c=texto(valor);if(c.includes("ATTLOG"))return"Solicitar marcaciones";if(c.includes("USERINFO"))return"Consultar o actualizar usuarios";if(c.includes("FINGERTMP"))return"Consultar huellas";if(c.includes("FACE"))return"Consultar rostros";if(c.includes("DateTime"))return"Sincronizar hora";if(c.includes("REBOOT"))return"Reiniciar equipo";if(c.includes("DELETE USERINFO"))return"Retirar colaborador";return"Comando administrativo";}
function renderizarActividad(){const reloj=relojActual(),alerta=document.getElementById("relojAlertaDesconexion");if(!reloj||!alerta)return;const minutos=Math.floor((Date.now()-fechaMs(reloj.ultimaConexionEn))/60000),desconectado=!estaConectado(reloj);alerta.innerHTML=desconectado?`<div class="reloj-alerta"><i class="bi bi-wifi-off"></i><div><b>Reloj desconectado</b><span>Sin comunicación hace ${Number.isFinite(minutos)?minutos:"—"} minutos.</span></div></div>`:"";document.getElementById("relojInformacionEquipo").innerHTML=`<div><span>Nombre</span><b>${escapar(reloj.nombre||"Reloj ZKTeco")}</b></div><div><span>Modelo</span><b>${escapar(reloj.modelo||"No informado")}</b></div><div><span>Número de serie</span><b>${escapar(reloj.id)}</b></div><div><span>Firmware</span><b>${escapar(reloj.firmware||"Pendiente de consultar")}</b></div><div><span>Usuarios detectados</span><b>${reloj.usuariosDetectados??"—"}</b></div><div><span>Capacidad / memoria</span><b>${escapar(reloj.capacidadDisponible||"Pendiente de consultar")}</b></div>`;const conexiones=(reloj.historialConexion||[]).slice().sort((a,b)=>fechaMs(b.fecha)-fechaMs(a.fecha)).slice(0,30);document.getElementById("relojHistorialConexion").innerHTML=conexiones.length?conexiones.map(x=>`<div><i class="bi ${x.tipo==="DESCONECTADO"?"bi-wifi-off":"bi-wifi"}"></i><span><b>${escapar(x.tipo||"CONEXIÓN")}</b><small>${escapar(fechaVisible(x.fecha))}</small></span></div>`).join(""):'<div class="reloj-vacio">El historial comenzará desde esta actualización.</div>';const historial=(reloj.historialComandos||[]).slice().sort((a,b)=>fechaMs(b.fecha||b.enviadoEn)-fechaMs(a.fecha||a.enviadoEn)).slice(0,50);document.getElementById("relojHistorialComandos").innerHTML=historial.length?historial.map(x=>`<div><i class="bi bi-terminal"></i><span><b>${escapar(x.descripcion||descripcionComando(x.comando))}</b><small>${escapar(x.estado||"PROGRAMADO")} · ${escapar(fechaVisible(x.enviadoEn||x.fecha))}</small></span></div>`).join(""):'<div class="reloj-vacio">Todavía no hay comandos registrados.</div>';}
function relojActual(id="relojesSelector"){return relojes.find(r=>r.id===document.getElementById(id)?.value);}
function usuariosDelReloj(){
  const reloj=relojActual("relojColaboradoresSelector");
  return reloj?usuariosReloj.filter(u=>u.relojSerial===reloj.id).sort((a,b)=>texto(a.nombre).localeCompare(texto(b.nombre),"es")):[];
}
function normalizarDocumento(valor){return texto(valor).replace(/\D/g,"").replace(/^0+(?=\d)/,"");}
function documentoColaborador(colaborador){return texto(colaborador?.documento?.numero||colaborador?.numeroDocumento||colaborador?.documentoNumero);}
function colaboradorEnSistema(usuario){
  const pin=normalizarDocumento(usuario.pin);
  return colaboradores.find(colaborador=>normalizarDocumento(documentoColaborador(colaborador))===pin)||null;
}
function renderizarColaboradores(){
  const todos=usuariosDelReloj().map(usuario=>({...usuario,colaboradorSistema:colaboradorEnSistema(usuario)}));
  const sistemaYReloj=todos.filter(usuario=>usuario.colaboradorSistema).length,soloReloj=todos.length-sistemaYReloj;
  const termino=busquedaColaborador.toLocaleLowerCase("es");
  const filtrados=todos.filter(usuario=>{
    const procedencia=usuario.colaboradorSistema?"SISTEMA_RELOJ":"SOLO_RELOJ";
    const privilegio=texto(usuario.privilegio)!=="0"?"ADMIN":"USUARIO";
    const coincideProcedencia=!filtroProcedencia||filtroProcedencia===procedencia;
    const coincidePrivilegio=!filtroPrivilegio||filtroPrivilegio===privilegio;
    const coincideBusqueda=!termino||`${texto(usuario.nombre)} ${texto(usuario.pin)}`.toLocaleLowerCase("es").includes(termino);
    return coincideProcedencia&&coincidePrivilegio&&coincideBusqueda;
  });
  const totalPaginas=Math.max(1,Math.ceil(filtrados.length/porPaginaColaboradores));
  paginaColaboradores=Math.min(paginaColaboradores,totalPaginas);
  const inicio=(paginaColaboradores-1)*porPaginaColaboradores,lista=filtrados.slice(inicio,inicio+porPaginaColaboradores);
  document.getElementById("relojColaboradoresResumen").innerHTML=`<div class="reloj-metrica"><b>${todos.length}</b><span>Colaboradores en el reloj</span></div><div class="reloj-metrica"><b>${sistemaYReloj}</b><span>Sistema y reloj</span></div><div class="reloj-metrica"><b>${soloReloj}</b><span>Solo en el reloj</span></div>`;
  document.getElementById("relojColaboradoresLista").innerHTML=lista.length?lista.map(u=>{
    const esAdmin=texto(u.privilegio)!=="0",clavePendiente=`${texto(u.relojSerial)}__${texto(u.pin)}`,pendiente=privilegiosPendientes.get(clavePendiente);
    if(pendiente&&pendiente.objetivo===texto(u.privilegio))privilegiosPendientes.delete(clavePendiente);
    if(pendiente&&Date.now()-pendiente.desde>180000)privilegiosPendientes.delete(clavePendiente);
    const cambioPendiente=privilegiosPendientes.has(clavePendiente);
    const procedencia=u.colaboradorSistema?'<span class="reloj-origen sistema"><i class="bi bi-check2-circle"></i> Sistema y reloj</span>':'<span class="reloj-origen solo"><i class="bi bi-exclamation-circle"></i> Solo en reloj</span>';
    const accionAdmin=cambioPendiente?'<span class="reloj-cambio-pendiente"><i class="bi bi-hourglass-split"></i> Cambio pendiente</span>':(esAdmin?`<span class="reloj-admin-etiqueta"><i class="bi bi-shield-lock"></i> Administrador</span><button class="admin" data-privilegio-pin="${escapar(u.pin)}" data-privilegio="0">Quitar administrador</button>`:`<button class="admin" data-privilegio-pin="${escapar(u.pin)}" data-privilegio="14">Hacer administrador</button>`);
    return `<article class="reloj-persona"><div><div class="reloj-persona-titulo"><h3>${escapar(u.nombre||"Sin nombre")}</h3>${procedencia}</div><small>Código o DNI en reloj: ${escapar(u.pin)}</small></div><div class="reloj-dato"><b>${u.huellasRegistradas??"—"}</b><span>Huellas</span></div><div class="reloj-dato"><b>${u.rostrosRegistrados??"—"}</b><span>Rostros</span></div><div class="reloj-dato"><b>${u.tienePassword?"Sí":"No"}</b><span>Contraseña</span></div><div class="reloj-dato"><b>${cambioPendiente?"Pendiente":(esAdmin?"Administrador":"Usuario")}</b><span>Privilegio</span></div><div class="reloj-persona-acciones"><button data-password-pin="${escapar(u.pin)}">Cambiar contraseña</button>${accionAdmin}<button class="eliminar" data-retirar-pin="${escapar(u.pin)}" data-retirar-nombre="${escapar(u.nombre||u.pin)}">Retirar del reloj</button></div></article>`;
  }).join(""):`<div class="reloj-vacio">${todos.length?"No hay colaboradores que coincidan con la búsqueda o el filtro.":"Obtén los colaboradores del reloj para consultar sus datos."}</div>`;
  const desde=filtrados.length?inicio+1:0,hasta=Math.min(inicio+porPaginaColaboradores,filtrados.length);
  document.getElementById("relojColaboradoresPaginacion").innerHTML=`<span>Mostrando ${desde}–${hasta} de ${filtrados.length}</span><div><label>Mostrar <select id="relojPorPagina"><option value="10" ${porPaginaColaboradores===10?"selected":""}>10</option><option value="20" ${porPaginaColaboradores===20?"selected":""}>20</option><option value="50" ${porPaginaColaboradores===50?"selected":""}>50</option></select></label><button type="button" data-pagina-reloj="${paginaColaboradores-1}" ${paginaColaboradores<=1?"disabled":""}><i class="bi bi-chevron-left"></i></button><b>${paginaColaboradores} / ${totalPaginas}</b><button type="button" data-pagina-reloj="${paginaColaboradores+1}" ${paginaColaboradores>=totalPaginas?"disabled":""}><i class="bi bi-chevron-right"></i></button></div>`;
}
async function encolar(reloj,comandos){
  const fecha=new Date(),historial=comandos.map(valor=>({comando:valor,descripcion:descripcionComando(valor),estado:"PROGRAMADO",fecha:fecha.toISOString()}));
  await updateDoc(doc(db,"relojesBiometricos",reloj.id),{comandosPendientes:arrayUnion(...comandos),historialComandos:arrayUnion(...historial),comandosActualizadosEn:serverTimestamp()});
}
async function retirarUsuario(pin,nombre){const reloj=relojActual("relojColaboradoresSelector");if(!reloj)return;const r=await Swal.fire({icon:"warning",title:"Retirar del reloj",html:`Se eliminará <b>${escapar(nombre)}</b> únicamente de <b>${escapar(reloj.nombre||reloj.id)}</b>.<br><small>El colaborador y sus marcaciones permanecerán en la plataforma.</small>`,showCancelButton:true,confirmButtonText:"Retirar",cancelButtonText:"Cancelar"});if(!r.isConfirmed)return;await encolar(reloj,[comando(`DATA DELETE USERINFO PIN=${pin}`),comando("DATA QUERY USERINFO")]);await Swal.fire({icon:"success",title:"Retiro programado",text:"El reloj procesará la orden y luego actualizará su lista."});}
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
  const r=await Swal.fire({icon:"warning",title:hacerAdmin?"Convertir en administrador":"Quitar privilegio de administrador",text:hacerAdmin?"Este colaborador podrá abrir el menú protegido del equipo usando sus credenciales registradas.":"El colaborador conservará sus marcaciones y credenciales, pero perderá acceso al menú protegido. Si no queda otro administrador, el equipo dejará de solicitar credenciales para abrir ese menú.",showCancelButton:true,confirmButtonText:hacerAdmin?"Hacer administrador":"Quitar administrador",cancelButtonText:"Cancelar"});
  if(!r.isConfirmed)return;
  privilegiosPendientes.set(`${reloj.id}__${pin}`,{objetivo:privilegio,desde:Date.now()});
  renderizarColaboradores();
  await encolar(reloj,[comando(`DATA UPDATE USERINFO PIN=${pin}\tPri=${privilegio}`),comando("DATA QUERY USERINFO")]);
  await Swal.fire({icon:"success",title:"Cambio programado",text:"Se aplicará el privilegio y luego se comprobará nuevamente con el reloj. Puede tardar aproximadamente un minuto."});
  setTimeout(()=>cargar().catch(error=>console.warn("No se confirmó todavía el privilegio del reloj:",error)),70000);
}
export async function iniciarRelojes(){
  document.querySelectorAll("[data-reloj-tab]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-reloj-tab]").forEach(x=>x.classList.toggle("activo",x===b));document.querySelectorAll("[data-reloj-panel]").forEach(p=>p.hidden=p.dataset.relojPanel!==b.dataset.relojTab);}));
  document.getElementById("relojesActualizar")?.addEventListener("click",cargar);
  document.getElementById("relojColaboradoresSelector")?.addEventListener("change",renderizarColaboradores);
  document.getElementById("relojBuscarColaborador")?.addEventListener("input",evento=>{busquedaColaborador=texto(evento.target.value);paginaColaboradores=1;renderizarColaboradores();});
  document.getElementById("relojFiltroProcedencia")?.addEventListener("change",evento=>{filtroProcedencia=texto(evento.target.value);paginaColaboradores=1;renderizarColaboradores();});
  document.getElementById("relojFiltroPrivilegio")?.addEventListener("change",evento=>{filtroPrivilegio=texto(evento.target.value);paginaColaboradores=1;renderizarColaboradores();});
  document.getElementById("relojActualizarDetalles")?.addEventListener("click",actualizarDetalles);
  document.getElementById("relojSolicitarMarcaciones")?.addEventListener("click",()=>programar("DATA QUERY ATTLOG","El reloj enviará inmediatamente las marcaciones almacenadas."));
  document.getElementById("relojSincronizarHora")?.addEventListener("click",()=>programar("SET OPTIONS DateTime=__SERVER_TIME__","El reloj tomará la fecha y hora del servidor en su próxima consulta."));
  document.getElementById("relojReiniciar")?.addEventListener("click",async()=>{const reloj=relojActual();if(!reloj)return;const r=await Swal.fire({icon:"warning",title:"¿Reiniciar el equipo?",html:`Se reiniciará <b>${escapar(reloj.nombre||reloj.id)}</b>. Durante unos momentos no recibirá marcaciones ni órdenes.`,showCancelButton:true,confirmButtonText:"Sí, reiniciar",cancelButtonText:"Cancelar",confirmButtonColor:"#dc2626"});if(!r.isConfirmed)return;await programar("REBOOT","El reinicio se ejecutará cuando el reloj consulte nuevamente al servidor.");});
  document.getElementById("relojSincronizarEmpleados")?.addEventListener("click",async()=>{const reloj=relojActual();if(!reloj)return;const activos=colaboradores.filter(c=>c.estado!=="INACTIVO"),inactivos=colaboradores.filter(c=>c.estado==="INACTIVO");const r=await Swal.fire({icon:"question",title:"Sincronizar empleados",html:`Se enviarán <b>${activos.length}</b> activos y se retirarán <b>${inactivos.length}</b> inactivos de <b>${escapar(reloj.nombre||reloj.id)}</b>.<br><small>Los usuarios existentes conservarán contraseña, huellas, rostro, tarjeta y privilegios.</small>`,showCancelButton:true,confirmButtonText:"Sincronizar",cancelButtonText:"Cancelar"});if(!r.isConfirmed)return;await sincronizarColaboradoresConRelojes(activos,{estado:"ACTIVO",relojSeriales:[reloj.id]});await sincronizarColaboradoresConRelojes(inactivos,{estado:"INACTIVO",relojSeriales:[reloj.id]});await Swal.fire({icon:"success",title:"Sincronización programada",text:"El reloj procesará las órdenes en aproximadamente 30 segundos."});await cargar();});
  document.getElementById("relojRetirarInactivos")?.addEventListener("click",async()=>{const reloj=relojActual(),inactivos=colaboradores.filter(c=>c.estado==="INACTIVO");if(!reloj)return;const r=await Swal.fire({icon:"warning",title:"Retirar inactivos",text:`Se retirarán ${inactivos.length} colaboradores inactivos únicamente de este reloj.`,showCancelButton:true,confirmButtonText:"Retirar inactivos",cancelButtonText:"Cancelar"});if(!r.isConfirmed)return;await sincronizarColaboradoresConRelojes(inactivos,{estado:"INACTIVO",relojSeriales:[reloj.id]});await Swal.fire({icon:"success",title:"Órdenes programadas",text:"Los registros de la plataforma no serán eliminados."});await cargar();});
  document.getElementById("relojObtenerUsuarios")?.addEventListener("click",async()=>{const reloj=relojActual();if(reloj)await obtenerEImportarUsuariosReloj({empresaId:empresaId(),reloj,colaboradores});await cargar();});
  document.getElementById("relojColaboradoresLista")?.addEventListener("click",e=>{const p=e.target.closest("[data-password-pin]"),a=e.target.closest("[data-privilegio-pin]"),d=e.target.closest("[data-retirar-pin]");if(p)cambiarPassword(p.dataset.passwordPin);if(a)cambiarPrivilegio(a.dataset.privilegioPin,a.dataset.privilegio);if(d)retirarUsuario(d.dataset.retirarPin,d.dataset.retirarNombre);});
  document.getElementById("relojEditarNombre")?.addEventListener("click",async()=>{const reloj=relojActual();if(!reloj)return;const r=await Swal.fire({title:"Nombre del reloj",input:"text",inputValue:reloj.nombre||"",inputLabel:`Serie: ${reloj.id}`,showCancelButton:true,confirmButtonText:"Guardar",inputValidator:v=>!texto(v)?"Ingresa un nombre para identificar el equipo.":undefined});if(!r.isConfirmed)return;await updateDoc(doc(db,"relojesBiometricos",reloj.id),{nombre:texto(r.value).slice(0,80),actualizadoEn:serverTimestamp()});await cargar();});
  document.getElementById("relojColaboradoresPaginacion")?.addEventListener("click",e=>{const boton=e.target.closest("[data-pagina-reloj]");if(!boton||boton.disabled)return;paginaColaboradores=Number(boton.dataset.paginaReloj)||1;renderizarColaboradores();});
  document.getElementById("relojColaboradoresPaginacion")?.addEventListener("change",e=>{if(e.target.id!=="relojPorPagina")return;porPaginaColaboradores=Number(e.target.value)||10;paginaColaboradores=1;renderizarColaboradores();});
  await cargar();
}
