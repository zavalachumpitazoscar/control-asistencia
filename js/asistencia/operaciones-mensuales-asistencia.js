import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { auth, db } from "../firebase-config.js";

let reporte = { desde: "", hasta: "", registros: [] };
let panel;
let control;
let candidatosHorasExtra = [];
let paginaHorasExtra = 1;
let limiteHorasExtra = 10;
let seleccionHorasExtra = new Set();

export function iniciarOperacionesMensualesAsistencia() {
  control?.abort();
  control = new AbortController();
  instalarInterfaz();
  document.addEventListener("asistencia:reporte-periodo-cargado", (evento) => {
    reporte = evento.detail || reporte;
    renderizarCandidatos();
    consultarCierre();
  }, { signal: control.signal });
}

function instalarInterfaz() {
  if (document.getElementById("panelOperacionesMensualesAsistencia")) return;
  const panelMensual = document.querySelector('[data-contenido-tab="mensual"]');
  if (!panelMensual) return;
  panel = document.createElement("section");
  panel.id = "panelOperacionesMensualesAsistencia";
  panel.className = "operaciones-mensuales";
  panel.innerHTML = `
    <style>${estilos()}</style>
    <header class="operaciones-cabecera">
      <div><span>Administración del período</span><h3>Horas extra y cierre mensual</h3><p>Decisiones masivas con trazabilidad y bloqueo administrativo.</p></div>
      <div id="estadoCierreAsistencia" class="estado-cierre abierto">PERÍODO ABIERTO</div>
    </header>
    <div class="operaciones-grid">
      <article class="operacion-tarjeta">
        <div class="operacion-titulo"><i class="bi bi-clock-history"></i><div><strong>Horas extra masivas</strong><small>Selecciona colaboradores con horas generadas.</small></div></div>
        <div class="operacion-herramientas">
          <label>Decisión<select id="decisionMasivaHorasExtra"><option value="APROBADO">Aprobar todo</option><option value="PARCIAL">Aprobar porcentaje</option><option value="RECHAZADO">Rechazar</option></select></label>
          <label id="grupoPorcentajeHorasExtra" hidden>Porcentaje<input id="porcentajeMasivoHorasExtra" type="number" min="1" max="99" value="50"></label>
          <label class="motivo-masivo">Motivo<textarea id="motivoMasivoHorasExtra" rows="2" placeholder="Motivo obligatorio"></textarea></label>
        </div>
        <div class="controles-lista-extra"><input id="buscarHorasExtraMasiva" type="search" placeholder="Buscar colaborador o documento"><label>Mostrar <select id="limiteHorasExtraMasiva"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label></div>
        <div class="seleccion-masiva"><label><input id="seleccionarTodasHorasExtra" type="checkbox"> Seleccionar página visible</label><span id="resumenSeleccionHorasExtra">0 seleccionados</span></div>
        <div id="listaHorasExtraMasiva" class="lista-horas-extra"><p class="sin-operaciones">Calcula primero el reporte del período.</p></div>
        <div class="paginacion-extra"><span id="informacionPaginaHorasExtra">Página 1 de 1</span><div><button id="paginaAnteriorHorasExtra" type="button">Anterior</button><button id="paginaSiguienteHorasExtra" type="button">Siguiente</button></div></div>
        <button id="aplicarDecisionMasivaHorasExtra" class="btn-operacion principal" type="button"><i class="bi bi-check2-all"></i> Aplicar decisión</button>
      </article>
      <article class="operacion-tarjeta">
        <div class="operacion-titulo"><i class="bi bi-lock"></i><div><strong>Cierre mensual</strong><small>Impide nuevas operaciones masivas en el período.</small></div></div>
        <div class="resumen-cierre"><span>Período seleccionado</span><strong id="periodoCierreAsistencia">—</strong><p id="detalleCierreAsistencia">Consulta un período para verificar su estado.</p></div>
        <label class="motivo-cierre">Observación<textarea id="observacionCierreAsistencia" rows="3" placeholder="Motivo del cierre o reapertura"></textarea></label>
        <div class="acciones-cierre"><button id="cerrarPeriodoAsistencia" class="btn-operacion peligro" type="button"><i class="bi bi-lock"></i> Cerrar período</button><button id="reabrirPeriodoAsistencia" class="btn-operacion secundario" type="button" hidden><i class="bi bi-unlock"></i> Reabrir</button></div>
      </article>
    </div>`;
  panelMensual.append(panel);
  panel.querySelector("#decisionMasivaHorasExtra").addEventListener("change", cambiarDecision);
  panel.querySelector("#buscarHorasExtraMasiva").addEventListener("input", () => { paginaHorasExtra = 1; renderizarPaginaHorasExtra(); });
  panel.querySelector("#limiteHorasExtraMasiva").addEventListener("change", (evento) => { limiteHorasExtra = Number(evento.target.value) || 10; paginaHorasExtra = 1; renderizarPaginaHorasExtra(); });
  panel.querySelector("#paginaAnteriorHorasExtra").addEventListener("click", () => { paginaHorasExtra--; renderizarPaginaHorasExtra(); });
  panel.querySelector("#paginaSiguienteHorasExtra").addEventListener("click", () => { paginaHorasExtra++; renderizarPaginaHorasExtra(); });
  panel.querySelector("#seleccionarTodasHorasExtra").addEventListener("change", seleccionarTodos);
  panel.querySelector("#listaHorasExtraMasiva").addEventListener("change", actualizarSeleccion);
  panel.querySelector("#aplicarDecisionMasivaHorasExtra").addEventListener("click", aplicarDecisionMasiva);
  panel.querySelector("#cerrarPeriodoAsistencia").addEventListener("click", () => cambiarCierre("CERRADO"));
  panel.querySelector("#reabrirPeriodoAsistencia").addEventListener("click", () => cambiarCierre("ABIERTO"));
  cambiarDecision();
}

