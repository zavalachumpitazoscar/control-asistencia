import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { auth, db } from "../firebase-config.js";

let reporte = { desde: "", hasta: "", registros: [] };
let panel = null;
let horarios = [];
let pagina = 1;
let limite = 10;
let seleccion = new Set();
let control = null;

export function iniciarAdministracionAsistencia() {
  control?.abort();
  control = new AbortController();
  instalarProteccionFoco(control.signal);
  instalarPanel();
  document.addEventListener("asistencia:reporte-periodo-cargado", async (evento) => {
    reporte = evento.detail || reporte;
    seleccion.clear();
    pagina = 1;
    await cargarHorarios();
    renderizar();
  }, { signal: control.signal });
}

function instalarPanel() {
  if (document.getElementById("panelAdministracionAsistencia")) return;
  const destino = document.querySelector('[data-contenido-tab="mensual"]');
  if (!destino) return;
  panel = document.createElement("section");
  panel.id = "panelAdministracionAsistencia";
  panel.className = "administracion-asistencia";
  panel.innerHTML = `
    <style>${estilos()}</style>
    <header><div><span>CONTROL ADMINISTRATIVO</span><h3>Correcciones masivas y auditoría</h3><p>Modifica la programación del período con motivo obligatorio y registro permanente.</p></div><button id="verAuditoriaAsistencia" type="button" class="btn-admin secundario"><i class="bi bi-journal-text"></i> Ver auditoría</button></header>
    <div class="admin-grid">
      <article>
        <div class="campos-admin">
          <label>Acción<select id="accionMasivaAsistencia"><option value="ASIGNAR">Asignar horario</option><option value="SIN_HORARIO">Marcar sin horario</option><option value="RESTAURAR">Restaurar programación</option></select></label>
          <label id="grupoHorarioMasivo">Horario<select id="horarioMasivoAsistencia"><option value="">Selecciona un horario</option></select></label>
          <label>Motivo<input id="motivoCorreccionMasiva" maxlength="300" placeholder="Motivo obligatorio"></label>
        </div>
        <div class="barra-admin"><input id="buscarCorreccionMasiva" type="search" placeholder="Buscar colaborador o documento"><label>Mostrar <select id="limiteCorreccionMasiva"><option>10</option><option>20</option><option>50</option></select></label></div>
        <div class="seleccion-admin"><label><input id="seleccionarPaginaCorreccion" type="checkbox"> Seleccionar página visible</label><b id="cantidadSeleccionCorreccion">0 seleccionados</b></div>
        <div id="listaCorreccionMasiva" class="lista-admin"><p>Calcula primero un reporte mensual.</p></div>
        <footer><span id="paginaCorreccionMasiva">0 colaboradores</span><div><button id="anteriorCorreccionMasiva" type="button">Anterior</button><button id="siguienteCorreccionMasiva" type="button">Siguiente</button></div></footer>
        <button id="aplicarCorreccionMasiva" type="button" class="btn-admin principal"><i class="bi bi-pencil-square"></i> Aplicar corrección</button>
      </article>
    </div>
    <div id="modalAuditoriaAsistencia" class="modal-auditoria" hidden aria-hidden="true" inert>
      <div class="dialogo-auditoria" role="dialog" aria-modal="true" aria-labelledby="tituloAuditoriaAsistencia">
        <div class="cabecera-auditoria"><div><span>TRAZABILIDAD</span><h3 id="tituloAuditoriaAsistencia">Historial de operaciones</h3></div><button id="cerrarAuditoriaAsistencia" type="button" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button></div>
        <div id="contenidoAuditoriaAsistencia" class="contenido-auditoria"><p>Cargando historial...</p></div>
      </div>
    </div>`;
  destino.append(panel);
  panel.querySelector("#accionMasivaAsistencia").addEventListener("change", actualizarAccion);
  panel.querySelector("#buscarCorreccionMasiva").addEventListener("input", () => { pagina = 1; renderizar(); });
  panel.querySelector("#limiteCorreccionMasiva").addEventListener("change", (e) => { limite = Number(e.target.value) || 10; pagina = 1; renderizar(); });
  panel.querySelector("#anteriorCorreccionMasiva").addEventListener("click", () => { pagina--; renderizar(); });
  panel.querySelector("#siguienteCorreccionMasiva").addEventListener("click", () => { pagina++; renderizar(); });
  panel.querySelector("#seleccionarPaginaCorreccion").addEventListener("change", seleccionarPagina);
  panel.querySelector("#listaCorreccionMasiva").addEventListener("change", sincronizarSeleccion);
  panel.querySelector("#aplicarCorreccionMasiva").addEventListener("click", aplicarCorreccion);
  panel.querySelector("#verAuditoriaAsistencia").addEventListener("click", abrirAuditoria);
  panel.querySelector("#cerrarAuditoriaAsistencia").addEventListener("click", cerrarAuditoria);
  panel.querySelector("#modalAuditoriaAsistencia").addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarAuditoria(); });
  actualizarAccion();
}

