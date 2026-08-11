import {
  consultarColeccionEmpresa,
  construirRegistrosResumen,
} from "./resumen-asistencia.js";

let fechaDesde, fechaHasta, buscarResumen, cuerpoResumen, btnActualizar;
let registrosPeriodo = [],
  periodoCargado = "",
  cargando = false;

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
];

export function iniciarResumenMensualAsistencia() {
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
    .getElementById("btnExportarExcelResumenMensual")
    ?.addEventListener("click", exportarExcel);
  document
    .getElementById("btnExportarPdfResumenMensual")
    ?.addEventListener("click", exportarPdf);
  buscarResumen?.addEventListener("input", renderizarResumen);
  cuerpoResumen.addEventListener("click", (e) => {
    const b = e.target.closest('[data-accion="ver-detalle-periodo"]');
    if (b) abrirDetalle(b.dataset.colaboradorId);
  });
  configurarModal();

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
    ] = resultados;
    const fechas = obtenerFechas(fechaDesde.value, fechaHasta.value),
      consolidado = new Map();
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
      }).forEach((r) => acumular(consolidado, r, fecha));
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
      diasProgramados: 0,
      asistencias: 0,
      tardanzas: 0,
      ausencias: 0,
      permisos: 0,
      minutosTrabajados: 0,
      minutosJustificados: 0,
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
  t.minutosTrabajados += numero(r.minutosTrabajados);
  t.minutosJustificados += numero(r.minutosJustificadosPermiso);
  const extra =
    String(aprobacion?.decision || "").toUpperCase() === "APROBADO"
      ? numero(aprobacion.minutosAprobados)
      : 0;
  t.minutosExtraAprobados += extra;
  t.detalles.push({
    fecha,
    estado: r.estado || "SIN_ESTADO",
    entrada: r.entrada,
    refrigerioInicio:
      r.clasificacion?.inicioRefrigerio || r.clasificacion?.refrigerioInicio,
    refrigerioFin:
      r.clasificacion?.finRefrigerio || r.clasificacion?.refrigerioFin,
    salida: r.salida,
    tardanza: numero(r.tardanzaMinutos),
    trabajados: numero(r.minutosTrabajados),
    justificados: numero(r.minutosJustificadosPermiso),
    extra,
    marcaciones: r.clasificacion?.todas || [],
  });
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
        `<tr><td class="mensual-colaborador"><div class="mensual-avatar">${iniciales(r.nombre)}</div><div><strong>${html(r.nombre)}</strong><small>${html(r.documento || "Sin documento")}</small></div></td><td>${r.diasProgramados}</td><td>${r.asistencias}</td><td>${valorContador(r.tardanzas, "advertencia")}</td><td>${valorContador(r.ausencias, "peligro")}</td><td>${valorContador(r.permisos, "informacion")}</td><td>${minutos(r.minutosTrabajados)}</td><td>${minutos(r.minutosJustificados)}</td><td>${minutos(r.minutosExtraAprobados)}</td><td><button type="button" class="btn-ver-detalle-periodo" data-accion="ver-detalle-periodo" data-colaborador-id="${html(r.colaboradorId)}"><i class="bi bi-eye"></i> Ver detalle</button></td></tr>`,
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
          `<tr><td><strong>${formatearFecha(d.fecha)}</strong></td><td>${etiquetaEstado(d.estado)}</td>${celdaMarcacion(d.entrada, d.marcaciones, "ENTRADA")}${celdaMarcacion(d.refrigerioInicio, d.marcaciones, "INICIO_REFRIGERIO")}${celdaMarcacion(d.refrigerioFin, d.marcaciones, "FIN_REFRIGERIO")}${celdaMarcacion(d.salida, d.marcaciones, "SALIDA")}<td>${d.tardanza ? `${d.tardanza} min` : "—"}</td><td>${minutos(d.trabajados)}</td><td>${minutos(d.justificados)}</td><td>${minutos(d.extra)}</td></tr>`,
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

function exportarExcel() {
  const filas = obtenerFiltrados();
  if (!filas.length) return;
  const cab = [
    "Colaborador",
    "Documento",
    "Desde",
    "Hasta",
    "Días programados",
    "Asistencias",
    "Tardanzas",
    "Ausencias",
    "Permisos",
    "Horas trabajadas",
    "Horas justificadas",
    "Horas extra aprobadas",
  ];
  const datos = filas.map((r) => [
    r.nombre,
    r.documento || "",
    fechaDesde.value,
    fechaHasta.value,
    r.diasProgramados,
    r.asistencias,
    r.tardanzas,
    r.ausencias,
    r.permisos,
    minutosDecimal(r.minutosTrabajados),
    minutosDecimal(r.minutosJustificados),
    minutosDecimal(r.minutosExtraAprobados),
  ]);
  descargar(
    `reporte-asistencia-${fechaDesde.value}-a-${fechaHasta.value}.csv`,
    `\uFEFF${[cab, ...datos].map((f) => f.map(csv).join(";")).join("\r\n")}`,
    "text/csv;charset=utf-8",
  );
}

function exportarPdf() {
  const filas = obtenerFiltrados();
  if (!filas.length) return;
  const ventana = window.open("", "_blank");
  if (!ventana) {
    alert("Permite las ventanas emergentes para generar el PDF.");
    return;
  }
  const cuerpo = filas
    .map(
      (r) =>
        `<tr><td>${html(r.nombre)}<br><small>${html(r.documento || "")}</small></td><td>${r.diasProgramados}</td><td>${r.asistencias}</td><td>${r.tardanzas}</td><td>${r.ausencias}</td><td>${r.permisos}</td><td>${minutos(r.minutosTrabajados)}</td><td>${minutos(r.minutosJustificados)}</td><td>${minutos(r.minutosExtraAprobados)}</td></tr>`,
    )
    .join("");
  ventana.document.write(
    `<!doctype html><html><head><title>Reporte de asistencia</title><style>@page{size:landscape;margin:12mm}body{font-family:Arial;color:#172033}h1{font-size:20px;margin-bottom:4px}p{color:#64748b}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:7px;border:1px solid #cbd5e1;text-align:left}th{background:#eef2ff}small{color:#64748b}</style></head><body><h1>Reporte de asistencia por período</h1><p>${formatearFecha(fechaDesde.value)} al ${formatearFecha(fechaHasta.value)}</p><table><thead><tr><th>Colaborador</th><th>Programados</th><th>Asistencias</th><th>Tardanzas</th><th>Ausencias</th><th>Permisos</th><th>Trabajadas</th><th>Justificadas</th><th>Extra aprobada</th></tr></thead><tbody>${cuerpo}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`,
  );
  ventana.document.close();
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
  ["btnExportarExcelResumenMensual", "btnExportarPdfResumenMensual"].forEach(
    (id) => {
      const b = document.getElementById(id);
      if (b) b.disabled = !hay;
    },
  );
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
  cuerpoResumen.innerHTML = `<tr><td colspan="10" class="asistencia-tabla-vacia">${html(m)}</td></tr>`;
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
function minutosDecimal(v) {
  return (numero(v) / 60).toFixed(2).replace(".", ",");
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
function csv(v) {
  const s = String(v ?? "").replaceAll('"', '""');
  return `"${s}"`;
}
function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo })),
    a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