function cambiarDecision() {
  const parcial = panel.querySelector("#decisionMasivaHorasExtra").value === "PARCIAL";
  panel.querySelector("#grupoPorcentajeHorasExtra").hidden = !parcial;
}

function renderizarCandidatos() {
  if (!panel) return;
  panel.querySelector("#periodoCierreAsistencia").textContent = `${fechaVisible(reporte.desde)} al ${fechaVisible(reporte.hasta)}`;
  candidatosHorasExtra = reporte.registros.filter((r) => Number(r.minutosExtraGenerados) > 0);
  seleccionHorasExtra.clear();
  paginaHorasExtra = 1;
  renderizarPaginaHorasExtra();
}

function obtenerCandidatosFiltrados() {
  const texto = (panel.querySelector("#buscarHorasExtraMasiva")?.value || "").trim().toLowerCase();
  return candidatosHorasExtra.filter((r) => !texto || r.nombre.toLowerCase().includes(texto) || String(r.documento || "").toLowerCase().includes(texto));
}

function renderizarPaginaHorasExtra() {
  const candidatos = obtenerCandidatosFiltrados();
  const paginas = Math.max(1, Math.ceil(candidatos.length / limiteHorasExtra));
  paginaHorasExtra = Math.min(paginas, Math.max(1, paginaHorasExtra));
  const inicio = (paginaHorasExtra - 1) * limiteHorasExtra;
  const visibles = candidatos.slice(inicio, inicio + limiteHorasExtra);
  const lista = panel.querySelector("#listaHorasExtraMasiva");
  lista.innerHTML = visibles.length ? visibles.map((r) => `
    <label class="fila-extra-masiva">
      <input type="checkbox" ${seleccionHorasExtra.has(r.colaboradorId) ? "checked" : ""} data-colaborador-id="${escapar(r.colaboradorId)}" data-nombre="${escapar(r.nombre)}" data-minutos="${Number(r.minutosExtraGenerados) || 0}">
      <span><strong>${escapar(r.nombre)}</strong><small>${escapar(r.documento || "Sin documento")} · ${escapar(r.sucursal || "Sin sucursal")}</small></span>
      <b>${duracion(r.minutosExtraGenerados)}</b>
    </label>`).join("") : '<p class="sin-operaciones">No existen colaboradores para mostrar.</p>';
  panel.querySelector("#informacionPaginaHorasExtra").textContent = candidatos.length ? `Mostrando ${inicio + 1}–${Math.min(inicio + limiteHorasExtra, candidatos.length)} de ${candidatos.length} · Página ${paginaHorasExtra} de ${paginas}` : "0 colaboradores";
  panel.querySelector("#paginaAnteriorHorasExtra").disabled = paginaHorasExtra <= 1;
  panel.querySelector("#paginaSiguienteHorasExtra").disabled = paginaHorasExtra >= paginas;
  actualizarSeleccion();
}

function seleccionarTodos(evento) {
  panel.querySelectorAll('#listaHorasExtraMasiva input[type="checkbox"]').forEach((input) => {
    input.checked = evento.target.checked;
    if (input.checked) seleccionHorasExtra.add(input.dataset.colaboradorId);
    else seleccionHorasExtra.delete(input.dataset.colaboradorId);
  });
  actualizarSeleccion();
}