async function cargarHorarios() {
  const empresaId = sessionStorage.getItem("empresaId");
  if (!empresaId) return;
  const resultado = await getDocs(query(collection(db, "horarios"), where("empresaId", "==", empresaId)));
  horarios = resultado.docs.map((d) => ({ id: d.id, ...d.data() })).filter((h) => String(h.estado || "ACTIVO").toUpperCase() !== "INACTIVO");
  const select = panel?.querySelector("#horarioMasivoAsistencia");
  if (select) select.innerHTML = '<option value="">Selecciona un horario</option>' + horarios.map((h) => `<option value="${html(h.id)}">${html(h.nombre || h.descripcion || rangoHorario(h))}</option>`).join("");
}

function rangoHorario(h) {
  const bloques = Array.isArray(h.horarios) ? h.horarios : [];
  return bloques.map((b) => `${b?.entrada?.programada || "--:--"}–${b?.salida?.programada || "--:--"}`).join(" / ") || "Horario sin nombre";
}

function filtrados() {
  const texto = (panel?.querySelector("#buscarCorreccionMasiva")?.value || "").trim().toLowerCase();
  return (reporte.registros || []).filter((r) => !texto || String(r.nombre || "").toLowerCase().includes(texto) || String(r.documento || "").toLowerCase().includes(texto));
}

function renderizar() {
  if (!panel) return;
  const datos = filtrados();
  const paginas = Math.max(1, Math.ceil(datos.length / limite));
  pagina = Math.min(paginas, Math.max(1, pagina));
  const inicio = (pagina - 1) * limite;
  const visibles = datos.slice(inicio, inicio + limite);
  panel.querySelector("#listaCorreccionMasiva").innerHTML = visibles.length ? visibles.map((r) => `<label class="fila-admin"><input type="checkbox" data-id="${html(r.colaboradorId)}" ${seleccion.has(r.colaboradorId) ? "checked" : ""}><span><strong>${html(r.nombre)}</strong><small>${html(r.documento || "Sin documento")} · ${html(r.sucursal || "Sin sucursal")}</small></span><em>${Number(r.diasProgramados || 0)} días programados</em></label>`).join("") : "<p>No existen colaboradores para mostrar.</p>";
  panel.querySelector("#paginaCorreccionMasiva").textContent = datos.length ? `Mostrando ${inicio + 1}–${Math.min(inicio + limite, datos.length)} de ${datos.length} · Página ${pagina} de ${paginas}` : "0 colaboradores";
  panel.querySelector("#anteriorCorreccionMasiva").disabled = pagina <= 1;
  panel.querySelector("#siguienteCorreccionMasiva").disabled = pagina >= paginas;
  sincronizarSeleccion();
}

function seleccionarPagina(e) {
  panel.querySelectorAll('#listaCorreccionMasiva input[type="checkbox"]').forEach((input) => { input.checked = e.target.checked; if (input.checked) seleccion.add(input.dataset.id); else seleccion.delete(input.dataset.id); });
  sincronizarSeleccion();
}

function sincronizarSeleccion() {
  const visibles = [...panel.querySelectorAll('#listaCorreccionMasiva input[type="checkbox"]')];
  visibles.forEach((input) => { if (input.checked) seleccion.add(input.dataset.id); else seleccion.delete(input.dataset.id); });
  const todos = panel.querySelector("#seleccionarPaginaCorreccion");
  todos.checked = visibles.length > 0 && visibles.every((x) => x.checked);
  todos.indeterminate = visibles.some((x) => x.checked) && !todos.checked;
  panel.querySelector("#cantidadSeleccionCorreccion").textContent = `${seleccion.size} seleccionados`;
}

function actualizarAccion() {
  panel.querySelector("#grupoHorarioMasivo").hidden = panel.querySelector("#accionMasivaAsistencia").value !== "ASIGNAR";
}

