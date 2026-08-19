import { construirRegistrosResumen, consultarColeccionEmpresa } from "./asistencia/resumen-asistencia.js?v=20260818-7";
import { obtenerEstadoPlan } from "./suscripcion-limites.js?v=20260819-1";

let cargaActual = 0;
let detallesDashboard = {};
let destinoModalDashboard = "asistencia";
let controlDashboard = null;
let datosDashboard = null;
let fechaUltimaCargaDashboard = null;
const coleccionesDashboard = [
  "colaboradores", "marcaciones", "asignacionesHorarios", "horarios",
  "excepcionesHorarios", "ajustesAsistenciaDiaria", "aprobacionesHorasExtra",
  "permisos", "feriados", "descansosSustitutoriosFeriados",
  "solicitudesDispositivoMovil",
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
  ["filtroSucursalDashboard", "filtroAreaDashboard", "filtroSubareaDashboard"].forEach((id) => document.getElementById(id)?.addEventListener("change", renderizarDashboardFiltrado, opcionesEvento));
  document.getElementById("limpiarFiltrosDashboard")?.addEventListener("click", limpiarFiltrosDashboard, opcionesEvento);
  document.addEventListener("perfilUsuarioActualizado", cargarDashboard, opcionesEvento);
  document.querySelector(".dashboard-pagina")?.addEventListener("click", (evento) => {
    const tarjeta = evento.target.closest("[data-resumen]");
    if (tarjeta) return abrirResumenDashboard(tarjeta.dataset.resumen);
    const destino = evento.target.closest("[data-ir]")?.dataset.ir;
    if (destino) navegarDashboard(destino, evento.target.closest("[data-colaborador]")?.dataset);
  }, opcionesEvento);
  document.querySelector(".dashboard-pagina")?.addEventListener("keydown", (evento) => {
    const tarjeta = evento.target.closest("[data-resumen]");
    if (tarjeta && ["Enter", " "].includes(evento.key)) { evento.preventDefault(); abrirResumenDashboard(tarjeta.dataset.resumen); }
  }, opcionesEvento);
  document.getElementById("cerrarResumenDashboard")?.addEventListener("click", cerrarResumenDashboard, opcionesEvento);
  document.getElementById("modalResumenDashboard")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarResumenDashboard(); }, opcionesEvento);
  document.getElementById("contenidoResumenDashboard")?.addEventListener("click", (e) => {
    const accion=e.target.closest("[data-accion-configuracion]");
    if(accion)resolverConfiguracionDashboard(accion.dataset.accionConfiguracion,accion.dataset.colaborador,accion.dataset.nombre);
  }, opcionesEvento);
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
    datosDashboard = Object.fromEntries(coleccionesDashboard.map((nombre, i) => [nombre, resultados[i]]));
    datosDashboard.estadoPlan = await obtenerEstadoPlan(empresaId, datosDashboard.colaboradores.length);
    fechaUltimaCargaDashboard = new Date();
    prepararFiltrosDashboard(datosDashboard.colaboradores);
    renderizarDashboardFiltrado();
  } catch (error) {
    console.error("Error cargando dashboard:", error);
    mostrarError(error.message || "No se pudo cargar la información.");
  } finally {
    if (turno === cargaActual) mostrarCarga(false);
  }
}

function renderizarDashboardFiltrado() {
  const fecha = document.getElementById("fechaConsultaDashboard")?.value;
  if (!datosDashboard || !fecha) return;
  const colaboradores = filtrarColaboradoresPorAlcance(datosDashboard.colaboradores);
  const datos = { ...datosDashboard, colaboradores };
  const activos = colaboradores.filter((c) => String(c.estado || "ACTIVO").toUpperCase() !== "INACTIVO");
  const registrosDia = construirDia(fecha, datos);
  const ayer = new Date(`${fecha}T00:00:00`); ayer.setDate(ayer.getDate() - 1);
  const registrosAyer = construirDia(fechaLocal(ayer), datos);
  prepararDetalles(activos, registrosDia, fecha);
  renderizarKpis(activos, registrosDia, registrosAyer);
  renderizarEstadoDia(registrosDia);
  renderizarAlertas(registrosDia, fecha);
  renderizarMarcaciones(datos.marcaciones, activos, fecha, registrosDia);
  renderizarConfiguracion(activos, registrosDia, datos, fecha);
  calcularMes(fecha, datos);
  actualizarEstadoActualizacion(fecha);
  renderizarPlanDashboard(datosDashboard.estadoPlan);
}