function actualizarSeleccion() {
  panel.querySelectorAll('#listaHorasExtraMasiva input[type="checkbox"]').forEach((input) => {
    if (input.checked) seleccionHorasExtra.add(input.dataset.colaboradorId);
    else seleccionHorasExtra.delete(input.dataset.colaboradorId);
  });
  const visibles = [...panel.querySelectorAll('#listaHorasExtraMasiva input[type="checkbox"]')];
  const selector = panel.querySelector("#seleccionarTodasHorasExtra");
  selector.checked = visibles.length > 0 && visibles.every((input) => input.checked);
  selector.indeterminate = visibles.some((input) => input.checked) && !selector.checked;
  panel.querySelector("#resumenSeleccionHorasExtra").textContent = `${seleccionHorasExtra.size} seleccionados en total`;
}

async function aplicarDecisionMasiva() {
  if (await periodoCerrado()) return alerta("Período cerrado", "Reabre el período antes de modificar horas extra.", "warning");
  const usuario = auth.currentUser;
  const empresaId = sessionStorage.getItem("empresaId");
  const seleccionados = candidatosHorasExtra.filter((r) => seleccionHorasExtra.has(r.colaboradorId));
  const decisionElegida = panel.querySelector("#decisionMasivaHorasExtra").value;
  const motivo = panel.querySelector("#motivoMasivoHorasExtra").value.trim();
  const porcentaje = Math.min(99, Math.max(1, Number(panel.querySelector("#porcentajeMasivoHorasExtra").value) || 50));
  if (!usuario || !empresaId) return alerta("Sesión no disponible", "Vuelve a iniciar sesión.", "error");
  if (!seleccionados.length) return alerta("Sin selección", "Selecciona al menos un colaborador.", "warning");
  if (!motivo) return alerta("Motivo obligatorio", "Escribe el motivo de la decisión masiva.", "warning");
  const fechas = fechasPeriodo(reporte.desde, reporte.hasta);
  const batch = writeBatch(db);
  let operaciones = 0;
  seleccionados.forEach((seleccionado) => {
    const diasConExtra = seleccionado.detalles.filter((d) => Number(d.extraGenerada) > 0) || [];
    diasConExtra.forEach((detalle) => {
      const generados = Number(detalle.extraGenerada) || 0;
      const decision = decisionElegida === "RECHAZADO" ? "RECHAZADO" : "APROBADO";
      const minutosAprobados = decisionElegida === "RECHAZADO" ? 0 : decisionElegida === "PARCIAL" ? Math.max(1, Math.round(generados * porcentaje / 100)) : generados;
      const id = [empresaId, seleccionado.colaboradorId, detalle.fecha].map(limpiarId).join("_");
      batch.set(doc(db, "aprobacionesHorasExtra", id), {
        empresaId, colaboradorId: seleccionado.colaboradorId, colaboradorNombre: seleccionado.nombre,
        fecha: detalle.fecha, minutosCalculados: generados, decision,
        estadoAprobacion: decisionElegida === "PARCIAL" ? "PARCIAL" : decision,
        minutosAprobados, motivo, estado: "ACTIVO", decididoPor: usuario.uid,
        origenDecision: "MASIVO", porcentajeAplicado: decisionElegida === "PARCIAL" ? porcentaje : null,
        fechaDecision: serverTimestamp(), fechaModificacion: serverTimestamp(),
      }, { merge: true });
      operaciones++;
    });
  });
  if (!operaciones) return alerta("Sin detalle diario", "No se encontraron días con horas extra calculadas.", "warning");
  if (operaciones > 450) return alerta("Selección demasiado grande", "Procesa menos colaboradores o un período más corto para no superar el límite de Firestore.", "warning");
  const auditoria = doc(collection(db, "historialOperacionesAsistencia"));
  batch.set(auditoria, { empresaId, tipo: "HORAS_EXTRA_MASIVAS", desde: reporte.desde, hasta: reporte.hasta, decision: decisionElegida, motivo, cantidad: operaciones, usuarioId: usuario.uid, fecha: serverTimestamp(), fechasProcesadas: fechas.length });
  await ejecutarBoton(panel.querySelector("#aplicarDecisionMasivaHorasExtra"), async () => batch.commit());
  document.dispatchEvent(new CustomEvent("asistencia:horas-extra-actualizadas", { detail: { masivo: true, desde: reporte.desde, hasta: reporte.hasta } }));
  alerta("Decisión aplicada", `Se actualizaron ${operaciones} registros diarios.`, "success");
}

