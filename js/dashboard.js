import { construirRegistrosResumen, consultarColeccionEmpresa } from "./asistencia/resumen-asistencia.js?v=20260813-3";

let cargaActual = 0;
let detallesDashboard = {};
let destinoModalDashboard = "asistencia";
let controlDashboard = null;
const coleccionesDashboard = [
  "colaboradores", "marcaciones", "asignacionesHorarios", "horarios",
  "excepcionesHorarios", "ajustesAsistenciaDiaria", "aprobacionesHorasExtra",
  "permisos", "feriados", "descansosSustitutoriosFeriados",
];

export function iniciarDashboard() {
  controlDashboard?.abort();
  controlDashboard = new AbortController();
  const opcionesEvento = { signal: controlDashboard.signal };
  const fecha = document.getElementById("fechaConsultaDashboard");
  if (!fecha) return;
  fecha.value = fechaLocal(new Date());
  actualizarSaludo();
  document.getElementById("actualizarDashboard")?.addEventListener("click", cargarDashboard, opcionesEvento);
  fecha.addEventListener("change", cargarDashboard, opcionesEvento);
  document.querySelector(".dashboard-pagina")?.addEventListener("click", (evento) => {
    const tarjeta = evento.target.closest("[data-resumen]");
    if (tarjeta) return abrirResumenDashboard(tarjeta.dataset.resumen);
    const destino = evento.target.closest("[data-ir]")?.dataset.ir;
    if (destino) navegarDashboard(destino);
  }, opcionesEvento);
  document.querySelector(".dashboard-pagina")?.addEventListener("keydown", (evento) => {
    const tarjeta = evento.target.closest("[data-resumen]");
    if (tarjeta && ["Enter", " "].includes(evento.key)) { evento.preventDefault(); abrirResumenDashboard(tarjeta.dataset.resumen); }
  }, opcionesEvento);
  document.getElementById("cerrarResumenDashboard")?.addEventListener("click", cerrarResumenDashboard, opcionesEvento);
  document.getElementById("modalResumenDashboard")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarResumenDashboard(); }, opcionesEvento);
  document.getElementById("irDetalleResumenDashboard")?.addEventListener("click", () => { cerrarResumenDashboard(); navegarDashboard(destinoModalDashboard); }, opcionesEvento);
  document.addEventListener("keydown", cerrarModalConEscape, opcionesEvento);
  cargarDashboard();
}

async function cargarDashboard() {
  const empresaId = sessionStorage.getItem("empresaId");
  const fecha = document.getElementById("fechaConsultaDashboard")?.value;
  if (!empresaId || !fecha) return;
  const turno = ++cargaActual;
  mostrarCarga(true);
  try {
    const resultados = await Promise.all(coleccionesDashboard.map((nombre) => consultarColeccionEmpresa(nombre, empresaId)));
    if (turno !== cargaActual || !document.querySelector(".dashboard-pagina")) return;
    const datos = Object.fromEntries(coleccionesDashboard.map((nombre, i) => [nombre, resultados[i]]));
    const activos = datos.colaboradores.filter((c) => String(c.estado || "ACTIVO").toUpperCase() !== "INACTIVO");
    const registrosDia = construirDia(fecha, datos);
    prepararDetalles(activos, registrosDia, fecha);
    renderizarKpis(activos, registrosDia);
    renderizarEstadoDia(registrosDia);
    renderizarAlertas(registrosDia);
    renderizarMarcaciones(datos.marcaciones, activos, fecha);
    calcularMes(fecha, datos);
    document.getElementById("fechaDashboard").textContent = `${fechaLarga(fecha)} · Información actualizada ${new Date().toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit" })}`;
  } catch (error) {
    console.error("Error cargando dashboard:", error);
    mostrarError(error.message || "No se pudo cargar la información.");
  } finally {
    if (turno === cargaActual) mostrarCarga(false);
  }
}