function renderizarPlanDashboard(estado) {
  if (!estado) return;
  const { plan, usados, maximo, disponibles, suscripcion } = estado;
  const ilimitado = maximo === null;
  const porcentaje = ilimitado ? 35 : Math.min(100, Math.round((usados / maximo) * 100));
  const excedido = !ilimitado && usados > maximo;
  const completo = !ilimitado && usados === maximo;
  const cerca = !ilimitado && usados / maximo >= .8 && !completo && !excedido;
  asignar("nombrePlanDashboard", plan.nombre);
  asignar("usoPlanDashboard", ilimitado ? `${usados} colaboradores · sin máximo` : `${usados} de ${maximo} colaboradores`);
  asignar("cuposPlanDashboard", ilimitado ? "Colaboradores ilimitados" : excedido ? `Límite excedido por ${usados - maximo}` : `${disponibles} ${disponibles === 1 ? "cupo disponible" : "cupos disponibles"}`);
  const barra = document.getElementById("barraPlanDashboard");
  if (barra) barra.style.width = `${porcentaje}%`;
  const estadoVisual = document.getElementById("estadoPlanDashboard");
  if (estadoVisual) {
    estadoVisual.className = `plan-estado ${excedido || completo ? "limite" : cerca ? "cerca" : "disponible"}`;
    estadoVisual.textContent = excedido ? "Plan excedido" : completo ? "Límite alcanzado" : cerca ? "Cerca del límite" : ilimitado ? "Sin límite" : "Disponible";
  }
  const hoy = fechaLocal(new Date());
  const vencida = suscripcion.fechaFin && suscripcion.fechaFin < hoy;
  const condicion = vencida ? "Suscripción vencida" : suscripcion.condicion === "PAGADO" ? "Pagado" : suscripcion.condicion === "SIN_PAGAR" ? "Pago pendiente" : "Plan gratuito";
  asignar("vigenciaPlanDashboard", suscripcion.fechaFin ? `${condicion} · vence ${fechaVisible(suscripcion.fechaFin)}` : condicion);
  document.getElementById("planEmpresaDashboard")?.classList.toggle("vencido", Boolean(vencida));
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

function renderizarKpis(activos, registros, registrosAyer) {
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
  const ayer = {
    asistieron: registrosAyer.filter((r) => esAsistencia(r.estado)).length,
    tardanzas: registrosAyer.filter((r) => /TARDANZA/.test(r.estado)).length,
    ausencias: registrosAyer.filter((r) => r.estado === "AUSENTE").length,
    incompletos: registrosAyer.filter((r) => /INCOMPLETO/.test(r.estado)).length,
    extra: registrosAyer.reduce((s, r) => s + minutosExtraPendiente(r), 0),
  };
  comparacionDiaria("comparacionAsistieron", asistentes.length, ayer.asistieron, "asistencia", true);
  comparacionDiaria("comparacionTardanzas", tardanzas.length, ayer.tardanzas, "tardanza");
  comparacionDiaria("comparacionAusencias", ausencias.length, ayer.ausencias, "ausencia");
  comparacionDiaria("comparacionIncompletos", incompletos.length, ayer.incompletos, "jornada incompleta");
  comparacionDiaria("comparacionExtra", extraPendiente, ayer.extra, "min de extra");
}

function comparacionDiaria(id, actual, anterior, etiqueta, positivoSiSube=false) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  const diferencia = actual - anterior;
  elemento.className = `kpi-comparacion ${diferencia === 0 ? "neutro" : ((diferencia > 0) === positivoSiSube ? "mejora" : "alerta")}`;
  elemento.textContent = diferencia === 0 ? `Igual que ayer: ${anterior}` : `${diferencia > 0 ? "+" : ""}${diferencia} ${etiqueta}${Math.abs(diferencia) === 1 ? "" : "s"} vs. ayer`;
}