async function aplicarCorreccion() {
  const usuario = auth.currentUser;
  const empresaId = sessionStorage.getItem("empresaId");
  const accion = panel.querySelector("#accionMasivaAsistencia").value;
  const horarioId = panel.querySelector("#horarioMasivoAsistencia").value;
  const motivo = panel.querySelector("#motivoCorreccionMasiva").value.trim();
  if (!usuario || !empresaId) return aviso("Sesión no disponible", "Vuelve a iniciar sesión.", "error");
  if (!reporte.desde || !reporte.hasta) return aviso("Sin período", "Calcula primero el reporte mensual.", "warning");
  if (!seleccion.size) return aviso("Sin selección", "Selecciona al menos un colaborador.", "warning");
  if (!motivo) return aviso("Motivo obligatorio", "Describe por qué se realizará la corrección.", "warning");
  if (accion === "ASIGNAR" && !horarioId) return aviso("Horario obligatorio", "Selecciona el horario que se asignará.", "warning");
  if (await estaCerrado(empresaId)) return aviso("Período cerrado", "Reabre el período antes de aplicar correcciones.", "warning");
  const fechas = fechasPeriodo(reporte.desde, reporte.hasta);
  const operaciones = seleccion.size * fechas.length;
  if (operaciones > 440) return aviso("Operación demasiado grande", "Reduce el rango o selecciona menos colaboradores. El máximo seguro es 440 cambios por operación.", "warning");
  const confirmacion = window.Swal ? await Swal.fire({ icon: "question", title: "Confirmar corrección masiva", text: `Se aplicarán ${operaciones} cambios de programación.`, showCancelButton: true, confirmButtonText: "Aplicar", cancelButtonText: "Cancelar", confirmButtonColor: "#4f46e5" }) : { isConfirmed: confirm(`Se aplicarán ${operaciones} cambios. ¿Continuar?`) };
  if (!confirmacion.isConfirmed) return;
  const boton = panel.querySelector("#aplicarCorreccionMasiva");
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.textContent = "Procesando...";
  try {
    const batch = writeBatch(db);
    for (const colaboradorId of seleccion) for (const fecha of fechas) {
      const ref = doc(db, "excepcionesHorarios", idExcepcion(empresaId, colaboradorId, fecha));
      if (accion === "RESTAURAR") batch.delete(ref);
      else batch.set(ref, { empresaId, colaboradorId, fecha, tipo: accion === "SIN_HORARIO" ? "SIN_HORARIO" : "REEMPLAZAR", horarioIds: accion === "ASIGNAR" ? [horarioId] : [], estado: "ACTIVO", motivo, origen: "CORRECCION_MASIVA", modificadoPor: usuario.uid, fechaModificacion: serverTimestamp() }, { merge: true });
    }
    batch.set(doc(collection(db, "historialOperacionesAsistencia")), { empresaId, tipo: "CORRECCION_MASIVA_PROGRAMACION", accion, horarioId: accion === "ASIGNAR" ? horarioId : null, desde: reporte.desde, hasta: reporte.hasta, colaboradores: [...seleccion], cantidad: operaciones, motivo, usuarioId: usuario.uid, usuarioEmail: usuario.email || null, fecha: serverTimestamp() });
    await batch.commit();
    panel.querySelector("#motivoCorreccionMasiva").value = "";
    seleccion.clear();
    renderizar();
    document.dispatchEvent(new CustomEvent("asistencia:programacion-actualizada", { detail: { masivo: true, desde: reporte.desde, hasta: reporte.hasta } }));
    aviso("Corrección aplicada", `Se registraron ${operaciones} cambios con trazabilidad.`, "success");
  } catch (error) {
    console.error("Error en corrección masiva:", error);
    aviso("No se pudo completar", error.message || "Ocurrió un error al guardar.", "error");
  } finally { boton.disabled = false; boton.innerHTML = original; }
}

async function estaCerrado(empresaId) {
  const id = idSeguro(empresaId, reporte.desde, reporte.hasta);
  const snap = await getDoc(doc(db, "cierresAsistencia", id));
  return snap.exists() && snap.data().estado === "CERRADO";
}

async function abrirAuditoria() {
  const modal = panel.querySelector("#modalAuditoriaAsistencia");
  modal.hidden = false; modal.inert = false; modal.removeAttribute("inert"); modal.setAttribute("aria-hidden", "false");
  panel.querySelector("#cerrarAuditoriaAsistencia").focus();
  const contenedor = panel.querySelector("#contenidoAuditoriaAsistencia");
  contenedor.innerHTML = "<p>Cargando historial...</p>";
  try {
    const empresaId = sessionStorage.getItem("empresaId");
    const snap = await getDocs(query(collection(db, "historialOperacionesAsistencia"), where("empresaId", "==", empresaId)));
    const filas = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => fechaMs(b.fecha) - fechaMs(a.fecha)).slice(0, 100);
    contenedor.innerHTML = filas.length ? `<table><thead><tr><th>Fecha</th><th>Operación</th><th>Período</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>${filas.map((r) => `<tr><td>${html(fechaAuditoria(r.fecha))}</td><td>${html(etiqueta(r.tipo || r.accion))}</td><td>${html(r.desde || "—")}<br>${html(r.hasta || "—")}</td><td>${Number(r.cantidad || 1)}</td><td>${html(r.motivo || r.observacion || "—")}</td><td>${html(r.usuarioEmail || r.usuarioId || "—")}</td></tr>`).join("")}</tbody></table>` : "<p>No existen operaciones registradas.</p>";
  } catch (error) { contenedor.innerHTML = `<p>No se pudo cargar el historial: ${html(error.message)}</p>`; }
}