function prepararDetalles(activos, registros, fecha) {
  detallesDashboard = {
    activos: activos.map((c) => ({ nombre:nombreColaborador(c), documento:documentoColaborador(c), detalle:[c.organizacion?.sucursal,c.organizacion?.area,c.organizacion?.subarea].filter(Boolean).join(" · ") || "Sin ubicación asignada", valor:c.informacionAdicional?.cargoProfesion || "Colaborador activo", tono:"verde" })),
    asistieron: registros.filter((r) => esAsistencia(r.estado)).map((r) => detalleRegistro(r, `${horaMarca(r.entrada)} a ${horaMarca(r.salida)}`, "verde")),
    tardanzas: registros.filter((r) => /TARDANZA/.test(r.estado)).map((r) => detalleRegistro(r, `${r.tardanzaMinutos || 0} minutos de tardanza`, "ambar")),
    ausencias: registros.filter((r) => r.estado === "AUSENTE").map((r) => detalleRegistro(r, `Sin marcaciones el ${fechaVisible(fecha)}`, "rojo")),
    incompletos: registros.filter((r) => /INCOMPLETO/.test(r.estado)).map((r) => detalleRegistro(r, explicacionIncompleto(r), "ambar")),
    extra: registros.filter((r) => minutosExtraPendiente(r) > 0).map((r) => detalleRegistro(r, `${duracion(minutosExtraPendiente(r))} pendiente de decisión`, "ambar")),
  };
}

function detalleRegistro(r, valor, tono) { return { nombre:r.nombre, documento:r.documento || "Sin documento", detalle:`Entrada ${horaMarca(r.entrada)} · Salida ${horaMarca(r.salida)} · ${etiquetaEstado(r.estado)}`, valor, tono }; }
function explicacionIncompleto(r){if(r.entrada&&!r.salida)return "Registró entrada, pero falta la salida";if(!r.entrada&&r.salida)return "Registró salida, pero falta la entrada";return "Las marcaciones no completan la jornada";}

function construirDia(fecha, d) {
  return construirRegistrosResumen({
    fecha,
    colaboradores:d.colaboradores,
    marcaciones:d.marcaciones,
    asignaciones:d.asignacionesHorarios,
    horarios:d.horarios,
    excepciones:d.excepcionesHorarios,
    ajustesAsistencia:d.ajustesAsistenciaDiaria,
    aprobacionesHorasExtra:d.aprobacionesHorasExtra,
    permisos:d.permisos,
    feriados:d.feriados,
    descansosSustitutorios:d.descansosSustitutoriosFeriados,
  });
}

function renderizarKpis(activos, registros) {
  const asistentes = registros.filter((r) => esAsistencia(r.estado));
  const tardanzas = registros.filter((r) => /TARDANZA/.test(r.estado));
  const ausencias = registros.filter((r) => r.estado === "AUSENTE");
  const incompletos = registros.filter((r) => /INCOMPLETO/.test(r.estado));
  const extraPendiente = registros.reduce((s, r) => s + minutosExtraPendiente(r), 0);
  asignar("kpiColaboradores", activos.length);
  asignar("kpiAsistieron", asistentes.length);
  asignar("kpiTardanzas", tardanzas.length);
  asignar("kpiAusencias", ausencias.length);
  asignar("kpiIncompletos", incompletos.length);
  asignar("kpiExtraPendiente", duracion(extraPendiente));
  asignar("detalleAsistieron", `${porcentaje(asistentes.length, registrosProgramados(registros).length)}% del personal programado`);
  asignar("detalleTardanzas", tardanzas.length ? `${sumar(tardanzas,"tardanzaMinutos")} min acumulados` : "Sin tardanzas registradas");
  asignar("detalleAusencias", ausencias.length ? "Revisar permisos o justificaciones" : "Sin ausencias pendientes");
  asignar("detalleIncompletos", incompletos.length ? "Revisar entradas y salidas" : "Sin jornadas incompletas");
  asignar("detalleExtraPendiente", extraPendiente ? "Pendiente de decisión" : "Sin horas pendientes");
}

