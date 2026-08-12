import {
  consultarColeccionEmpresa,
  construirRegistrosResumen,
} from "./resumen-asistencia.js";

let fechaDesde, fechaHasta, buscarResumen, cuerpoResumen, btnActualizar;
let registrosPeriodo = [],
  periodoCargado = "",
  cargando = false,
  reportePrevisualizado = null,
  datosEmpresaReporte = null;

const colecciones = [
  "colaboradores",
  "marcaciones",
  "asignacionesHorarios",
  "horarios",
  "excepcionesHorarios",
  "ajustesAsistenciaDiaria",
  "aprobacionesHorasExtra",
  "permisos",
  "feriados",
  "descansosSustitutoriosFeriados",
  "companias",
];

export function iniciarResumenMensualAsistencia() {
  console.info("✅ REPORTES DE ASISTENCIA · VERSIÓN 2026-08-12.2");
  fechaDesde = document.getElementById("fechaDesdeResumenMensual");
  fechaHasta = document.getElementById("fechaHastaResumenMensual");
  buscarResumen = document.getElementById("buscarResumenMensualAsistencia");
  cuerpoResumen = document.getElementById("cuerpoResumenMensualAsistencia");
  btnActualizar = document.getElementById("btnActualizarResumenMensual");
  if (!fechaDesde || !fechaHasta || !cuerpoResumen) return;

  asignarMes(new Date());
  document
    .getElementById("btnAplicarRangoResumenMensual")
    ?.addEventListener("click", () => cargarResumenPeriodo(true));
  btnActualizar?.addEventListener("click", () => cargarResumenPeriodo(true));
  document
    .getElementById("btnMesActualResumenMensual")
    ?.addEventListener("click", () => {
      asignarMes(new Date());
      cargarResumenPeriodo(true);
    });
  document
    .getElementById("btnMesAnteriorResumenMensual")
    ?.addEventListener("click", () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      asignarMes(d);
      cargarResumenPeriodo(true);
    });
  document
    .getElementById("btnAbrirDescargaResumenMensual")
    ?.addEventListener("click", abrirDescargaReporte);
  buscarResumen?.addEventListener("input", renderizarResumen);
  cuerpoResumen.addEventListener("click", (e) => {
    const b = e.target.closest('[data-accion="ver-detalle-periodo"]');
    if (b) abrirDetalle(b.dataset.colaboradorId);
  });
  configurarModal();
  configurarModalDescarga();

  document.addEventListener("asistencia:cambio-tab", (e) => {
    if (e.detail?.tab === "mensual" && periodoCargado !== clavePeriodo())
      cargarResumenPeriodo();
  });
  [
    "asistencia:horario-dia-actualizado",
    "asistencia:horas-extra-actualizadas",
    "asistencia:ajuste-diario-actualizado",
    "asistencia:marcacion-manual-registrada",
    "asistencia:marcaciones-importadas",
  ].forEach((nombre) =>
    document.addEventListener(nombre, () => (periodoCargado = "")),
  );
}