function cerrarAuditoria() {
  const modal = panel.querySelector("#modalAuditoriaAsistencia");
  if (modal.contains(document.activeElement)) document.activeElement.blur();
  modal.inert = true; modal.setAttribute("inert", ""); modal.setAttribute("aria-hidden", "true"); modal.hidden = true;
  panel.querySelector("#verAuditoriaAsistencia")?.focus();
}

function instalarProteccionFoco(signal) {
  document.addEventListener("pointerdown", (e) => { const boton = e.target.closest(".btn-cerrar-modal,[id^='cerrar'],[id^='cancelar'],[id^='btnCerrar']"); const modal = boton?.closest(".modal"); if (modal?.contains(document.activeElement)) document.activeElement.blur(); }, { capture: true, signal });
}

function fechasPeriodo(desde, hasta) { const r=[]; const a=new Date(`${desde}T00:00:00`), b=new Date(`${hasta}T00:00:00`); for(const d=new Date(a); d<=b; d.setDate(d.getDate()+1)) r.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`); return r; }
function idSeguro(...v) { return v.map((x) => String(x || "").replace(/[^a-zA-Z0-9_-]/g, "_")).join("_"); }
function idExcepcion(empresaId, colaboradorId, fecha) { return `${empresaId}_${colaboradorId}_${fecha}`; }
function html(v) { return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function etiqueta(v) { return String(v || "").replaceAll("_", " "); }
function fechaMs(v) { return typeof v?.toMillis === "function" ? v.toMillis() : 0; }
function fechaAuditoria(v) { const ms=fechaMs(v); return ms ? new Date(ms).toLocaleString("es-PE") : "Pendiente"; }
function aviso(t, x, icon="info") { return window.Swal ? Swal.fire({ icon, title:t, text:x, confirmButtonColor:"#4f46e5" }) : alert(`${t}\n${x}`); }
function estilos(){return `.administracion-asistencia{margin:22px 0;padding:20px;border:1px solid #dbe3ee;border-radius:16px;background:#f8fafc}.administracion-asistencia [hidden]{display:none!important}.administracion-asistencia>header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:15px}.administracion-asistencia header span,.cabecera-auditoria span{color:#4f46e5;font-size:9px;font-weight:800}.administracion-asistencia h3{margin:3px 0;color:#0f172a}.administracion-asistencia p{margin:0;color:#64748b;font-size:11px}.admin-grid article{padding:16px;border:1px solid #e2e8f0;border-radius:13px;background:#fff}.campos-admin{display:grid;grid-template-columns:180px 220px 1fr;gap:10px}.campos-admin label{display:grid;gap:5px;color:#64748b;font-size:9px;font-weight:800;text-transform:uppercase}.campos-admin select,.campos-admin input,.barra-admin input,.barra-admin select{padding:9px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font:inherit;text-transform:none}.barra-admin,.seleccion-admin,.administracion-asistencia footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.barra-admin>input{flex:1}.barra-admin label{display:flex;align-items:center;gap:6px;color:#64748b;font-size:10px}.seleccion-admin{padding:9px 11px;border-radius:8px;background:#f1f5f9;font-size:10px}.lista-admin{min-height:90px;margin-top:10px;border:1px solid #e2e8f0;border-radius:9px}.fila-admin{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #eef2f7}.fila-admin:last-child{border-bottom:0}.fila-admin span{display:grid}.fila-admin small,.fila-admin em{color:#64748b;font-size:10px}.administracion-asistencia footer{color:#64748b;font-size:10px}.administracion-asistencia footer button,.btn-admin{padding:8px 11px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;font-size:10px;font-weight:800;cursor:pointer}.btn-admin.principal{margin-top:13px;border-color:#4f46e5;background:#4f46e5;color:#fff}.modal-auditoria{position:fixed;z-index:12000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.55)}.dialogo-auditoria{width:min(1050px,96vw);max-height:88vh;overflow:auto;border-radius:15px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.3)}.cabecera-auditoria{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #e2e8f0;background:#fff}.cabecera-auditoria button{border:0;background:transparent;font-size:18px}.contenido-auditoria{padding:16px;overflow:auto}.contenido-auditoria table{width:100%;border-collapse:collapse;font-size:10px}.contenido-auditoria th,.contenido-auditoria td{padding:9px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}@media(max-width:720px){.administracion-asistencia>header,.barra-admin{align-items:stretch;flex-direction:column}.campos-admin{grid-template-columns:1fr}.fila-admin{grid-template-columns:auto 1fr}.fila-admin em{grid-column:2}.contenido-auditoria{overflow:auto}}`;}