function abrirResumenDashboard(tipo) {
  const configuracion = {
    activos:["Colaboradores activos", "Personal actualmente habilitado en la empresa", "colaboradores"],
    asistieron:["Colaboradores que asistieron", "Personal con asistencia registrada en la fecha consultada", "asistencia"],
    tardanzas:["Tardanzas registradas", "Personas que superaron la tolerancia de ingreso", "asistencia"],
    ausencias:["Colaboradores ausentes", "Personal programado sin marcaciones de asistencia", "asistencia"],
    incompletos:["Jornadas incompletas", "Marcaciones que requieren revisión o corrección", "asistencia"],
    extra:["Horas extra pendientes", "Tiempo adicional que todavía necesita una decisión", "asistencia"],
  }[tipo];
  if (!configuracion) return;
  const [titulo, subtitulo, destino] = configuracion;
  const filas = detallesDashboard[tipo] || [];
  destinoModalDashboard = destino;
  asignar("tituloResumenDashboard", titulo);
  asignar("subtituloResumenDashboard", subtitulo);
  asignar("cantidadResumenDashboard", `${filas.length} ${filas.length === 1 ? "registro" : "registros"}`);
  document.getElementById("irDetalleResumenDashboard").textContent = destino === "colaboradores" ? "Gestionar colaboradores" : "Ir a Asistencia";
  document.getElementById("contenidoResumenDashboard").innerHTML = filas.length ? filas.map((f) => `<div class="fila-resumen-dashboard"><div class="avatar-resumen">${html(iniciales(f.nombre))}</div><span><strong>${html(f.nombre)}</strong><small>${html(f.documento)} · ${html(f.detalle)}</small></span><em><span class="estado-chip-dashboard ${html(f.tono)}">${html(f.valor)}</span></em></div>`).join("") : '<div class="modal-resumen-vacio"><i class="bi bi-check-circle"></i>No existen personas en este indicador.</div>';
  const modal = document.getElementById("modalResumenDashboard");
  modal.hidden = false; modal.inert = false; modal.removeAttribute("inert"); modal.setAttribute("aria-hidden", "false");
  document.getElementById("cerrarResumenDashboard").focus();
}

function cerrarResumenDashboard() { const modal=document.getElementById("modalResumenDashboard");if(!modal||modal.hidden)return;if(modal.contains(document.activeElement))document.activeElement.blur();modal.inert=true;modal.setAttribute("inert","");modal.setAttribute("aria-hidden","true");modal.hidden=true; }
function cerrarModalConEscape(e){if(e.key==="Escape")cerrarResumenDashboard();}

function navegarDashboard(destino) {
  if (destino === "colaboradores" || destino === "horarios") {
    document.querySelector('.item[data-vista="empleados"]')?.click();
    if (destino === "horarios") abrirHorariosCuandoEsteListo();
    return;
  }
  document.querySelector(`.item[data-vista="${destino}"]`)?.click();
}
function abrirHorariosCuandoEsteListo(intentos=0){const tab=document.querySelector('.tab[data-tab="horarios"]');if(tab)return tab.click();if(intentos<20)setTimeout(()=>abrirHorariosCuandoEsteListo(intentos+1),100);}

function renderizarEstadoDia(registros) {
  const programados = registrosProgramados(registros);
  const puntuales = programados.filter((r) => estadosPuntuales().includes(r.estado)).length;
  const tardanzas = programados.filter((r) => /TARDANZA/.test(r.estado)).length;
  const ausencias = programados.filter((r) => r.estado === "AUSENTE").length;
  const otros = Math.max(0, programados.length - puntuales - tardanzas - ausencias);
  const asistencia = porcentaje(puntuales + tardanzas, programados.length);
  asignar("porcentajeAsistencia", `${asistencia}%`);
  asignar("leyendaPuntuales", puntuales);
  asignar("leyendaTardanzas", tardanzas);
  asignar("leyendaAusencias", ausencias);
  asignar("leyendaOtros", otros);
  document.getElementById("anilloAsistencia")?.style.setProperty("--porcentaje", asistencia);
}