function abrirResumenDashboard(tipo) {
  const configuracion = {
    activos:["Colaboradores activos", "Personal actualmente habilitado en la empresa", "colaboradores"],
    asistieron:["Colaboradores que asistieron", "Personal con asistencia registrada en la fecha consultada", "asistencia"],
    tardanzas:["Tardanzas registradas", "Personas que superaron la tolerancia de ingreso", "asistencia"],
    ausencias:["Colaboradores ausentes", "Personal programado sin marcaciones de asistencia", "asistencia"],
    incompletos:["Jornadas incompletas", "Marcaciones que requieren revisión o corrección", "asistencia"],
    extra:["Horas extra pendientes", "Tiempo adicional que todavía necesita una decisión", "asistencia"],
    sinHorario:["Colaboradores sin horario", "Personal sin programación para la fecha consultada", "horarios"],
    sinOrganizacion:["Ubicación organizacional incompleta", "Personal que necesita sucursal o área", "colaboradores"],
  }[tipo];
  if (!configuracion) return;
  const [titulo, subtitulo, destino] = configuracion;
  const filas = detallesDashboard[tipo] || [];
  destinoModalDashboard = destino;
  asignar("tituloResumenDashboard", titulo);
  asignar("subtituloResumenDashboard", subtitulo);
  asignar("cantidadResumenDashboard", `${filas.length} ${filas.length === 1 ? "registro" : "registros"}`);
  document.getElementById("irDetalleResumenDashboard").textContent = destino === "colaboradores" ? "Gestionar colaboradores" : destino === "horarios" ? "Ir a Horarios" : "Ir a Asistencia";
  document.getElementById("contenidoResumenDashboard").innerHTML = filas.length ? filas.map((f) => `<div class="fila-resumen-dashboard"><div class="avatar-resumen">${html(iniciales(f.nombre))}</div><span><strong>${html(f.nombre)}</strong><small>${html(f.documento)} · ${html(f.detalle)}</small></span><em>${f.accion?`<button class="accion-configuracion-dashboard" data-accion-configuracion="${html(f.accion)}" data-colaborador="${html(f.id||"")}" data-nombre="${html(f.busqueda||f.nombre)}" type="button">${html(f.valor)}</button>`:`<span class="estado-chip-dashboard ${html(f.tono)}">${html(f.valor)}</span>`}</em></div>`).join("") : '<div class="modal-resumen-vacio"><i class="bi bi-check-circle"></i>No existen personas en este indicador.</div>';
  const modal = document.getElementById("modalResumenDashboard");
  modal.hidden = false; modal.inert = false; modal.removeAttribute("inert"); modal.setAttribute("aria-hidden", "false");
  document.getElementById("cerrarResumenDashboard").focus();
}

function cerrarResumenDashboard() { const modal=document.getElementById("modalResumenDashboard");if(!modal||modal.hidden)return;if(modal.contains(document.activeElement))document.activeElement.blur();modal.inert=true;modal.setAttribute("inert","");modal.setAttribute("aria-hidden","true");modal.hidden=true; }
function cerrarModalConEscape(e){if(e.key==="Escape")cerrarResumenDashboard();}

function resolverConfiguracionDashboard(accion,id,nombre){
  cerrarResumenDashboard();
  if(accion==="ASIGNAR_HORARIO"){
    sessionStorage.setItem("dashboardColaboradorHorario",JSON.stringify({id,nombre}));
    navegarDashboard("horarios");
    return;
  }
  sessionStorage.setItem("dashboardColaboradorEdicion",JSON.stringify({id,nombre}));
  navegarDashboard("colaboradores");
  abrirColaboradorCuandoEsteListo(id,nombre);
}
function abrirColaboradorCuandoEsteListo(id,nombre,intentos=0){const buscar=document.getElementById("buscarColaborador");const boton=document.querySelector(`.btn-editar-colaborador[data-id="${CSS.escape(id||"")}"]`);if(buscar){buscar.value=nombre||"";buscar.dispatchEvent(new Event("input",{bubbles:true}));setTimeout(()=>document.querySelector(`.btn-editar-colaborador[data-id="${CSS.escape(id||"")}"]`)?.click(),120);return;}if(boton)return boton.click();if(intentos<25)setTimeout(()=>abrirColaboradorCuandoEsteListo(id,nombre,intentos+1),100);}