async function consultarCierre() {
  if (!panel || !reporte.desde) return;
  const cerrado = await periodoCerrado(true);
  const estado = panel.querySelector("#estadoCierreAsistencia");
  estado.textContent = cerrado ? "PERÍODO CERRADO" : "PERÍODO ABIERTO";
  estado.className = `estado-cierre ${cerrado ? "cerrado" : "abierto"}`;
  panel.querySelector("#cerrarPeriodoAsistencia").hidden = cerrado;
  panel.querySelector("#reabrirPeriodoAsistencia").hidden = !cerrado;
  panel.querySelector("#aplicarDecisionMasivaHorasExtra").disabled = cerrado;
  panel.querySelector("#detalleCierreAsistencia").textContent = cerrado ? "Las operaciones masivas están bloqueadas hasta su reapertura." : "El período admite decisiones y ajustes.";
}

async function periodoCerrado(silencioso = false) {
  const empresaId = sessionStorage.getItem("empresaId");
  if (!empresaId || !reporte.desde || !reporte.hasta) return false;
  try {
    const snap = await getDoc(doc(db, "cierresAsistencia", idCierre(empresaId)));
    return snap.exists() && snap.data().estado === "CERRADO";
  } catch (error) {
    if (!silencioso) console.error("No se pudo consultar el cierre:", error);
    return false;
  }
}

async function cambiarCierre(estado) {
  const usuario = auth.currentUser;
  const empresaId = sessionStorage.getItem("empresaId");
  const observacion = panel.querySelector("#observacionCierreAsistencia").value.trim();
  if (!usuario || !empresaId || !reporte.desde) return alerta("Datos incompletos", "Consulta un período e inicia sesión.", "warning");
  if (!observacion) return alerta("Observación obligatoria", "Indica el motivo del cierre o reapertura.", "warning");
  await setDoc(doc(db, "cierresAsistencia", idCierre(empresaId)), {
    empresaId, desde: reporte.desde, hasta: reporte.hasta, estado, observacion,
    actualizadoPor: usuario.uid, fechaActualizacion: serverTimestamp(),
    [`fecha${estado === "CERRADO" ? "Cierre" : "Reapertura"}`]: serverTimestamp(),
  }, { merge: true });
  await setDoc(doc(collection(db, "historialOperacionesAsistencia")), { empresaId, tipo: estado === "CERRADO" ? "CIERRE_PERIODO" : "REAPERTURA_PERIODO", desde: reporte.desde, hasta: reporte.hasta, observacion, usuarioId: usuario.uid, fecha: serverTimestamp() });
  panel.querySelector("#observacionCierreAsistencia").value = "";
  await consultarCierre();
  document.dispatchEvent(new CustomEvent("asistencia:cierre-periodo-actualizado", { detail: { estado, desde: reporte.desde, hasta: reporte.hasta } }));
  alerta(estado === "CERRADO" ? "Período cerrado" : "Período reabierto", "La operación quedó registrada en el historial.", "success");
}

function idCierre(empresaId) { return [empresaId, reporte.desde, reporte.hasta].map(limpiarId).join("_"); }
function limpiarId(v) { return String(v || "").replace(/[^a-zA-Z0-9_-]/g, "_"); }
function fechaVisible(v) { if (!v) return "—"; const [a,m,d] = v.split("-"); return `${d}/${m}/${a}`; }
function fechasPeriodo(desde, hasta) { const r=[]; if(!desde||!hasta)return r; const a=new Date(`${desde}T00:00:00`), b=new Date(`${hasta}T00:00:00`); for(const d=new Date(a);d<=b;d.setDate(d.getDate()+1))r.push(d.toISOString().slice(0,10)); return r; }
function duracion(v) { const n=Math.max(0,Math.round(Number(v)||0)); return `${Math.floor(n/60)} h ${n%60 ? `${n%60} min` : ""}`.trim(); }
function escapar(v) { const e=document.createElement("div"); e.textContent=String(v??""); return e.innerHTML; }
async function ejecutarBoton(boton, accion) { const original=boton.innerHTML; boton.disabled=true; boton.innerHTML='<span class="spinner-border spinner-border-sm"></span> Procesando...'; try { await accion(); } catch(e) { console.error(e); alerta("No se pudo completar", e.message || "Ocurrió un error.", "error"); throw e; } finally { boton.disabled=false; boton.innerHTML=original; } }
function alerta(titulo, texto, icon="info") { if (window.Swal) return Swal.fire({ icon, title: titulo, text: texto, confirmButtonColor: "#4f46e5" }); alert(`${titulo}\n${texto}`); }