function renderizarAlertas(registros) {
  const alertas = [];
  registros.forEach((r) => {
    if (r.estado === "AUSENTE") alertas.push({ prioridad:1, icono:"bi-person-x", nombre:r.nombre, detalle:"Ausencia sin marcaciones", valor:"Ausente" });
    else if (/INCOMPLETO/.test(r.estado)) alertas.push({ prioridad:2, icono:"bi-exclamation-triangle", nombre:r.nombre, detalle:"Jornada con marcación incompleta", valor:"Revisar" });
    else if (/TARDANZA/.test(r.estado)) alertas.push({ prioridad:3, icono:"bi-clock-history", nombre:r.nombre, detalle:`Llegó ${r.tardanzaMinutos || 0} min tarde`, valor:"Tardanza" });
    const extra = minutosExtraPendiente(r);
    if (extra > 0) alertas.push({ prioridad:4, icono:"bi-stopwatch", nombre:r.nombre, detalle:`${duracion(extra)} de horas extra sin decisión`, valor:"Pendiente" });
  });
  alertas.sort((a,b) => a.prioridad-b.prioridad);
  asignar("contadorAlertas", alertas.length);
  const lista = document.getElementById("listaAlertasDashboard");
  lista.innerHTML = alertas.length ? alertas.slice(0,8).map((a) => `<button class="alerta-dashboard" data-ir="asistencia" type="button"><i class="bi ${a.icono}"></i><span><strong>${html(a.nombre)}</strong><small>${html(a.detalle)}</small></span><b>${html(a.valor)}</b></button>`).join("") : '<p class="dashboard-vacio"><i class="bi bi-check-circle"></i><br>No existen alertas pendientes para esta fecha.</p>';
}

function renderizarMarcaciones(marcaciones, colaboradores, fecha) {
  const nombres = new Map(colaboradores.map((c) => [c.id, nombreColaborador(c)]));
  const recientes = marcaciones.filter((m) => m.fecha === fecha).sort((a,b) => tiempoMarca(b)-tiempoMarca(a)).slice(0,8);
  const lista = document.getElementById("listaMarcacionesDashboard");
  lista.innerHTML = recientes.length ? recientes.map((m) => { const nombre=m.colaboradorNombre||nombres.get(m.colaboradorId)||"Colaborador";return `<div class="marcacion-dashboard"><div class="marcacion-avatar">${html(iniciales(nombre))}</div><span><strong>${html(nombre)}</strong><small>${html(tipoMarcacion(m.tipo))}</small></span><time>${html(String(m.hora||"").slice(0,5)||"—")}</time></div>`; }).join("") : '<p class="dashboard-vacio">No hay marcaciones registradas en esta fecha.</p>';
}

function calcularMes(fecha, datos) {
  const seleccionada = new Date(`${fecha}T00:00:00`);
  const inicio = new Date(seleccionada.getFullYear(), seleccionada.getMonth(), 1);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const finNatural = new Date(seleccionada.getFullYear(), seleccionada.getMonth()+1, 0);
  const fin = seleccionada.getFullYear() === hoy.getFullYear() && seleccionada.getMonth() === hoy.getMonth() ? hoy : finNatural;
  const totales = { programados:0, asistencias:0, tardanzas:0, ausencias:0, trabajados:0, extra:0 };
  for (const d=new Date(inicio); d<=fin; d.setDate(d.getDate()+1)) {
    const registros = construirDia(fechaLocal(d), datos);
    registrosProgramados(registros).forEach((r) => {
      totales.programados++;
      if (esAsistencia(r.estado)) totales.asistencias++;
      if (/TARDANZA/.test(r.estado)) totales.tardanzas++;
      if (r.estado === "AUSENTE") totales.ausencias++;
      totales.trabajados += Number(r.minutosTrabajados)||0;
      totales.extra += Number(r.minutosExtra)||0;
    });
  }
  asignar("periodoDashboard", inicio.toLocaleDateString("es-PE",{month:"long",year:"numeric"}));
  asignar("mesAsistencias", totales.asistencias);
  asignar("mesTardanzas", totales.tardanzas);
  asignar("mesAusencias", totales.ausencias);
  asignar("mesHorasTrabajadas", duracion(totales.trabajados));
  asignar("mesHorasExtra", duracion(totales.extra));
  asignar("mesCumplimiento", `${porcentaje(totales.asistencias,totales.programados)}%`);
  barra("barraAsistencias", porcentaje(totales.asistencias,totales.programados));
  barra("barraTardanzas", porcentaje(totales.tardanzas,totales.programados));
  barra("barraAusencias", porcentaje(totales.ausencias,totales.programados));
}