async function cargarResumenPeriodo(forzar = false) {
  const empresaId = sessionStorage.getItem("empresaId"),
    validacion = validarPeriodo();
  if (!empresaId || cargando || !validacion.ok) {
    if (validacion.mensaje) mostrarMensaje(validacion.mensaje);
    return;
  }
  const clave = clavePeriodo();
  if (!forzar && periodoCargado === clave) {
    renderizarResumen();
    return;
  }
  cargando = true;
  establecerCarga(true);
  mostrarMensaje("Calculando el reporte del período...");
  try {
    const resultados = await Promise.all(
      colecciones.map((n) => consultarColeccionEmpresa(n, empresaId)),
    );
    const [
      colaboradores,
      marcaciones,
      asignaciones,
      horarios,
      excepciones,
      ajustesAsistencia,
      aprobacionesHorasExtra,
      permisos,
      feriados,
      descansosSustitutorios,
      companias,
    ] = resultados;
    datosEmpresaReporte =
      companias.find((compania) => compania.empresaId === empresaId) ||
      companias[0] ||
      null;
    const fechas = obtenerFechas(fechaDesde.value, fechaHasta.value),
      consolidado = new Map(),
      colaboradoresPorId = new Map(
        colaboradores.map((colaborador) => [colaborador.id, colaborador]),
      );
    fechas.forEach((fecha) => {
      construirRegistrosResumen({
        fecha,
        colaboradores,
        marcaciones,
        asignaciones,
        horarios,
        excepciones,
        ajustesAsistencia,
        aprobacionesHorasExtra,
        permisos,
        feriados,
        descansosSustitutorios,
      }).forEach((r) => {
        const colaborador = colaboradoresPorId.get(r.colaboradorId) || {};
        acumular(
          consolidado,
          {
            ...r,
            organizacion: colaborador.organizacion || {},
            sucursal: colaborador.organizacion?.sucursal || colaborador.sucursal || "",
            area: colaborador.organizacion?.area || colaborador.area || "",
            subarea: colaborador.organizacion?.subarea || colaborador.subarea || "",
          },
          fecha,
        );
      });
    });
    registrosPeriodo = [...consolidado.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
    periodoCargado = clave;
    actualizarDescripcion(fechas.length);
    renderizarResumen();
  } catch (error) {
    console.error("Error cargando reporte por período:", error);
    mostrarMensaje("No se pudo calcular el reporte del período.");
  } finally {
    cargando = false;
    establecerCarga(false);
  }
}

function acumular(mapa, r, fecha) {
  if (!mapa.has(r.colaboradorId))
    mapa.set(r.colaboradorId, {
      colaboradorId: r.colaboradorId,
      nombre: r.nombre,
      documento: r.documento,
      sucursal: r.sucursal || r.organizacion?.sucursal || "",
      area: r.area || r.organizacion?.area || "",
      subarea: r.subarea || r.organizacion?.subarea || "",
      diasProgramados: 0,
      asistencias: 0,
      tardanzas: 0,
      ausencias: 0,
      permisos: 0,
      minutosTrabajados: 0,
      minutosAsignados: 0,
      minutosJornadaCumplida: 0,
      minutosAusencia: 0,
      minutosJustificados: 0,
      minutosExtraGenerados: 0,
      minutosExtraPendientes: 0,
      minutosExtraAprobados: 0,
      detalles: [],
    });
  const t = mapa.get(r.colaboradorId),
    programado = r.horarios?.length > 0,
    aprobacion = r.aprobacionHorasExtra;
  if (programado) t.diasProgramados++;
  if (esAsistencia(r.estado)) t.asistencias++;
  if (["TARDANZA", "TARDANZA_CON_PERMISO"].includes(r.estado)) t.tardanzas++;
  if (r.estado === "AUSENTE") t.ausencias++;
  if (r.permisoDia) t.permisos++;
  t.minutosAsignados += numero(r.minutosJornadaProgramada);
  t.minutosJornadaCumplida += numero(r.minutosJornadaCumplida);
  t.minutosTrabajados += numero(r.minutosTrabajados);
  t.minutosJustificados += numero(r.minutosJustificadosPermiso);
  t.minutosAusencia += calcularMinutosAusencia(r);
  const extraGenerada = numero(r.calculoHorasExtra?.minutosExtraTotal);
  const decisionExtra = String(aprobacion?.decision || "").toUpperCase();
  const extra =
    decisionExtra === "APROBADO"
      ? numero(aprobacion.minutosAprobados)
      : 0;
  const extraPendiente =
    extraGenerada > 0 && !["APROBADO", "RECHAZADO"].includes(decisionExtra)
      ? extraGenerada
      : 0;
  t.minutosExtraGenerados += extraGenerada;
  t.minutosExtraPendientes += extraPendiente;
  t.minutosExtraAprobados += extra;
  t.detalles.push({
    fecha,
    horario: formatearHorarioAsignado(r.horarios),
    estado: r.estado || "SIN_ESTADO",
    entrada: r.entrada,
    refrigerioInicio:
      r.clasificacion?.inicioRefrigerio || r.clasificacion?.refrigerioInicio,
    refrigerioFin:
      r.clasificacion?.finRefrigerio || r.clasificacion?.refrigerioFin,
    salida: r.salida,
    tardanza: numero(r.tardanzaMinutos),
    asignados: numero(r.minutosJornadaProgramada),
    jornadaCumplida: numero(r.minutosJornadaCumplida),
    trabajados: numero(r.minutosTrabajados),
    justificados: numero(r.minutosJustificadosPermiso),
    ausencia: calcularMinutosAusencia(r),
    salidaAnticipada: numero(r.calculoAsistencia?.minutosSalidaAnticipada),
    excesoRefrigerio: numero(r.calculoAsistencia?.minutosExcesoRefrigerio),
    extraGenerada,
    extraPendiente,
    extra,
    marcaciones: r.clasificacion?.todas || [],
  });
}

function calcularMinutosAusencia(registro) {
  const estado = String(registro.estado || "").toUpperCase();
  const noGeneraAusencia =
    estado.startsWith("FERIADO") ||
    estado.startsWith("TRABAJO_EN_FERIADO") ||
    estado.startsWith("DESCANSO_SUSTITUTORIO") ||
    estado === "SIN_HORARIO";

  if (noGeneraAusencia) return 0;

  const asignados = numero(registro.minutosJornadaProgramada);
  const cumplidos = Math.min(
    asignados,
    numero(registro.minutosJornadaCumplida),
  );
  const pendientes = Math.max(0, asignados - cumplidos);
  const justificados = Math.min(
    pendientes,
    numero(registro.minutosJustificadosPermiso),
  );

  return Math.max(0, pendientes - justificados);
}

function renderizarResumen() {
  const filtrados = obtenerFiltrados();
  actualizarTarjetas(filtrados);
  actualizarBotonesExportar(filtrados.length > 0);
  if (!filtrados.length) {
    mostrarMensaje(
      registrosPeriodo.length
        ? "No existen colaboradores para la búsqueda ingresada."
        : "No hay información para el período seleccionado.",
    );
    return;
  }
  cuerpoResumen.innerHTML = filtrados
    .map(
      (r) =>
        `<tr><td class="mensual-colaborador"><div class="mensual-avatar">${iniciales(r.nombre)}</div><div><strong>${html(r.nombre)}</strong><small>${html(r.documento || "Sin documento")}</small></div></td><td>${r.diasProgramados}</td><td>${r.asistencias}</td><td>${valorContador(r.tardanzas, "advertencia")}</td><td>${valorContador(r.ausencias, "peligro")}</td><td>${valorContador(r.permisos, "informacion")}</td><td>${minutos(r.minutosAsignados)}</td><td>${minutos(r.minutosJornadaCumplida)}</td><td>${minutos(r.minutosTrabajados)}</td><td>${minutos(r.minutosAusencia)}</td><td>${minutos(r.minutosJustificados)}</td><td>${minutos(r.minutosExtraGenerados)}</td><td>${minutos(r.minutosExtraPendientes)}</td><td>${minutos(r.minutosExtraAprobados)}</td><td><button type="button" class="btn-ver-detalle-periodo" data-accion="ver-detalle-periodo" data-colaborador-id="${html(r.colaboradorId)}"><i class="bi bi-eye"></i> Ver detalle</button></td></tr>`,
    )
    .join("");
}

function abrirDetalle(id) {
  const r = registrosPeriodo.find((x) => x.colaboradorId === id),
    modal = document.getElementById("modalDetallePeriodoAsistencia");
  if (!r || !modal) return;
  document.getElementById("tituloDetallePeriodoAsistencia").textContent =
    r.nombre;
  document.getElementById("subtituloDetallePeriodoAsistencia").textContent =
    `${r.documento || "Sin documento"} · ${formatearFecha(fechaDesde.value)} al ${formatearFecha(fechaHasta.value)}`;
  document.getElementById("cuerpoDetallePeriodoAsistencia").innerHTML =
    r.detalles
      .map(
        (d) =>
          `<tr><td><strong>${formatearFecha(d.fecha)}</strong></td><td>${etiquetaEstado(d.estado)}</td>${celdaMarcacion(d.entrada, d.marcaciones, "ENTRADA")}${celdaMarcacion(d.refrigerioInicio, d.marcaciones, "INICIO_REFRIGERIO")}${celdaMarcacion(d.refrigerioFin, d.marcaciones, "FIN_REFRIGERIO")}${celdaMarcacion(d.salida, d.marcaciones, "SALIDA")}<td>${d.tardanza ? `${d.tardanza} min` : "—"}</td><td>${minutos(d.asignados)}</td><td>${minutos(d.jornadaCumplida)}</td><td>${minutos(d.trabajados)}</td><td>${minutos(d.ausencia)}</td><td>${minutos(d.justificados)}</td><td>${minutos(d.extraGenerada)}</td><td>${minutos(d.extraPendiente)}</td><td>${minutos(d.extra)}</td></tr>`,
      )
      .join("");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function celdaMarcacion(valor, todas, tipo) {
  const hora = horaMarcacion(valor);
  if (hora !== "—")
    return `<td><span class="detalle-marcacion-hora">${html(hora)}</span></td>`;
  const similares = (todas || [])
    .filter(
      (m) => String(m.tipo || m.tipoMarcacion || "").toUpperCase() === tipo,
    )
    .map(horaMarcacion)
    .filter((h) => h !== "—");
  return `<td>${similares.length ? similares.map((h) => `<span class="detalle-marcacion-hora">${html(h)}</span>`).join("") : "—"}</td>`;
}

function horaMarcacion(m) {
  if (!m) return "—";
  const v = m.hora || m.horaMarcacion || m.fechaHora || m.timestamp || m.fecha;
  if (typeof v === "string") {
    const x = v.match(/(?:T|\s)(\d{2}:\d{2})/) || v.match(/^(\d{2}:\d{2})/);
    if (x) return x[1];
  }
  const d = v?.toDate ? v.toDate() : v instanceof Date ? v : null;
  return d
    ? d.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";
}

function formatearHorarioAsignado(horarios) {
  const tramos = (Array.isArray(horarios) ? horarios : [])
    .map((horario) => {
      const entrada = horario?.entrada?.programada;
      const salida = horario?.salida?.programada;

      if (!entrada || !salida) return null;

      return {
        entrada: String(entrada).slice(0, 5),
        salida: String(salida).slice(0, 5),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.entrada.localeCompare(b.entrada));

  if (!tramos.length) return "Sin horario";

  return tramos
    .map(({ entrada, salida }) => `${entrada}–${salida}`)
    .join(" / ");
}

function configurarModal() {
  const modal = document.getElementById("modalDetallePeriodoAsistencia"),
    cerrar = () => {
      if (modal) modal.style.display = "none";
      modal?.setAttribute("aria-hidden", "true");
    };
  document
    .getElementById("btnCerrarDetallePeriodoAsistencia")
    ?.addEventListener("click", cerrar);
  document
    .getElementById("btnCerrarDetallePeriodoAsistenciaFooter")
    ?.addEventListener("click", cerrar);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) cerrar();
  });
}

function abrirDescargaReporte() {
  const filas = obtenerFiltrados();
  const modal = document.getElementById("modalDescargaReporteAsistencia");
  const selector = document.getElementById("colaboradorDescargaReporteAsistencia");
  if (!filas.length || !modal || !selector) return;
  selector.innerHTML = filas
    .map((r) => `<option value="${html(r.colaboradorId)}">${html(r.nombre)} · ${html(r.documento || "Sin documento")}</option>`)
    .join("");
  actualizarTipoDescarga();
  mostrarModalReporte(modal);
}

function configurarModalDescarga() {
  const modal = document.getElementById("modalDescargaReporteAsistencia");
  const modalVistaPrevia = document.getElementById(
    "modalVistaPreviaReporteAsistencia",
  );
  const cerrar = () => ocultarModalReporte(modal);
  const cerrarVistaPrevia = () => ocultarModalReporte(modalVistaPrevia);
  document.getElementById("btnCerrarDescargaReporteAsistencia")?.addEventListener("click", cerrar);
  document.getElementById("btnCancelarDescargaReporteAsistencia")?.addEventListener("click", cerrar);
  document.getElementById("tipoDescargaReporteAsistencia")?.addEventListener("change", actualizarTipoDescarga);
  document.getElementById("btnGenerarDescargaReporteAsistencia")?.addEventListener("click", generarDescargaReporte);
  document
    .getElementById("btnCerrarVistaPreviaReporteAsistencia")
    ?.addEventListener("click", cerrarVistaPrevia);
  document
    .getElementById("btnVolverConfiguracionReporteAsistencia")
    ?.addEventListener("click", () => {
      cerrarVistaPrevia();
      abrirDescargaReporte();
    });
  document
    .getElementById("btnDescargarExcelVistaPrevia")
    ?.addEventListener("click", async () => {
      if (!reportePrevisualizado) return;
      await exportarExcel(
        reportePrevisualizado.tipo,
        reportePrevisualizado.filas,
        reportePrevisualizado.colaboradorId,
      );
    });
  document
    .getElementById("btnDescargarPdfVistaPrevia")
    ?.addEventListener("click", () => {
      if (!reportePrevisualizado) return;
      exportarPdf(
        reportePrevisualizado.tipo,
        reportePrevisualizado.filas,
        reportePrevisualizado.colaboradorId,
      );
    });
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) cerrar();
  });
  modalVistaPrevia?.addEventListener("click", (e) => {
    if (e.target === modalVistaPrevia) cerrarVistaPrevia();
  });
}

