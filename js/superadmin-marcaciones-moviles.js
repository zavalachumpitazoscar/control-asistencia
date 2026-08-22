import {collection,getDocs,limit,query,where} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {db} from "./firebase-config.js";

const $=id=>document.getElementById(id);
let marcaciones=[],filtradas=[],pagina=1,porPagina=10,seleccionada=null;

function h(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fechaHora(m){const d=m.fechaHora?.toDate?.()||m.creadoEn?.toDate?.()||new Date(m.fechaHoraISO||`${m.fecha||""}T${m.hora||"00:00"}`);return Number.isNaN(d.getTime())?null:d}
function fechaISO(m){return m.fecha||fechaHora(m)?.toISOString().slice(0,10)||""}
function direccion(m){return m.direccion?.direccionCompleta||m.ubicacion?.direccion||m.direccionCompleta||"Dirección no registrada"}
function coordenadas(m){const lat=Number(m.ubicacion?.latitud),lon=Number(m.ubicacion?.longitud);return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null}
function nombreTipo(v){return String(v||"MARCACIÓN").replaceAll("_"," ")}

export async function abrirHistorialMarcacionesMovil({empresaId,colaboradorId,nombre}){
  const modal=$("modalHistorialMarcacionesMovilSuper");
  $("nombreHistorialMovilSuper").textContent=nombre||"Colaborador";
  $("fechaHistorialMovilSuper").value="";
  $("listaHistorialMovilSuper").innerHTML='<div class="mobile-history-loading">Cargando marcaciones…</div>';
  $("mapaHistorialMovilSuper").innerHTML='<div class="mobile-map-empty">Selecciona una marcación con GPS.</div>';
  $("resumenHistorialMovilSuper").textContent="Consultando información…";
  modal.showModal();
  try{
    const snap=await getDocs(query(collection(db,"marcaciones"),where("colaboradorId","==",colaboradorId),limit(1000)));
    marcaciones=snap.docs.map(x=>({id:x.id,...x.data()})).filter(x=>x.empresaId===empresaId).sort((a,b)=>(fechaHora(b)?.getTime()||0)-(fechaHora(a)?.getTime()||0));
    pagina=1;seleccionada=null;filtrar();
  }catch(error){
    $("listaHistorialMovilSuper").innerHTML=`<div class="mobile-history-error">No se pudo cargar el historial: ${h(String(error?.message||error))}</div>`;
    $("resumenHistorialMovilSuper").textContent="Error al consultar";
  }
}

function filtrar(){const fecha=$("fechaHistorialMovilSuper").value;porPagina=Number($("cantidadHistorialMovilSuper").value||10);filtradas=marcaciones.filter(x=>!fecha||fechaISO(x)===fecha);const paginas=Math.max(1,Math.ceil(filtradas.length/porPagina));pagina=Math.min(Math.max(1,pagina),paginas);$("resumenHistorialMovilSuper").textContent=`${filtradas.length} marcación(es)${fecha?` el ${new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE")}`:" encontradas"}`;renderLista();renderPaginacion()}
function renderLista(){const inicio=(pagina-1)*porPagina,items=filtradas.slice(inicio,inicio+porPagina);$("listaHistorialMovilSuper").innerHTML=items.map(m=>{const momento=fechaHora(m),gps=coordenadas(m),activa=seleccionada?.id===m.id;return`<button type="button" class="mobile-mark-row ${activa?"selected":""}" data-marca-movil-super="${h(m.id)}"><span class="mobile-mark-icon">${gps?"⌖":"○"}</span><span><b>${h(nombreTipo(m.tipoInterpretado||m.tipo))}</b><small>${h(momento?momento.toLocaleString("es-PE",{dateStyle:"medium",timeStyle:"short"}):fechaISO(m)||"Fecha no disponible")}</small><em>${h(direccion(m))}</em></span><i>${h(m.origen||"SISTEMA")}</i></button>`}).join("")||'<div class="mobile-history-empty">No existen marcaciones para el filtro seleccionado.</div>';if(!seleccionada&&items.length){seleccionada=items[0];renderMapa(seleccionada);renderLista()}}
function renderPaginacion(){const paginas=Math.max(1,Math.ceil(filtradas.length/porPagina));$("paginaHistorialMovilSuper").textContent=`Página ${pagina} de ${paginas}`;$("anteriorHistorialMovilSuper").disabled=pagina<=1;$("siguienteHistorialMovilSuper").disabled=pagina>=paginas}
function renderMapa(m){const gps=coordenadas(m),contenedor=$("mapaHistorialMovilSuper");if(!gps){contenedor.innerHTML=`<div class="mobile-map-empty"><b>Ubicación no registrada</b><span>Esta marcación no contiene coordenadas GPS.</span></div>`;return}const margen=.004,bbox=[gps.lon-margen,gps.lat-margen,gps.lon+margen,gps.lat+margen].join("%2C"),embed=`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${gps.lat}%2C${gps.lon}`,google=`https://www.google.com/maps?q=${encodeURIComponent(`${gps.lat},${gps.lon}`)}`,precision=Number(m.ubicacion?.precisionMetros);contenedor.innerHTML=`<iframe title="Mapa de la marcación" loading="lazy" src="${embed}"></iframe><div class="mobile-map-detail"><b>${h(direccion(m))}</b><span>${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}${Number.isFinite(precision)?` · Precisión ±${Math.round(precision)} m`:""}</span><a href="${google}" target="_blank" rel="noopener noreferrer">Abrir mapa en grande ↗</a></div>`}

document.addEventListener("click",e=>{const marca=e.target.closest("[data-marca-movil-super]");if(marca){seleccionada=marcaciones.find(x=>x.id===marca.dataset.marcaMovilSuper)||null;if(seleccionada){renderMapa(seleccionada);renderLista()}}});
$("fechaHistorialMovilSuper")?.addEventListener("change",()=>{pagina=1;seleccionada=null;filtrar()});
$("cantidadHistorialMovilSuper")?.addEventListener("change",()=>{pagina=1;filtrar()});
$("limpiarFechaHistorialMovilSuper")?.addEventListener("click",()=>{$("fechaHistorialMovilSuper").value="";pagina=1;seleccionada=null;filtrar()});
$("anteriorHistorialMovilSuper")?.addEventListener("click",()=>{if(pagina>1){pagina--;seleccionada=null;renderLista();renderPaginacion()}});
$("siguienteHistorialMovilSuper")?.addEventListener("click",()=>{if(pagina<Math.ceil(filtradas.length/porPagina)){pagina++;seleccionada=null;renderLista();renderPaginacion()}});