function estilos() { return `
  .operaciones-mensuales [hidden]{display:none!important}.operaciones-mensuales{margin:22px 0;padding:20px;border:1px solid #dbe3ee;border-radius:16px;background:#f8fafc}.operaciones-cabecera{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px}.operaciones-cabecera span{color:#4f46e5;font-size:9px;font-weight:800;text-transform:uppercase}.operaciones-cabecera h3{margin:3px 0;color:#0f172a}.operaciones-cabecera p{margin:0;color:#64748b;font-size:11px}.estado-cierre{align-self:center;padding:8px 11px;border-radius:8px;font-size:10px;font-weight:800}.estado-cierre.abierto{background:#dcfce7;color:#15803d}.estado-cierre.cerrado{background:#fee2e2;color:#b91c1c}.operaciones-grid{display:grid;grid-template-columns:2fr 1fr;gap:15px}.operacion-tarjeta{padding:16px;border:1px solid #e2e8f0;border-radius:13px;background:#fff}.operacion-titulo{display:flex;gap:10px;align-items:center;margin-bottom:13px}.operacion-titulo>i{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eef2ff;color:#4f46e5}.operacion-titulo div{display:grid}.operacion-titulo small{color:#64748b}.operacion-herramientas{display:grid;grid-template-columns:160px 150px 1fr;gap:10px}.operacion-herramientas label,.motivo-cierre{display:grid;gap:5px;color:#64748b;font-size:9px;font-weight:800;text-transform:uppercase}.operacion-herramientas select,.operacion-herramientas input,.operacion-herramientas textarea,.motivo-cierre textarea{padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;text-transform:none}.controles-lista-extra{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.controles-lista-extra>input{flex:1;min-width:160px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px}.controles-lista-extra label{display:flex;align-items:center;gap:6px;color:#64748b;font-size:10px}.controles-lista-extra select{padding:7px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}.seleccion-masiva{display:flex;justify-content:space-between;margin:10px 0;padding:8px 10px;border-radius:8px;background:#f1f5f9;font-size:10px}.lista-horas-extra{min-height:120px;border:1px solid #e2e8f0;border-radius:9px}.fila-extra-masiva{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:9px 11px;border-bottom:1px solid #eef2f7}.fila-extra-masiva:last-child{border-bottom:0}.fila-extra-masiva span{display:grid}.fila-extra-masiva small{color:#64748b}.fila-extra-masiva b{color:#4f46e5}.paginacion-extra{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:10px;color:#64748b;font-size:10px}.paginacion-extra div{display:flex;gap:6px}.paginacion-extra button{padding:7px 10px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#475569;cursor:pointer}.paginacion-extra button:disabled{opacity:.45;cursor:not-allowed}.sin-operaciones{padding:20px;color:#94a3b8;text-align:center}.btn-operacion{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;padding:9px 13px;border:0;border-radius:9px;font-size:10px;font-weight:800;cursor:pointer}.btn-operacion.principal{background:#4f46e5;color:#fff}.btn-operacion.peligro{background:#dc2626;color:#fff}.btn-operacion.secundario{border:1px solid #cbd5e1;background:#fff;color:#475569}.btn-operacion:disabled{opacity:.5;cursor:not-allowed}.resumen-cierre{padding:13px;border-radius:10px;background:#f8fafc}.resumen-cierre span{color:#64748b;font-size:9px;text-transform:uppercase}.resumen-cierre strong{display:block;margin:4px 0;color:#0f172a}.resumen-cierre p{margin:0;color:#64748b;font-size:10px}.motivo-cierre{margin-top:12px}.acciones-cierre{display:flex;gap:8px}.filtros-organizacionales-reporte{display:flex;gap:6px}.filtros-organizacionales-reporte select{max-width:155px;padding:7px;border:1px solid #dbe3ee;border-radius:8px;background:#fff;color:#475569;font-size:10px}@media(max-width:950px){.operaciones-grid{grid-template-columns:1fr}.operacion-herramientas{grid-template-columns:1fr 1fr}.motivo-masivo{grid-column:1/-1}}@media(max-width:650px){.operaciones-cabecera{flex-direction:column}.operacion-herramientas{grid-template-columns:1fr}.motivo-masivo{grid-column:auto}.filtros-organizacionales-reporte{flex-direction:column}.controles-lista-extra{align-items:stretch;flex-direction:column}.paginacion-extra{align-items:flex-start;flex-direction:column}}
`; }