function navegarDashboard(destino, contexto) {
  if (contexto?.fecha) sessionStorage.setItem("dashboardContextoAsistencia", JSON.stringify(contexto));
  if (["colaboradores","horarios","marcacion-movil"].includes(destino)) {
    document.querySelector('.item[data-vista="empleados"]')?.click();
    if (destino === "horarios") abrirHorariosCuandoEsteListo();
    if (destino === "marcacion-movil") abrirMarcacionMovilCuandoEsteListo();
    return;
  }
  document.querySelector(`.item[data-vista="${destino}"]`)?.click();
  if (destino === "asistencia" && contexto?.fecha) aplicarContextoAsistencia(contexto);
}
function abrirHorariosCuandoEsteListo(intentos=0){const tab=document.querySelector('.tab[data-tab="horarios"]');if(tab){tab.click();const contexto=sessionStorage.getItem("dashboardColaboradorHorario");if(contexto&&window.Swal)setTimeout(()=>Swal.fire({icon:"info",title:"Colaborador preparado",text:"Selecciona un horario activo y pulsa Asignar. El colaborador del Dashboard quedará preseleccionado.",confirmButtonText:"Entendido"}),350);return;}if(intentos<20)setTimeout(()=>abrirHorariosCuandoEsteListo(intentos+1),100);}
function abrirMarcacionMovilCuandoEsteListo(intentos=0){const tab=document.querySelector('.tab[data-tab="marcacion-movil"]');if(tab){tab.click();return;}if(intentos<20)setTimeout(()=>abrirMarcacionMovilCuandoEsteListo(intentos+1),100);}
function aplicarContextoAsistencia(contexto,intentos=0){const fecha=document.getElementById("selectorFechaAsistencia"),buscar=document.getElementById("buscarResumenAsistencia");if(fecha&&buscar){fecha.value=contexto.fecha;fecha.dispatchEvent(new Event("change",{bubbles:true}));buscar.value=contexto.nombre||"";buscar.dispatchEvent(new Event("input",{bubbles:true}));return;}if(intentos<25)setTimeout(()=>aplicarContextoAsistencia(contexto,intentos+1),100);}

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

function renderizarAlertas(registros, fecha) {
  const alertas = [];
  registros.forEach((r) => {
    (r.clasificacion?.sinClasificar || []).forEach(() =>
      alertas.push({ prioridad:1, icono:"bi-clock-history", nombre:r.nombre, colaboradorId:r.colaboradorId, detalle:"Marcación fuera de los rangos del horario", valor:"Regularizar" }),
    );
    if (r.estado === "AUSENTE") alertas.push({ prioridad:1, icono:"bi-person-x", nombre:r.nombre, colaboradorId:r.colaboradorId, detalle:"Ausencia sin marcaciones", valor:"Revisar ausencia" });
    else if (/INCOMPLETO/.test(r.estado)) alertas.push({ prioridad:2, icono:"bi-exclamation-triangle", nombre:r.nombre, colaboradorId:r.colaboradorId, detalle:"Jornada con marcación incompleta", valor:"Completar" });
    else if (/TARDANZA/.test(r.estado)) alertas.push({ prioridad:3, icono:"bi-clock-history", nombre:r.nombre, colaboradorId:r.colaboradorId, detalle:`Llegó ${r.tardanzaMinutos || 0} min tarde`, valor:"Ver tardanza" });
    const extra = minutosExtraPendiente(r);
    if (extra > 0) alertas.push({ prioridad:4, icono:"bi-stopwatch", nombre:r.nombre, colaboradorId:r.colaboradorId, detalle:`${duracion(extra)} de horas extra sin decisión`, valor:"Decidir" });
  });
  alertas.sort((a,b) => a.prioridad-b.prioridad);
  asignar("contadorAlertas", alertas.length);
  const lista = document.getElementById("listaAlertasDashboard");
  lista.innerHTML = alertas.length ? alertas.slice(0,8).map((a) => `<button class="alerta-dashboard" data-ir="asistencia" data-colaborador="${html(a.colaboradorId || "")}" data-nombre="${html(a.nombre)}" data-fecha="${html(fecha)}" type="button"><i class="bi ${a.icono}"></i><span><strong>${html(a.nombre)}</strong><small>${html(a.detalle)} · Pulsa para atender</small></span><b>${html(a.valor)}</b></button>`).join("") : '<p class="dashboard-vacio"><i class="bi bi-check-circle"></i><br>Todo en orden: no existen alertas para esta fecha.</p>';
}