function registrosProgramados(rs){return rs.filter((r)=>!["SIN_HORARIO","FERIADO","DESCANSO_SUSTITUTORIO"].includes(r.estado));}
function estadosPuntuales(){return ["PRESENTE","PRESENTE_CON_PERMISO","TRABAJO_EN_FERIADO","PERMISO_COMPUTABLE"];}
function esAsistencia(e){return [...estadosPuntuales(),"TARDANZA","TARDANZA_CON_PERMISO","DESCANSO_SUSTITUTORIO_TRABAJADO"].includes(e);}
function minutosExtraPendiente(r){const generada=Number(r.calculoHorasExtra?.minutosExtraTotal||r.minutosExtra)||0;const aprobada=Number(r.aprobacionHorasExtra?.minutosAprobados)||0;return Math.max(0,generada-aprobada);}
function sumar(rs,campo){return rs.reduce((s,r)=>s+(Number(r[campo])||0),0);}
function porcentaje(a,b){return b?Math.min(100,Math.round(a*100/b)):0;}
function duracion(v){const n=Math.max(0,Math.round(Number(v)||0));return `${Math.floor(n/60)} h${n%60?` ${n%60} min`:""}`;}
function barra(id,p){const e=document.getElementById(id);if(e)e.style.width=`${Math.min(100,p)}%`;}
function asignar(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function nombreColaborador(c){return [c.datosPersonales?.nombres,c.datosPersonales?.apellidos].filter(Boolean).join(" ")||c.nombreCompleto||c.nombre||"Colaborador";}
function iniciales(n){return String(n).trim().split(/\s+/).slice(0,2).map((x)=>x[0]||"").join("").toUpperCase();}
function documentoColaborador(c){return c.documento?.numero||c.numeroDocumento||c.dni||"Sin documento";}
function horaMarca(m){return m?.hora?String(m.hora).slice(0,5):"—";}
function fechaVisible(v){const p=String(v||"").split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v;}
function etiquetaEstado(v){return String(v||"Sin estado").replaceAll("_"," ").toLowerCase().replace(/^./,(c)=>c.toUpperCase());}
function tipoMarcacion(t){const x=String(t||"MARCIÓN").replaceAll("_"," ").toLowerCase();return x.replace(/^./,(c)=>c.toUpperCase());}
function tiempoMarca(m){if(typeof m.fechaHora?.toMillis==="function")return m.fechaHora.toMillis();return Date.parse(m.fechaHoraISO||`${m.fecha}T${m.hora||"00:00"}`)||0;}
function fechaLocal(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function fechaLarga(v){return new Date(`${v}T00:00:00`).toLocaleDateString("es-PE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});}
function actualizarSaludo(){const h=new Date().getHours(),saludo=h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches";asignar("saludoDashboard",`${saludo}, ${document.getElementById("nombreUsuarioTop")?.textContent||""}`.trim());}
function mostrarCarga(v){const e=document.getElementById("estadoCargaDashboard");if(e)e.hidden=!v;const b=document.getElementById("actualizarDashboard");if(b)b.disabled=v;}
function mostrarError(m){const lista=document.getElementById("listaAlertasDashboard");if(lista)lista.innerHTML=`<p class="dashboard-vacio">${html(m)}</p>`;}
function html(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