function ocultarModalReporte(modal) {
  if (!modal) return;
  const enfocado = document.activeElement;
  if (enfocado && modal.contains(enfocado) && typeof enfocado.blur === "function")
    enfocado.blur();
  modal.inert = true;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

function mostrarModalReporte(modal) {
  if (!modal) return;
  modal.inert = false;
  modal.removeAttribute("inert");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function actualizarTipoDescarga() {
  const tipo = document.getElementById("tipoDescargaReporteAsistencia")?.value;
  const grupo = document.getElementById("grupoColaboradorDescargaReporte");
  if (grupo) grupo.hidden = tipo !== "SIMPLIFICADO_INDIVIDUAL";
}

function generarDescargaReporte() {
  const tipo = document.getElementById("tipoDescargaReporteAsistencia")?.value || "RESUMEN";
  const colaboradorId = document.getElementById("colaboradorDescargaReporteAsistencia")?.value;
  const filas = obtenerFiltrados();
  if (!filas.length) return;
  reportePrevisualizado = { tipo, filas, colaboradorId };
  mostrarVistaPreviaReporte(tipo, filas, colaboradorId);
}

function mostrarVistaPreviaReporte(tipo, filas, colaboradorId) {
  const configuracion = document.getElementById("modalDescargaReporteAsistencia");
  const modal = document.getElementById("modalVistaPreviaReporteAsistencia");
  const contenido = document.getElementById("contenidoVistaPreviaReporteAsistencia");
  const titulo = document.getElementById("tituloVistaPreviaReporteAsistencia");
  if (!modal || !contenido) return;

  ocultarModalReporte(configuracion);
  contenido.innerHTML = `<style>${estilosDocumentoReporte()}</style>${construirDocumentoReporte(tipo, filas, colaboradorId)}`;
  if (titulo) titulo.textContent = nombreTipoReporte(tipo);
  mostrarModalReporte(modal);
  document.getElementById("btnCerrarVistaPreviaReporteAsistencia")?.focus();
}

function construirDocumentoReporte(tipo, filas, colaboradorId) {
  if (tipo === "RESUMEN") return tablaPdfResumen(filas);
  if (tipo === "HORAS_TRABAJADAS") return tablaPdfHorasTrabajadas(filas);
  if (tipo === "SIMPLIFICADO_INDIVIDUAL") {
    const colaborador = filas.find((r) => r.colaboradorId === colaboradorId);
    return colaborador ? seccionPdfSimplificada(colaborador) : mensajeSinDatos();
  }
  if (tipo === "SIMPLIFICADO_TODOS") {
    return filas.map(seccionPdfSimplificada).join("");
  }
  return mensajeSinDatos();
}

function nombreTipoReporte(tipo) {
  const nombres = {
    RESUMEN: "Resumen general de asistencia",
    HORAS_TRABAJADAS: "Reporte de horas trabajadas",
    SIMPLIFICADO_INDIVIDUAL: "Asistencia simplificada",
    SIMPLIFICADO_TODOS: "Asistencia simplificada por colaboradores",
  };
  return nombres[tipo] || "Reporte de asistencia";
}

function mensajeSinDatos() {
  return '<div class="reporte-sin-datos">No existen datos para mostrar.</div>';
}

async function exportarExcel(tipo, filas, colaboradorId) {
  try {
    const moduloXlsx = await import(
      "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/+esm"
    );
    const XLSX = moduloXlsx.default || moduloXlsx;
    const libro = XLSX.utils.book_new();
    if (tipo === "RESUMEN") agregarHojaResumen(XLSX, libro, filas);
    if (tipo === "HORAS_TRABAJADAS")
      agregarHojaHorasTrabajadas(XLSX, libro, filas);
    if (tipo === "SIMPLIFICADO_INDIVIDUAL") {
      const r = filas.find((x) => x.colaboradorId === colaboradorId);
      if (r) agregarHojaSimplificada(XLSX, libro, r);
    }
    if (tipo === "SIMPLIFICADO_TODOS")
      filas.forEach((r) => agregarHojaSimplificada(XLSX, libro, r));
    XLSX.writeFile(libro, `reporte-asistencia-${fechaDesde.value}-a-${fechaHasta.value}.xlsx`);
  } catch (error) {
    console.error("No se pudo generar Excel:", error);
    alert("No se pudo cargar el generador de Excel. Revisa tu conexión e inténtalo nuevamente.");
  }
}

function agregarHojaResumen(XLSX, libro, filas) {
  const datos = filas.map((r) => ({
    Colaborador: r.nombre,
    Documento: r.documento || "",
    Sucursal: r.sucursal || "",
    "Área": r.area || "",
    "Subárea": r.subarea || "",
    "Días programados": r.diasProgramados,
    Asistencias: r.asistencias,
    Tardanzas: r.tardanzas,
    Ausencias: r.ausencias,
    Permisos: r.permisos,
    "Horas asignadas": minutosExcel(r.minutosAsignados),
    "Jornada cumplida": minutosExcel(r.minutosJornadaCumplida),
    "Horas trabajadas": minutosExcel(r.minutosTrabajados),
    "Horas de ausencia": minutosExcel(r.minutosAusencia),
    "Horas justificadas": minutosExcel(r.minutosJustificados),
    "Horas extra generadas": minutosExcel(r.minutosExtraGenerados),
    "Horas extra pendientes": minutosExcel(r.minutosExtraPendientes),
    "Horas extra aprobadas": minutosExcel(r.minutosExtraAprobados),
  }));
  agregarHoja(XLSX, libro, "Resumen", datos);
}

function agregarHojaMarcaciones(XLSX, libro, filas) {
  const datos = filas.flatMap((r) => r.detalles.flatMap((d) => {
    const base = { Colaborador: r.nombre, Documento: r.documento || "", Fecha: formatearFecha(d.fecha), Estado: etiquetaPlano(d.estado) };
    const marcaciones = d.marcaciones?.length ? d.marcaciones : [d.entrada, d.refrigerioInicio, d.refrigerioFin, d.salida].filter(Boolean);
    return marcaciones.length
      ? marcaciones.map((m) => ({ ...base, Hora: horaMarcacion(m), Tipo: etiquetaPlano(m?.tipo || m?.tipoMarcacion || "MARCACION") }))
      : [{ ...base, Hora: "", Tipo: "Sin marcaciones" }];
  }));
  agregarHoja(XLSX, libro, "Marcaciones", datos);
}

function agregarHojaHorasTrabajadas(XLSX, libro, filas) {
  const datos = filas.flatMap((r) =>
    r.detalles.map((d) => ({
      Documento: r.documento || "",
      Colaborador: r.nombre,
      Sucursal: r.sucursal || "",
      "Área": r.area || "",
      "Subárea": r.subarea || "",
      Fecha: formatearFecha(d.fecha),
      Estado: etiquetaPlano(d.estado),
      Entrada: horaMarcacion(d.entrada),
      "Inicio refrigerio": horaMarcacion(d.refrigerioInicio),
      "Fin refrigerio": horaMarcacion(d.refrigerioFin),
      Salida: horaMarcacion(d.salida),
      "Horas asignadas": minutosExcel(d.asignados),
      "Jornada cumplida": minutosExcel(d.jornadaCumplida),
      "Horas trabajadas": minutosExcel(d.trabajados),
      Tardanza: minutosExcel(d.tardanza),
      "Salida anticipada": minutosExcel(d.salidaAnticipada),
      "Exceso de refrigerio": minutosExcel(d.excesoRefrigerio),
      "Ausencia no justificada": minutosExcel(d.ausencia),
      "Horas justificadas": minutosExcel(d.justificados),
      "Horas extra generadas": minutosExcel(d.extraGenerada),
      "Horas extra pendientes": minutosExcel(d.extraPendiente),
      "Horas extra aprobadas": minutosExcel(d.extra),
    })),
  );
  agregarHoja(XLSX, libro, "Horas trabajadas", datos);
}

function agregarHojaSimplificada(XLSX, libro, r) {
  const empresa = obtenerDatosEmpresa();
  const encabezados = [
    "FECHA", "HORARIO", "ENTRADA", "INICIO\nREFRIGERIO", "FIN\nREFRIGERIO",
    "SALIDA", "ASIGNADO", "JORNADA", "TRABAJADO", "AUSENCIA", "TARDANZA",
    "JUSTIFICADO", "EXTRA\nGENERADA", "EXTRA\nPENDIENTE", "EXTRA\nAPROBADA", "ESTADO",
  ];
  const filas = [
    ["PLANILLA INDIVIDUAL DE ASISTENCIA"],
    [empresa.razonSocial],
    ["Detalle diario organizado por semanas"],
    [],
    ["EMPRESA", "", empresa.razonSocial, "", "RUC", "", empresa.ruc, "", "COLABORADOR", "", r.nombre, "", "DOCUMENTO", "", r.documento || "—", ""],
    ["SUCURSAL", "", r.sucursal || "—", "", "ÁREA", "", r.area || "—", "", "SUBÁREA", "", r.subarea || "—", "", "PERÍODO", "", `${formatearFecha(fechaDesde.value)} al ${formatearFecha(fechaHasta.value)}`, ""],
    [],
    encabezados,
  ];
  const filasSemana = [];
  agruparPorSemana(r.detalles).forEach((semana, indice) => {
    semana.forEach((d) => {
      filas.push([
        `${nombreDia(d.fecha)}\n${formatearFecha(d.fecha)}`,
        d.horario,
        horaMarcacion(d.entrada),
        horaMarcacion(d.refrigerioInicio),
        horaMarcacion(d.refrigerioFin),
        horaMarcacion(d.salida),
        minutosExcel(d.asignados),
        minutosExcel(d.jornadaCumplida),
        minutosExcel(d.trabajados),
        minutosExcel(d.ausencia),
        minutosExcel(d.tardanza),
        minutosExcel(d.justificados),
        minutosExcel(d.extraGenerada),
        minutosExcel(d.extraPendiente),
        minutosExcel(d.extra),
        etiquetaPlano(d.estado),
      ]);
    });
    const total = totalizarSemana(semana);
    const filaSubtotal = filas.length;
    filas.push([
      `RESUMEN · SEMANA ${indice + 1}`, "", "", "", "", "",
      minutosExcel(total.asignado), minutosExcel(total.jornada),
      minutosExcel(total.trabajado), minutosExcel(total.ausencia),
      minutosExcel(total.tardanza), minutosExcel(total.justificado),
      minutosExcel(total.extraGenerada), minutosExcel(total.extraPendiente),
      minutosExcel(total.extra), "",
    ]);
    filasSemana.push(filaSubtotal);
  });
  const filaTotal = filas.length;
  filas.push([
    "TOTAL GENERAL", "", "", "", "", "",
    minutosExcel(r.minutosAsignados), minutosExcel(r.minutosJornadaCumplida),
    minutosExcel(r.minutosTrabajados), minutosExcel(r.minutosAusencia), "",
    minutosExcel(r.minutosJustificados), minutosExcel(r.minutosExtraGenerados),
    minutosExcel(r.minutosExtraPendientes), minutosExcel(r.minutosExtraAprobados), "",
  ]);

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja["!merges"] = [
    rangoCombinado(0, 0, 0, 15), rangoCombinado(1, 0, 1, 15),
    rangoCombinado(2, 0, 2, 15),
    ...[0, 4, 8, 12].flatMap((columna) => [
      rangoCombinado(4, columna, 4, columna + 1),
      rangoCombinado(4, columna + 2, 4, columna + 3),
      rangoCombinado(5, columna, 5, columna + 1),
      rangoCombinado(5, columna + 2, 5, columna + 3),
    ]),
    ...filasSemana.map((fila) => rangoCombinado(fila, 0, fila, 5)),
    rangoCombinado(filaTotal, 0, filaTotal, 5),
  ];
  aplicarEstiloPlanillaExcel(XLSX, hoja, filas.length, filasSemana, filaTotal);
  anexarHojaUnica(XLSX, libro, hoja, nombreHoja(r.nombre));
}

function totalizarSemana(semana) {
  return semana.reduce(
    (a, d) => ({
      asignado: a.asignado + numero(d.asignados),
      jornada: a.jornada + numero(d.jornadaCumplida),
      trabajado: a.trabajado + numero(d.trabajados),
      ausencia: a.ausencia + numero(d.ausencia),
      tardanza: a.tardanza + numero(d.tardanza),
      justificado: a.justificado + numero(d.justificados),
      extraGenerada: a.extraGenerada + numero(d.extraGenerada),
      extraPendiente: a.extraPendiente + numero(d.extraPendiente),
      extra: a.extra + numero(d.extra),
    }),
    { asignado: 0, jornada: 0, trabajado: 0, ausencia: 0, tardanza: 0, justificado: 0, extraGenerada: 0, extraPendiente: 0, extra: 0 },
  );
}

function obtenerDatosEmpresa() {
  return {
    razonSocial:
      datosEmpresaReporte?.empresa?.razonSocial ||
      datosEmpresaReporte?.razonSocial ||
      sessionStorage.getItem("razonSocial") ||
      sessionStorage.getItem("nombreEmpresa") ||
      "CONTROL DE ASISTENCIA",
    ruc:
      datosEmpresaReporte?.empresa?.ruc ||
      datosEmpresaReporte?.ruc ||
      sessionStorage.getItem("rucEmpresa") ||
      "—",
  };
}

function rangoCombinado(filaInicio, columnaInicio, filaFin, columnaFin) {
  return {
    s: { r: filaInicio, c: columnaInicio },
    e: { r: filaFin, c: columnaFin },
  };
}

function aplicarEstiloPlanillaExcel(XLSX, hoja, totalFilas, filasSemana, filaTotal) {
  const azul = "1E3A8A";
  const azulClaro = "DBEAFE";
  const borde = "CBD5E1";
  const texto = "1E293B";
  const aplicar = (direccion, estilo) => {
    if (!hoja[direccion]) hoja[direccion] = { t: "s", v: "" };
    hoja[direccion].s = estilo;
  };
  const rango = (filaDesde, filaHasta, colDesde, colHasta, estilo) => {
    for (let f = filaDesde; f <= filaHasta; f++)
      for (let c = colDesde; c <= colHasta; c++)
        aplicar(XLSX.utils.encode_cell({ r: f, c }), estilo);
  };
  rango(0, 0, 0, 15, { font: { bold: true, sz: 18, color: "0F172A" }, alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "medium", color: { rgb: "3158E8" } } } });
  rango(1, 1, 0, 15, { font: { bold: true, sz: 10, color: "3158E8" }, alignment: { horizontal: "left" } });
  rango(2, 2, 0, 15, { font: { sz: 9, color: "64748B" }, alignment: { horizontal: "left" } });
  [4, 5].forEach((fila) => {
    [0, 4, 8, 12].forEach((col) => {
      rango(fila, fila, col, col + 1, { fill: { fgColor: { rgb: "EFF6FF" } }, font: { bold: true, sz: 8, color: "64748B" }, alignment: { vertical: "center" }, border: bordesExcel(borde) });
      rango(fila, fila, col + 2, col + 3, { fill: { fgColor: { rgb: "F8FAFC" } }, font: { bold: true, sz: 9, color: azul }, alignment: { vertical: "center", wrapText: true }, border: bordesExcel(borde) });
    });
  });
  rango(7, 7, 0, 15, { fill: { fgColor: { rgb: azul } }, font: { bold: true, sz: 8, color: "FFFFFF" }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: bordesExcel("FFFFFF") });
  rango(8, totalFilas - 1, 0, 15, { font: { sz: 8, color: texto }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: bordesExcel("D9E2EF") });
  for (let fila = 8; fila < totalFilas; fila++) {
    if ((fila - 8) % 2 === 1 && !filasSemana.includes(fila) && fila !== filaTotal)
      rango(fila, fila, 0, 15, { fill: { fgColor: { rgb: "F8FAFC" } }, font: { sz: 8, color: texto }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: bordesExcel("D9E2EF") });
  }
  filasSemana.forEach((fila) => rango(fila, fila, 0, 15, { fill: { fgColor: { rgb: azulClaro } }, font: { bold: true, sz: 8, color: azul }, alignment: { horizontal: "center", vertical: "center" }, border: bordesExcel("B9D3F5") }));
  rango(filaTotal, filaTotal, 0, 15, { fill: { fgColor: { rgb: azul } }, font: { bold: true, sz: 9, color: "FFFFFF" }, alignment: { horizontal: "center", vertical: "center" }, border: bordesExcel("FFFFFF") });
  hoja["!cols"] = [13, 18, 11, 13, 13, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 24].map((wch) => ({ wch }));
  hoja["!rows"] = Array.from({ length: totalFilas }, (_, fila) => ({ hpt: fila === 0 ? 30 : fila === 7 ? 32 : [4, 5].includes(fila) ? 28 : fila === 3 || fila === 6 ? 8 : 22 }));
  hoja["!freeze"] = { xSplit: 0, ySplit: 8, topLeftCell: "A9" };
  hoja["!autofilter"] = { ref: `A8:P${totalFilas}` };
  hoja["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  hoja["!margins"] = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 };
  hoja["!sheetView"] = [{ showGridLines: false }];
}

function bordesExcel(color) {
  const borde = { style: "thin", color: { rgb: color } };
  return { top: borde, bottom: borde, left: borde, right: borde };
}

function anexarHojaUnica(XLSX, libro, hoja, nombre) {
  const base = nombreHoja(nombre);
  let definitivo = base;
  let correlativo = 2;
  while (libro.SheetNames.includes(definitivo))
    definitivo = `${base.slice(0, 27)} ${correlativo++}`;
  XLSX.utils.book_append_sheet(libro, hoja, definitivo);
}

function agregarHojaDetalle(XLSX, libro, r) {
  const datos = r.detalles.map((d) => ({
    Fecha: formatearFecha(d.fecha),
    Estado: etiquetaPlano(d.estado),
    Entrada: horaMarcacion(d.entrada),
    "Inicio refrigerio": horaMarcacion(d.refrigerioInicio),
    "Fin refrigerio": horaMarcacion(d.refrigerioFin),
    Salida: horaMarcacion(d.salida),
    Tardanza: d.tardanza ? `${d.tardanza} min` : "",
    Asignado: minutosExcel(d.asignados),
    Jornada: minutosExcel(d.jornadaCumplida),
    Trabajadas: minutosExcel(d.trabajados),
    Justificadas: minutosExcel(d.justificados),
    "Extra aprobada": minutosExcel(d.extra),
  }));
  agregarHoja(XLSX, libro, nombreHoja(r.nombre), datos);
}

function agregarHoja(XLSX, libro, nombre, datos) {
  const filas = datos.length ? datos : [{ Información: "Sin datos" }];
  const columnas = Object.keys(filas[0]);
  const ultimaColumna = Math.max(0, columnas.length - 1);
  const empresa = obtenerDatosEmpresa();
  const hoja = XLSX.utils.aoa_to_sheet([
    [nombre.toUpperCase()],
    [`${empresa.razonSocial} · RUC ${empresa.ruc}`],
    [`Período: ${formatearFecha(fechaDesde.value)} al ${formatearFecha(fechaHasta.value)} · Generado: ${new Date().toLocaleString("es-PE")}`],
    [],
    [],
  ]);
  XLSX.utils.sheet_add_json(hoja, filas, { origin: "A6" });
  hoja["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColumna } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColumna } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: ultimaColumna } },
  ];
  hoja["!rows"] = [
    { hpt: 26 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 8 },
    { hpt: 24 },
  ];
  hoja["!cols"] = columnas.map((clave) => {
    const largoDatos = filas.reduce(
      (maximo, fila) => Math.max(maximo, String(fila[clave] ?? "").length),
      clave.length,
    );
    return { wch: Math.max(12, Math.min(34, largoDatos + 3)) };
  });
  const ultimaFila = 6 + filas.length - 1;
  hoja["!autofilter"] = {
    ref: `A6:${XLSX.utils.encode_col(ultimaColumna)}${ultimaFila}`,
  };
  hoja["!freeze"] = { xSplit: 0, ySplit: 6, topLeftCell: "A7" };
  hoja["!pageSetup"] = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
  };
  hoja["!margins"] = {
    left: 0.25,
    right: 0.25,
    top: 0.45,
    bottom: 0.45,
    header: 0.2,
    footer: 0.2,
  };
  const azul = "1E3A8A";
  for (let columna = 0; columna <= ultimaColumna; columna++) {
    const encabezado = hoja[XLSX.utils.encode_cell({ r: 5, c: columna })];
    if (encabezado)
      encabezado.s = {
        fill: { fgColor: { rgb: azul } },
        font: { bold: true, color: "FFFFFF", sz: 9 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: bordesExcel("FFFFFF"),
      };
  }
  for (let fila = 6; fila < 6 + filas.length; fila++)
    for (let columna = 0; columna <= ultimaColumna; columna++) {
      const celda = hoja[XLSX.utils.encode_cell({ r: fila, c: columna })];
      if (celda)
        celda.s = {
          fill: { fgColor: { rgb: fila % 2 ? "F8FAFC" : "FFFFFF" } },
          font: { color: "1E293B", sz: 8 },
          alignment: { vertical: "center", wrapText: true },
          border: bordesExcel("D9E2EF"),
        };
    }
  [0, 1, 2].forEach((fila) => {
    const celda = hoja[XLSX.utils.encode_cell({ r: fila, c: 0 })];
    if (celda)
      celda.s = {
        font: { bold: fila < 2, sz: fila === 0 ? 16 : 9, color: fila === 0 ? "0F172A" : fila === 1 ? "3158E8" : "64748B" },
        alignment: { vertical: "center" },
        border: fila === 0 ? { bottom: { style: "medium", color: { rgb: "3158E8" } } } : {},
      };
  });
  hoja["!sheetView"] = [{ showGridLines: false }];
  const base = nombreHoja(nombre);
  let definitivo = base;
  let correlativo = 2;
  while (libro.SheetNames.includes(definitivo)) {
    definitivo = `${base.slice(0, 27)} ${correlativo++}`;
  }
  XLSX.utils.book_append_sheet(libro, hoja, definitivo);
}

function exportarPdf(tipo, filas, colaboradorId) {
  abrirImpresion(construirDocumentoReporte(tipo, filas, colaboradorId));
}

function tablaPdfResumen(filas) {
  const cuerpo = filas
    .map(
      (r, indice) =>
        `<tr><td>${indice + 1}</td><td class="texto-izquierda"><strong>${html(r.nombre)}</strong><small>${html(r.documento || "Sin documento")}</small></td><td>${r.diasProgramados}</td><td>${r.asistencias}</td><td>${r.tardanzas}</td><td>${r.ausencias}</td><td>${r.permisos}</td><td>${minutos(r.minutosAsignados)}</td><td>${minutos(r.minutosJornadaCumplida)}</td><td>${minutos(r.minutosTrabajados)}</td><td>${minutos(r.minutosAusencia)}</td><td>${minutos(r.minutosJustificados)}</td><td>${minutos(r.minutosExtraGenerados)}</td><td>${minutos(r.minutosExtraPendientes)}</td><td>${minutos(r.minutosExtraAprobados)}</td></tr>`,
    )
    .join("");
  const totales = filas.reduce(
    (a, r) => ({
      asignado: a.asignado + r.minutosAsignados,
      jornada: a.jornada + r.minutosJornadaCumplida,
      trabajado: a.trabajado + r.minutosTrabajados,
      ausencia: a.ausencia + r.minutosAusencia,
      justificado: a.justificado + r.minutosJustificados,
      extraGenerada: a.extraGenerada + r.minutosExtraGenerados,
      extraPendiente: a.extraPendiente + r.minutosExtraPendientes,
      extra: a.extra + r.minutosExtraAprobados,
    }),
    { asignado: 0, jornada: 0, trabajado: 0, ausencia: 0, justificado: 0, extraGenerada: 0, extraPendiente: 0, extra: 0 },
  );
  return hojaReporte({
    titulo: "Resumen general de asistencia",
    subtitulo: `${filas.length} colaboradores consolidados`,
    contenido: `<div class="reporte-tabla-marco reporte-tabla-amplia"><table><thead><tr><th>N.º</th><th>Colaborador</th><th>Días<br>programados</th><th>Asistencias</th><th>Tardanzas</th><th>Ausencias<br>(días)</th><th>Permisos</th><th>Asignado</th><th>Jornada</th><th>Trabajado</th><th>Ausencia<br>(horas)</th><th>Justificado</th><th>Extra<br>generada</th><th>Extra<br>pendiente</th><th>Extra<br>aprobada</th></tr></thead><tbody>${cuerpo}</tbody><tfoot><tr><th colspan="7">Totales del período</th><th>${minutos(totales.asignado)}</th><th>${minutos(totales.jornada)}</th><th>${minutos(totales.trabajado)}</th><th>${minutos(totales.ausencia)}</th><th>${minutos(totales.justificado)}</th><th>${minutos(totales.extraGenerada)}</th><th>${minutos(totales.extraPendiente)}</th><th>${minutos(totales.extra)}</th></tr></tfoot></table></div>`,
  });
}

function tablaPdfMarcaciones(filas) {
  const cuerpo = filas.flatMap((r) => r.detalles.flatMap((d) => {
    const ms = d.marcaciones?.length ? d.marcaciones : [];
    return ms.length ? ms.map((m) => `<tr><td>${html(r.nombre)}</td><td>${html(r.documento || "")}</td><td>${formatearFecha(d.fecha)}</td><td>${html(horaMarcacion(m))}</td><td>${html(etiquetaPlano(m.tipo || m.tipoMarcacion || "Marcación"))}</td></tr>`) : [];
  })).join("");
  return `<h1>Listado completo de marcaciones</h1>${periodoPdf()}<table><thead><tr><th>Colaborador</th><th>Documento</th><th>Fecha</th><th>Hora</th><th>Tipo</th></tr></thead><tbody>${cuerpo}</tbody></table>`;
}

function tablaPdfHorasTrabajadas(filas) {
  const cuerpo = filas
    .flatMap((r) =>
      r.detalles.map(
        (d) =>
          `<tr><td>${html(r.documento || "—")}</td><td class="texto-izquierda"><strong>${html(r.nombre)}</strong></td><td>${formatearFecha(d.fecha)}</td><td>${html(horaMarcacion(d.entrada))}</td><td>${html(horaMarcacion(d.refrigerioInicio))}</td><td>${html(horaMarcacion(d.refrigerioFin))}</td><td>${html(horaMarcacion(d.salida))}</td><td>${minutos(d.asignados)}</td><td>${minutos(d.jornadaCumplida)}</td><td>${minutos(d.trabajados)}</td><td>${minutos(d.tardanza)}</td><td>${minutos(d.salidaAnticipada)}</td><td>${minutos(d.excesoRefrigerio)}</td><td>${minutos(d.ausencia)}</td><td>${minutos(d.justificados)}</td><td>${minutos(d.extraGenerada)}</td><td>${minutos(d.extraPendiente)}</td><td>${minutos(d.extra)}</td><td><span class="estado-reporte">${html(etiquetaPlano(d.estado))}</span></td></tr>`,
      ),
    )
    .join("");
  return hojaReporte({
    titulo: "Reporte de horas trabajadas",
    subtitulo: "Detalle diario de todos los colaboradores",
    contenido: `<div class="reporte-tabla-marco reporte-tabla-amplia"><table><thead><tr><th>Documento</th><th>Colaborador</th><th>Fecha</th><th>Entrada</th><th>Inicio<br>refrigerio</th><th>Fin<br>refrigerio</th><th>Salida</th><th>Asignado</th><th>Jornada</th><th>Trabajado</th><th>Tardanza</th><th>Salida<br>anticipada</th><th>Exceso<br>refrigerio</th><th>Ausencia</th><th>Justificado</th><th>Extra<br>generada</th><th>Extra<br>pendiente</th><th>Extra<br>aprobada</th><th>Estado</th></tr></thead><tbody>${cuerpo}</tbody></table></div>`,
  });
}

function seccionPdfSimplificada(r) {
  const semanas = agruparPorSemana(r.detalles);
  const cuerpo = semanas
    .map((semana, indice) => {
      const filas = semana
        .map(
          (d) =>
          `<tr><td class="texto-izquierda"><strong>${nombreDia(d.fecha)}</strong><small>${formatearFecha(d.fecha)}</small></td><td><strong>${html(d.horario)}</strong></td><td>${html(horaMarcacion(d.entrada))}</td><td>${html(horaMarcacion(d.refrigerioInicio))}</td><td>${html(horaMarcacion(d.refrigerioFin))}</td><td>${html(horaMarcacion(d.salida))}</td><td>${minutos(d.asignados)}</td><td>${minutos(d.jornadaCumplida)}</td><td>${minutos(d.trabajados)}</td><td>${minutos(d.ausencia)}</td><td>${minutos(d.tardanza)}</td><td>${minutos(d.justificados)}</td><td>${minutos(d.extraGenerada)}</td><td>${minutos(d.extraPendiente)}</td><td>${minutos(d.extra)}</td><td><span class="estado-reporte">${html(etiquetaPlano(d.estado))}</span></td></tr>`,
        )
        .join("");
      const total = semana.reduce(
        (a, d) => ({
          asignado: a.asignado + d.asignados,
          jornada: a.jornada + d.jornadaCumplida,
          trabajado: a.trabajado + d.trabajados,
          ausencia: a.ausencia + d.ausencia,
          tardanza: a.tardanza + d.tardanza,
          justificado: a.justificado + d.justificados,
          extraGenerada: a.extraGenerada + d.extraGenerada,
          extraPendiente: a.extraPendiente + d.extraPendiente,
          extra: a.extra + d.extra,
        }),
        { asignado: 0, jornada: 0, trabajado: 0, ausencia: 0, tardanza: 0, justificado: 0, extraGenerada: 0, extraPendiente: 0, extra: 0 },
      );
      return `${filas}<tr class="resumen-semana"><th colspan="6">Resumen · Semana ${indice + 1}</th><th>${minutos(total.asignado)}</th><th>${minutos(total.jornada)}</th><th>${minutos(total.trabajado)}</th><th>${minutos(total.ausencia)}</th><th>${minutos(total.tardanza)}</th><th>${minutos(total.justificado)}</th><th>${minutos(total.extraGenerada)}</th><th>${minutos(total.extraPendiente)}</th><th>${minutos(total.extra)}</th><th></th></tr>`;
    })
    .join("");
  const resumen = `<div class="reporte-resumen-final"><div><span>Horas asignadas</span><strong>${minutos(r.minutosAsignados)}</strong></div><div><span>Jornada cumplida</span><strong>${minutos(r.minutosJornadaCumplida)}</strong></div><div><span>Horas trabajadas</span><strong>${minutos(r.minutosTrabajados)}</strong></div><div><span>Horas de ausencia</span><strong>${minutos(r.minutosAusencia)}</strong></div><div><span>Horas justificadas</span><strong>${minutos(r.minutosJustificados)}</strong></div><div><span>Extra generada</span><strong>${minutos(r.minutosExtraGenerados)}</strong></div><div><span>Extra pendiente</span><strong>${minutos(r.minutosExtraPendientes)}</strong></div><div><span>Extra aprobada</span><strong>${minutos(r.minutosExtraAprobados)}</strong></div><div><span>Asistencias</span><strong>${r.asistencias}</strong></div><div><span>Tardanzas</span><strong>${r.tardanzas}</strong></div><div><span>Ausencias</span><strong>${r.ausencias}</strong></div></div>`;
  return hojaReporte({
    titulo: "Planilla individual de asistencia",
    subtitulo: "Detalle diario organizado por semanas",
    colaborador: r,
    contenido: `<div class="reporte-tabla-marco reporte-tabla-amplia"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Entrada</th><th>Inicio<br>refrigerio</th><th>Fin<br>refrigerio</th><th>Salida</th><th>Asignado</th><th>Jornada</th><th>Trabajado</th><th>Ausencia</th><th>Tardanza</th><th>Justificado</th><th>Extra<br>generada</th><th>Extra<br>pendiente</th><th>Extra<br>aprobada</th><th>Estado</th></tr></thead><tbody>${cuerpo}</tbody></table></div><h2 class="titulo-resumen-reporte">Resumen general</h2>${resumen}`,
  });
}

function hojaReporte({ titulo, subtitulo, contenido, colaborador }) {
  const datosEmpresa = obtenerDatosEmpresa();
  const empresa = html(datosEmpresa.razonSocial);
  const ruc = html(datosEmpresa.ruc);
  const datosColaborador = colaborador
    ? `<div><span>Colaborador</span><strong>${html(colaborador.nombre)}</strong></div><div><span>Documento</span><strong>${html(colaborador.documento || "—")}</strong></div><div><span>Sucursal</span><strong>${html(colaborador.sucursal || "—")}</strong></div><div><span>Área</span><strong>${html(colaborador.area || "—")}</strong></div><div><span>Subárea</span><strong>${html(colaborador.subarea || "—")}</strong></div>`
    : `<div><span>Sucursal</span><strong>Varias</strong></div><div><span>Área</span><strong>Varias</strong></div><div><span>Subárea</span><strong>Varias</strong></div>`;
  return `<section class="hoja reporte-documento"><header class="reporte-cabecera"><div class="reporte-marca"><span class="reporte-logo"><i class="bi bi-calendar2-check"></i></span><div><small>${empresa}</small><h1>${html(titulo)}</h1><p>${html(subtitulo)}</p></div></div><div class="reporte-sello"><span>Generado</span><strong>${new Date().toLocaleDateString("es-PE")}</strong></div></header><div class="reporte-datos"><div><span>Empresa</span><strong>${empresa}</strong></div><div><span>RUC</span><strong>${ruc}</strong></div>${datosColaborador}<div><span>Período desde</span><strong>${formatearFecha(fechaDesde.value)}</strong></div><div><span>Hasta</span><strong>${formatearFecha(fechaHasta.value)}</strong></div></div>${contenido}<footer class="reporte-pie-documento"><span>Reporte generado por el sistema de control de asistencia</span><span>${formatearFecha(fechaDesde.value)} — ${formatearFecha(fechaHasta.value)}</span></footer></section>`;
}

function agruparPorSemana(detalles) {
  const grupos = [];
  detalles.forEach((detalle) => {
    const fecha = parseLocal(detalle.fecha);
    const inicioSemana = new Date(fecha);
    const dia = (fecha.getDay() + 6) % 7;
    inicioSemana.setDate(fecha.getDate() - dia);
    const clave = local(
      inicioSemana.getFullYear(),
      inicioSemana.getMonth(),
      inicioSemana.getDate(),
    );
    let grupo = grupos.find((item) => item.clave === clave);
    if (!grupo) {
      grupo = { clave, detalles: [] };
      grupos.push(grupo);
    }
    grupo.detalles.push(detalle);
  });
  return grupos.map((grupo) => grupo.detalles);
}

function nombreDia(fecha) {
  return parseLocal(fecha).toLocaleDateString("es-PE", { weekday: "short" });
}

function seccionPdfDetalle(r) {
  const cuerpo = r.detalles.map((d) => `<tr><td>${formatearFecha(d.fecha)}</td><td>${html(etiquetaPlano(d.estado))}</td><td>${html(horaMarcacion(d.entrada))}</td><td>${html(horaMarcacion(d.refrigerioInicio))}</td><td>${html(horaMarcacion(d.refrigerioFin))}</td><td>${html(horaMarcacion(d.salida))}</td><td>${minutos(d.asignados)}</td><td>${minutos(d.jornadaCumplida)}</td><td>${minutos(d.trabajados)}</td><td>${minutos(d.extra)}</td></tr>`).join("");
  return `<section class="hoja"><h1>${html(r.nombre)}</h1><p>${html(r.documento || "Sin documento")}</p>${periodoPdf()}<table><thead><tr><th>Fecha</th><th>Estado</th><th>Entrada</th><th>Ref. inicio</th><th>Ref. fin</th><th>Salida</th><th>Asignado</th><th>Jornada</th><th>Trabajado</th><th>Extra</th></tr></thead><tbody>${cuerpo}</tbody></table></section>`;
}

function abrirImpresion(contenido) {
  const ventana = window.open("", "_blank");
  if (!ventana) return alert("Permite las ventanas emergentes para generar el PDF.");
  ventana.document.write(`<!doctype html><html><head><title>Reporte de asistencia</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"><style>${estilosDocumentoReporte()}@page{size:landscape;margin:8mm}body{margin:0;background:#fff}.reporte-documento{box-shadow:none!important;margin:0 auto 8mm!important}.hoja{break-after:page}.hoja:last-child{break-after:auto}</style></head><body>${contenido}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  ventana.document.close();
}

function estilosDocumentoReporte() {
  return `*{box-sizing:border-box}.reporte-documento{width:100%;max-width:1180px;margin:0 auto 24px;padding:28px;background:#fff;color:#1e293b;font-family:Inter,Segoe UI,Arial,sans-serif;border-radius:16px;box-shadow:0 12px 32px rgba(15,23,42,.12)}.reporte-cabecera{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:3px solid #1d4ed8}.reporte-marca{display:flex;align-items:center;gap:14px}.reporte-logo{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff;font-size:24px}.reporte-marca small{color:#64748b;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.reporte-marca h1{margin:3px 0;color:#0f172a;font-size:22px;line-height:1.1;text-transform:uppercase}.reporte-marca p{margin:0;color:#64748b;font-size:10px}.reporte-sello{min-width:100px;padding:9px 12px;border:1px solid #dbeafe;border-radius:10px;background:#eff6ff;text-align:right}.reporte-sello span,.reporte-datos span{display:block;color:#64748b;font-size:8px;font-weight:700;text-transform:uppercase}.reporte-sello strong,.reporte-datos strong{display:block;margin-top:3px;color:#1e3a8a;font-size:10px}.reporte-datos{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:1px;margin:15px 0;background:#cbd5e1;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden}.reporte-datos>div{min-height:48px;padding:9px 11px;background:#f8fafc}.reporte-tabla-marco{overflow:hidden;border:1px solid #cbd5e1;border-radius:10px}.reporte-tabla-marco table{width:100%;border-collapse:collapse;font-size:8px}.reporte-tabla-marco th,.reporte-tabla-marco td{padding:7px 5px;border-right:1px solid #dbe3ee;border-bottom:1px solid #dbe3ee;text-align:center;vertical-align:middle}.reporte-tabla-marco thead th{background:#1e3a8a;color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:.025em}.reporte-tabla-marco tbody tr:nth-child(even){background:#f8fafc}.reporte-tabla-marco tbody tr:hover{background:#eff6ff}.reporte-tabla-marco tfoot th,.resumen-semana th{background:#dbeafe!important;color:#1e3a8a!important;font-weight:800}.texto-izquierda{text-align:left!important}.texto-izquierda small,.reporte-tabla-marco td small{display:block;margin-top:2px;color:#64748b;font-size:7px}.estado-reporte{display:inline-block;padding:3px 5px;border-radius:4px;background:#e0e7ff;color:#3730a3;font-size:7px;font-weight:800}.reporte-resumen-final{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.reporte-resumen-final>div{padding:11px;border:1px solid #dbeafe;border-radius:9px;background:linear-gradient(145deg,#f8fafc,#eff6ff)}.reporte-resumen-final span{display:block;color:#64748b;font-size:8px;font-weight:700;text-transform:uppercase}.reporte-resumen-final strong{display:block;margin-top:4px;color:#1e3a8a;font-size:15px}.titulo-resumen-reporte{margin:16px 0 9px;color:#0f172a;font-size:13px;text-transform:uppercase}.reporte-pie-documento{display:flex;justify-content:space-between;gap:12px;margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:7px}.reporte-sin-datos{padding:50px;text-align:center;color:#64748b}@media(max-width:900px){.reporte-datos{grid-template-columns:repeat(2,1fr)}.reporte-resumen-final{grid-template-columns:repeat(2,1fr)}.reporte-documento{min-width:980px}}`;
}

function periodoPdf() {
  return `<p>Período: ${formatearFecha(fechaDesde.value)} al ${formatearFecha(fechaHasta.value)}</p>`;
}

function asignarMes(d) {
  const y = d.getFullYear(),
    m = d.getMonth(),
    hoy = new Date();
  fechaDesde.value = local(y, m, 1);
  const fin = new Date(y, m + 1, 0);
  fechaHasta.value =
    y === hoy.getFullYear() && m === hoy.getMonth()
      ? local(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      : local(fin.getFullYear(), fin.getMonth(), fin.getDate());
}
function validarPeriodo() {
  if (!fechaDesde.value || !fechaHasta.value)
    return { ok: false, mensaje: "Selecciona las fechas Desde y Hasta." };
  if (fechaDesde.value > fechaHasta.value)
    return {
      ok: false,
      mensaje: "La fecha Desde no puede ser posterior a la fecha Hasta.",
    };
  const hoy = localHoy();
  if (fechaDesde.value > hoy)
    return {
      ok: false,
      mensaje: "El período no puede comenzar en una fecha futura.",
    };
  if (fechaHasta.value > hoy) fechaHasta.value = hoy;
  const dias = obtenerFechas(fechaDesde.value, fechaHasta.value).length;
  if (dias > 366)
    return { ok: false, mensaje: "Selecciona un período máximo de 366 días." };
  return { ok: true };
}
function obtenerFechas(desde, hasta) {
  const a = parseLocal(desde),
    b = parseLocal(hasta),
    r = [];
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1))
    r.push(local(d.getFullYear(), d.getMonth(), d.getDate()));
  return r;
}
function obtenerFiltrados() {
  const q = String(buscarResumen?.value || "")
    .trim()
    .toLowerCase();
  return registrosPeriodo.filter(
    (r) =>
      !q ||
      r.nombre.toLowerCase().includes(q) ||
      String(r.documento || "").includes(q),
  );
}
function actualizarTarjetas(rs) {
  const t = rs.reduce(
    (a, r) => ({
      diasProgramados: a.diasProgramados + r.diasProgramados,
      asistencias: a.asistencias + r.asistencias,
      tardanzas: a.tardanzas + r.tardanzas,
      ausencias: a.ausencias + r.ausencias,
    }),
    { diasProgramados: 0, asistencias: 0, tardanzas: 0, ausencias: 0 },
  );
  Object.entries({
    totalDiasProgramadosMensual: t.diasProgramados,
    totalAsistenciasMensual: t.asistencias,
    totalTardanzasMensual: t.tardanzas,
    totalAusenciasMensual: t.ausencias,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  });
}
function actualizarDescripcion(dias) {
  const e = document.getElementById("descripcionResumenMensual");
  if (e)
    e.textContent = `${formatearFecha(fechaDesde.value)} al ${formatearFecha(fechaHasta.value)} · ${dias} días calendario procesados.`;
}
function actualizarBotonesExportar(hay) {
  const boton = document.getElementById("btnAbrirDescargaResumenMensual");
  if (boton) boton.disabled = !hay;
}
function establecerCarga(v) {
  [
    fechaDesde,
    fechaHasta,
    btnActualizar,
    document.getElementById("btnAplicarRangoResumenMensual"),
  ].forEach((e) => {
    if (e) e.disabled = v;
  });
  if (btnActualizar)
    btnActualizar.innerHTML = v
      ? '<span class="spinner-border spinner-border-sm"></span> Calculando...'
      : '<i class="bi bi-arrow-clockwise"></i> Actualizar';
}
function mostrarMensaje(m) {
  cuerpoResumen.innerHTML = `<tr><td colspan="12" class="asistencia-tabla-vacia">${html(m)}</td></tr>`;
  actualizarBotonesExportar(false);
}
function esAsistencia(e) {
  return [
    "PRESENTE",
    "TARDANZA",
    "PRESENTE_CON_PERMISO",
    "TARDANZA_CON_PERMISO",
    "TRABAJO_EN_FERIADO",
    "DESCANSO_SUSTITUTORIO_TRABAJADO",
  ].includes(e);
}
function etiquetaEstado(e) {
  return html(String(e || "SIN_ESTADO").replaceAll("_", " "));
}
function iniciales(nombre) {
  return String(nombre || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x.charAt(0))
    .join("")
    .toUpperCase();
}
function valorContador(valor, tipo) {
  return valor
    ? `<span class="reporte-contador ${tipo}">${valor}</span>`
    : `<span class="reporte-contador cero">0</span>`;
}
function minutos(v) {
  const n = Math.max(0, Math.round(numero(v))),
    h = Math.floor(n / 60),
    m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
function minutosExcel(v) {
  const n = Math.max(0, Math.round(numero(v)));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
function etiquetaPlano(v) {
  return String(v || "SIN ESTADO").replaceAll("_", " ");
}
function nombreHoja(v) {
  return String(v || "Reporte")
    .replace(/[\\/*?:\[\]]/g, " ")
    .trim()
    .slice(0, 31) || "Reporte";
}
function numero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function clavePeriodo() {
  return `${fechaDesde?.value || ""}|${fechaHasta?.value || ""}`;
}
function local(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function localHoy() {
  const d = new Date();
  return local(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseLocal(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatearFecha(s) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("es-PE").format(parseLocal(s));
}
function html(v) {
  const e = document.createElement("div");
  e.textContent = String(v ?? "");
  return e.innerHTML;
}