function renderizarMarcaciones(marcaciones, colaboradores, fecha, registros = []) {
  const nombres = new Map(colaboradores.map((c) => [c.id, nombreColaborador(c)]));
  const tiposInterpretados = new Map();
  registros.forEach((registro) =>
    (registro.clasificacion?.todas || []).forEach((marca) => {
      if (!marca.id) return;
      if (marca.tipoInterpretado) tiposInterpretados.set(marca.id, marca.tipoInterpretado);
      else if (String(marca.origen || "").toUpperCase() === "MOVIL") tiposInterpretados.set(marca.id, "SIN_CLASIFICAR");
    }),
  );
  const recientes = marcaciones.filter((m) => m.fecha === fecha).sort((a,b) => tiempoMarca(b)-tiempoMarca(a)).slice(0,8);
  const lista = document.getElementById("listaMarcacionesDashboard");
  lista.innerHTML = recientes.length ? recientes.map((m) => { const nombre=m.colaboradorNombre||nombres.get(m.colaboradorId)||"Colaborador";const interpretado=tiposInterpretados.get(m.id);const tipo=interpretado||m.tipo;const nota=interpretado==="SIN_CLASIFICAR"?" · Fuera de rango":interpretado&&interpretado!==m.tipo?" · Interpretada por horario":"";return `<div class="marcacion-dashboard"><div class="marcacion-avatar">${html(iniciales(nombre))}</div><span><strong>${html(nombre)}</strong><small>${html(tipoMarcacion(tipo))}${nota}</small></span><time>${html(horaMarca(m))}</time></div>`; }).join("") : '<p class="dashboard-vacio">No hay marcaciones registradas en esta fecha.</p>';
}

function prepararFiltrosDashboard(colaboradores) {
  const alcance = aplicarAlcanceUsuario(colaboradores);
  llenarFiltro("filtroSucursalDashboard", alcance.map((c)=>valorOrg(c,"sucursal")));
  llenarFiltro("filtroAreaDashboard", alcance.map((c)=>valorOrg(c,"area")));
  llenarFiltro("filtroSubareaDashboard", alcance.map((c)=>valorOrg(c,"subarea")));
  const rol = sessionStorage.getItem("rolUsuarioDashboard") || "Perfil en verificación";
  asignar("alcanceDashboard", /admin|propiet|gerent/i.test(rol) ? "Toda la empresa" : `Información autorizada para ${rol}`);
}

function llenarFiltro(id, valores) {
  const select=document.getElementById(id); if(!select)return;
  const actual=select.value;
  const opciones=[...new Set(valores.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  select.innerHTML=`<option value="">Todas</option>${opciones.map((v)=>`<option value="${html(v)}">${html(v)}</option>`).join("")}`;
  if(opciones.includes(actual))select.value=actual;
}

function filtrarColaboradoresPorAlcance(colaboradores) {
  const base=aplicarAlcanceUsuario(colaboradores);
  const filtros={sucursal:document.getElementById("filtroSucursalDashboard")?.value,area:document.getElementById("filtroAreaDashboard")?.value,subarea:document.getElementById("filtroSubareaDashboard")?.value};
  return base.filter((c)=>Object.entries(filtros).every(([tipo,valor])=>!valor||valorOrg(c,tipo)===valor));
}

function aplicarAlcanceUsuario(colaboradores) {
  const rol=sessionStorage.getItem("rolUsuarioDashboard");
  if(!rol)return [];
  if(/admin|propiet|gerent/i.test(rol))return colaboradores;
  const alcance={sucursal:sessionStorage.getItem("sucursalUsuarioDashboard"),area:sessionStorage.getItem("areaUsuarioDashboard"),subarea:sessionStorage.getItem("subareaUsuarioDashboard")};
  const definidos=Object.entries(alcance).filter(([,v])=>v);
  return definidos.length?colaboradores.filter((c)=>definidos.every(([tipo,v])=>normalizar(valorOrg(c,tipo))===normalizar(v))):[];
}

function limpiarFiltrosDashboard(){["filtroSucursalDashboard","filtroAreaDashboard","filtroSubareaDashboard"].forEach((id)=>{const e=document.getElementById(id);if(e)e.value="";});renderizarDashboardFiltrado();}

function valorOrg(c,tipo){const o=c.organizacion||{};const valor=o[tipo]??o[`${tipo}Nombre`]??c[tipo]??c[`${tipo}Nombre`];if(valor&&typeof valor==="object")return valor.nombre||valor.descripcion||valor.id||"";return String(valor||"").trim();}
function normalizar(v){return String(v||"").trim().toLowerCase();}

function renderizarConfiguracion(activos, registros, datos, fecha) {
  const avisos=[];
  const colaboradoresPorId=new Map(activos.map((c)=>[c.id,c]));
  const sinHorario=registros.filter((r)=>r.estado==="SIN_HORARIO");
  const sinOrganizacion=activos.filter((c)=>!valorOrg(c,"sucursal")||!valorOrg(c,"area"));
  const feriadosPendientes=registros.filter((r)=>r.estado==="FERIADO_PENDIENTE");
  const incompletos=registros.filter((r)=>/INCOMPLETO/.test(r.estado));
  const limite=new Date(`${fecha}T00:00:00`);limite.setDate(limite.getDate()+7);
  const porVencer=(datos.asignacionesHorarios||[]).filter((a)=>{const f=a.fechaFin||a.hasta||a.fin;if(!f)return false;const d=new Date(`${String(f).slice(0,10)}T00:00:00`);return d>=new Date(`${fecha}T00:00:00`)&&d<=limite;});
  const dispositivosPendientes=(datos.solicitudesDispositivoMovil||[]).filter(s=>s.estado==="PENDIENTE");
  detallesDashboard.sinHorario=sinHorario.map((r)=>{const colaborador=colaboradoresPorId.get(r.colaboradorId);return {id:r.colaboradorId,nombre:colaborador?nombreColaborador(colaborador):nombreApellidoPrimero(r.nombre),documento:r.documento||"Sin documento",detalle:`Sin programación el ${fechaVisible(fecha)}`,valor:"Asignar horario",accion:"ASIGNAR_HORARIO",tono:"ambar"};});
  detallesDashboard.sinOrganizacion=sinOrganizacion.map((c)=>({id:c.id,nombre:nombreColaborador(c),busqueda:nombreColaboradorNombresPrimero(c),documento:documentoColaborador(c),detalle:[!valorOrg(c,"sucursal")?"Falta sucursal":"",!valorOrg(c,"area")?"Falta área":""].filter(Boolean).join(" · "),valor:"Completar ubicación",accion:"COMPLETAR_UBICACION",tono:"ambar"}));
  if(sinHorario.length)avisos.push({icono:"bi-calendar-x",titulo:`${sinHorario.length} sin horario para la fecha`,detalle:"Ver quiénes son y asignarles un horario.",config:"sinHorario"});
  if(sinOrganizacion.length)avisos.push({icono:"bi-diagram-3",titulo:`${sinOrganizacion.length} sin ubicación completa`,detalle:"Ver quiénes son y completar sus datos.",config:"sinOrganizacion"});
  if(feriadosPendientes.length)avisos.push({icono:"bi-calendar-event",titulo:`${feriadosPendientes.length} feriados por configurar`,detalle:"Define el tratamiento de la jornada.",destino:"horarios"});
  if(incompletos.length)avisos.push({icono:"bi-exclamation-square",titulo:`${incompletos.length} marcaciones sin completar`,detalle:"Revisa entradas o salidas faltantes.",destino:"asistencia"});
  if(porVencer.length)avisos.push({icono:"bi-hourglass-split",titulo:`${porVencer.length} asignaciones próximas a vencer`,detalle:"Vencen dentro de los siguientes 7 días.",destino:"horarios"});
  if(dispositivosPendientes.length)avisos.push({icono:"bi-phone-vibrate",titulo:`${dispositivosPendientes.length} dispositivos móviles por autorizar`,detalle:"Revisa qué colaboradores solicitaron acceso.",destino:"marcacion-movil"});
  asignar("contadorConfiguracion",avisos.length);
  const lista=document.getElementById("listaConfiguracionDashboard");if(!lista)return;
  lista.innerHTML=avisos.length?avisos.map((a)=>`<button ${a.config?`data-resumen="${a.config}"`:`data-ir="${a.destino}"`} type="button"><i class="bi ${a.icono}"></i><span><strong>${html(a.titulo)}</strong><small>${html(a.detalle)}</small></span><i class="bi bi-chevron-right"></i></button>`).join(""):'<p class="dashboard-vacio"><i class="bi bi-check-circle"></i><br>Todo está correctamente configurado.</p>';
}

function actualizarEstadoActualizacion(fecha) {
  const hora=fechaUltimaCargaDashboard?.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit",second:"2-digit"})||"—";
  asignar("fechaDashboard",`${fechaLarga(fecha)} · Vista diaria con acumulado mensual`);
  const e=document.getElementById("actualizacionDashboard");if(e)e.innerHTML=`<i class="bi bi-cloud-check"></i> Datos actualizados hoy a las ${html(hora)}`;
}

function calcularMes(fecha, datos) {
  const seleccionada = new Date(`${fecha}T00:00:00`);
  const inicio = new Date(seleccionada.getFullYear(), seleccionada.getMonth(), 1);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const finNatural = new Date(seleccionada.getFullYear(), seleccionada.getMonth()+1, 0);
  const fin = seleccionada.getFullYear() === hoy.getFullYear() && seleccionada.getMonth() === hoy.getMonth() ? hoy : finNatural;
  const totales = totalesPeriodo(inicio, fin, datos);
  const inicioAnterior = new Date(inicio.getFullYear(), inicio.getMonth()-1, 1);
  const diasTranscurridos = Math.floor((fin-inicio)/86400000)+1;
  const finAnteriorNatural = new Date(inicio.getFullYear(), inicio.getMonth(), 0);
  const finAnterior = new Date(inicioAnterior); finAnterior.setDate(Math.min(diasTranscurridos, finAnteriorNatural.getDate()));
  const anteriores = totalesPeriodo(inicioAnterior, finAnterior, datos);
  const cumplimiento = porcentaje(totales.asistencias,totales.programados);
  const cumplimientoAnterior = porcentaje(anteriores.asistencias,anteriores.programados);
  asignar("periodoDashboard", `${inicio.toLocaleDateString("es-PE",{month:"long",year:"numeric"})} · comparación equivalente`);
  asignar("mesAsistencias", totales.asistencias);
  asignar("mesTardanzas", totales.tardanzas);
  asignar("mesAusencias", totales.ausencias);
  asignar("mesHorasTrabajadas", duracion(totales.trabajados));
  asignar("mesHorasExtra", duracion(totales.extra));
  asignar("mesCumplimiento", `${cumplimiento}%`);
  comparacionMensual("compMesAsistencias", totales.asistencias, anteriores.asistencias, "asistencias", true);
  comparacionMensual("compMesTardanzas", totales.tardanzas, anteriores.tardanzas, "tardanzas");
  comparacionMensual("compMesAusencias", totales.ausencias, anteriores.ausencias, "ausencias");
  comparacionMensual("compMesHoras", totales.trabajados, anteriores.trabajados, "min trabajados", true);
  comparacionMensual("compMesExtra", totales.extra, anteriores.extra, "min extra");
  comparacionMensual("compMesCumplimiento", cumplimiento, cumplimientoAnterior, "puntos", true);
  barra("barraAsistencias", cumplimiento);
  barra("barraTardanzas", porcentaje(totales.tardanzas,totales.programados));
  barra("barraAusencias", porcentaje(totales.ausencias,totales.programados));
}

function totalesPeriodo(inicio, fin, datos) {
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
  return totales;
}

function comparacionMensual(id, actual, anterior, etiqueta, positivoSiSube=false) {
  const e = document.getElementById(id); if (!e) return;
  const diferencia = Math.round(actual-anterior);
  e.className = diferencia === 0 ? "neutro" : ((diferencia>0) === positivoSiSube ? "mejora" : "alerta");
  e.textContent = diferencia === 0 ? "Igual al periodo anterior" : `${diferencia>0?"+":""}${diferencia} ${etiqueta} vs. mes anterior`;
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
function nombreColaborador(c){return [c.datosPersonales?.apellidos||c.apellidos||c.apellido,c.datosPersonales?.nombres||c.nombres||c.nombre].filter(Boolean).join(" ")||c.nombreCompleto||c.nombre||"Colaborador";}
function nombreColaboradorNombresPrimero(c){return [c.datosPersonales?.nombres||c.nombres||c.nombre,c.datosPersonales?.apellidos||c.apellidos||c.apellido].filter(Boolean).join(" ")||c.nombreCompleto||c.nombre||"Colaborador";}
function nombreApellidoPrimero(nombre){const partes=String(nombre||"").trim().split(/\s+/);return partes.length===2?`${partes[1]} ${partes[0]}`:String(nombre||"Colaborador");}
function iniciales(n){return String(n).trim().split(/\s+/).slice(0,2).map((x)=>x[0]||"").join("").toUpperCase();}
function documentoColaborador(c){return c.documento?.numero||c.numeroDocumento||c.dni||"Sin documento";}
function horaMarca(m){
  if(m?.hora)return String(m.hora).slice(0,5);
  const fecha=m?.fechaHora?.toDate?.();
  return fecha?fecha.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit",timeZone:"America/Lima"}):"—";
}
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
