import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  doc,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const COLECCIONES_AUDITADAS = [
  "empresas", "usuarios", "sucursales", "areas", "subareas", "colaboradores", "horarios",
  "asignacionesHorarios", "excepcionesHorarios", "permisos", "feriados",
  "descansosSustitutorios", "marcaciones", "ajustesAsistenciaDiaria",
  "aprobacionesHorasExtra", "cierresAsistencia",
];
const nombresModulo = {
  empresas: "Compañía", usuarios: "Usuarios y perfiles", sucursales: "Sucursales", areas: "Áreas", subareas: "Subáreas",
  colaboradores: "Colaboradores", horarios: "Horarios", asignacionesHorarios: "Asignación de horarios",
  excepcionesHorarios: "Programación diaria", permisos: "Permisos", feriados: "Feriados",
  descansosSustitutorios: "Descansos sustitutorios", marcaciones: "Marcaciones",
  ajustesAsistenciaDiaria: "Ajustes de asistencia", aprobacionesHorasExtra: "Horas extra",
  cierresAsistencia: "Cierres de asistencia",
};

let detenerMonitores = [];
let monitorEmpresa = "";
let registros = [];
let pagina = 1;
let limite = 10;

export async function iniciarMonitorAuditoriaGlobal(usuario) {
  const empresaId = sessionStorage.getItem("empresaId");
  if (!usuario || !empresaId || monitorEmpresa === empresaId) return;
  detenerMonitores.forEach((fn) => fn());
  detenerMonitores = [];
  monitorEmpresa = empresaId;
  const perfil = await obtenerPerfil(usuario.uid);
  const responsable = {
    uid: usuario.uid,
    nombre: perfil?.nombre || perfil?.nombreCompleto || usuario.displayName || usuario.email || "Usuario",
    correo: usuario.email || perfil?.correo || "",
    rol: perfil?.rol || perfil?.tipoUsuario || "Usuario",
  };
  COLECCIONES_AUDITADAS.forEach((nombreColeccion) => observarColeccion(nombreColeccion, empresaId, responsable));
}

async function obtenerPerfil(uid) {
  try { const snap = await getDoc(doc(db, "usuarios", uid)); return snap.exists() ? snap.data() : null; }
  catch { return null; }
}

function observarColeccion(nombreColeccion, empresaId, responsable) {
  const cache = new Map();
  const procesados = new Set();
  let inicializado = false;
  const consulta = query(collection(db, nombreColeccion), where("empresaId", "==", empresaId));
  const detener = onSnapshot(consulta, { includeMetadataChanges: true }, (snap) => {
    if (!inicializado) {
      snap.docs.forEach((d) => cache.set(d.id, limpiar(d.data())));
      inicializado = true;
      return;
    }
    snap.docChanges().forEach((cambio) => {
      const pendienteLocal = cambio.doc.metadata.hasPendingWrites === true;
      const despues = cambio.type === "removed" ? null : limpiar(cambio.doc.data());
      const antes = cache.get(cambio.doc.id) || null;
      if (cambio.type === "removed") cache.delete(cambio.doc.id); else cache.set(cambio.doc.id, despues);
      if (!pendienteLocal) return;
      const clave = `${nombreColeccion}:${cambio.doc.id}:${cambio.type}`;
      if (procesados.has(clave)) return;
      procesados.add(clave);
      setTimeout(() => procesados.delete(clave), 2500);
      registrarCambio({ empresaId, nombreColeccion, documentoId: cambio.doc.id, tipo: cambio.type, antes, despues, responsable }).catch((error) => console.error("No se pudo registrar auditoría:", error));
    });
  }, (error) => console.warn(`Auditoría no pudo observar ${nombreColeccion}:`, error));
  detenerMonitores.push(detener);
}

async function registrarCambio({ empresaId, nombreColeccion, documentoId, tipo, antes, despues, responsable }) {
  const datos = despues || antes || {};
  const accion = tipo === "added" ? "CREAR" : tipo === "removed" ? "ELIMINAR" : "MODIFICAR";
  const cambios = accion === "MODIFICAR" ? diferencias(antes, despues) : null;
  await addDoc(collection(db, "auditoriaSistema"), {
    empresaId,
    modulo: nombresModulo[nombreColeccion] || nombreColeccion,
    coleccion: nombreColeccion,
    documentoId,
    accion,
    responsableId: responsable.uid,
    responsableNombre: responsable.nombre,
    responsableCorreo: responsable.correo,
    responsableRol: responsable.rol,
    afectadoId: datos.colaboradorId || datos.usuarioId || datos.empleadoId || documentoId,
    afectadoNombre: datos.colaboradorNombre || datos.nombreCompleto || datos.nombre || datos.razonSocial || datos.descripcion || "Registro del sistema",
    afectadoDocumento: datos.colaboradorDocumento || datos.documento || datos.dni || null,
    motivo: datos.motivo || datos.observacion || datos.descripcionMotivo || null,
    resumen: resumenCambio(accion, nombreColeccion, datos, cambios),
    antes: limitar(antes),
    despues: limitar(despues),
    cambios: limitar(cambios),
    fecha: serverTimestamp(),
    origen: "MONITOR_CLIENTE",
  });
}

function diferencias(antes = {}, despues = {}) {
  const resultado = {};
  new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]).forEach((campo) => {
    if (["fechaModificacion", "fechaActualizacion", "fechaEdicion"].includes(campo)) return;
    const a = JSON.stringify(antes?.[campo] ?? null);
    const d = JSON.stringify(despues?.[campo] ?? null);
    if (a !== d) resultado[campo] = { anterior: antes?.[campo] ?? null, nuevo: despues?.[campo] ?? null };
  });
  return resultado;
}

function resumenCambio(accion, coleccion, datos, cambios) {
  const destino = datos.colaboradorNombre || datos.nombreCompleto || datos.nombre || datos.razonSocial || datos.descripcion || datos.documento || "registro";
  const campos = cambios ? Object.keys(cambios) : [];
  return accion === "MODIFICAR" ? `${accion} ${destino}${campos.length ? ` · ${campos.join(", ")}` : ""}` : `${accion} ${destino} en ${nombresModulo[coleccion] || coleccion}`;
}

function limpiar(valor) {
  if (valor == null) return valor;
  if (typeof valor?.toDate === "function") return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiar(v)]));
  return valor;
}
function limitar(valor) { const texto = JSON.stringify(valor); return texto?.length > 12000 ? { resumen: "Contenido extenso", caracteres: texto.length } : valor; }

export function iniciarAuditoria() {
  const ids = ["actualizarAuditoria", "buscarAuditoria", "filtroModuloAuditoria", "filtroAccionAuditoria", "fechaDesdeAuditoria", "fechaHastaAuditoria", "limpiarFiltrosAuditoria", "limiteAuditoria", "anteriorAuditoria", "siguienteAuditoria", "cuerpoAuditoria"];
  if (ids.some((id) => !document.getElementById(id))) return;
  document.getElementById("actualizarAuditoria").addEventListener("click", cargarAuditoria);
  ["buscarAuditoria", "filtroModuloAuditoria", "filtroAccionAuditoria", "fechaDesdeAuditoria", "fechaHastaAuditoria"].forEach((id) => document.getElementById(id).addEventListener(id === "buscarAuditoria" ? "input" : "change", () => { pagina = 1; renderizarAuditoria(); }));
  document.getElementById("limiteAuditoria").addEventListener("change", (e) => { limite = Number(e.target.value) || 10; pagina = 1; renderizarAuditoria(); });
  document.getElementById("anteriorAuditoria").addEventListener("click", () => { pagina--; renderizarAuditoria(); });
  document.getElementById("siguienteAuditoria").addEventListener("click", () => { pagina++; renderizarAuditoria(); });
  document.getElementById("limpiarFiltrosAuditoria").addEventListener("click", limpiarFiltros);
  document.getElementById("cuerpoAuditoria").addEventListener("click", mostrarDetalle);
  document.getElementById("cerrarDetalleAuditoria").addEventListener("click", cerrarDetalle);
  document.getElementById("modalDetalleAuditoria").addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarDetalle(); });
  cargarAuditoria();
}

async function cargarAuditoria() {
  const empresaId = sessionStorage.getItem("empresaId");
  const cuerpo = document.getElementById("cuerpoAuditoria");
  cuerpo.innerHTML = '<tr><td colspan="8" class="auditoria-vacio">Cargando historial global...</td></tr>';
  try {
    const [global, asistencia] = await Promise.all([
      getDocs(query(collection(db, "auditoriaSistema"), where("empresaId", "==", empresaId))),
      getDocs(query(collection(db, "historialOperacionesAsistencia"), where("empresaId", "==", empresaId))),
    ]);
    registros = [
      ...global.docs.map((d) => normalizarGlobal(d.id, d.data())),
      ...asistencia.docs.map((d) => normalizarAsistencia(d.id, d.data())),
    ].sort((a, b) => fechaMs(b.fecha) - fechaMs(a.fecha));
    completarModulos();
    actualizarResumen();
    renderizarAuditoria();
  } catch (error) {
    console.error("Error cargando auditoría:", error);
    cuerpo.innerHTML = `<tr><td colspan="8" class="auditoria-vacio">No se pudo cargar la auditoría: ${html(error.message)}</td></tr>`;
  }
}

function normalizarGlobal(id, r) { return { id, ...r, categoriaAccion: r.accion || "OPERACION" }; }
function normalizarAsistencia(id, r) { return { id: `asistencia_${id}`, modulo: "Asistencia", accion: r.tipo || "OPERACION", categoriaAccion: "OPERACION", responsableId: r.usuarioId, responsableNombre: r.usuarioNombre || r.usuarioEmail || r.usuarioId || "Usuario", responsableCorreo: r.usuarioEmail || "", afectadoId: r.colaboradorId || "Período", afectadoNombre: r.colaboradorNombre || (r.desde ? `${r.desde} al ${r.hasta}` : "Operación de asistencia"), resumen: r.tipo || "Operación administrativa", motivo: r.motivo || r.observacion, fecha: r.fecha, antes: null, despues: r, cambios: null }; }

function obtenerFiltrados() {
  const texto = document.getElementById("buscarAuditoria").value.trim().toLowerCase();
  const modulo = document.getElementById("filtroModuloAuditoria").value;
  const accion = document.getElementById("filtroAccionAuditoria").value;
  const desde = document.getElementById("fechaDesdeAuditoria").value;
  const hasta = document.getElementById("fechaHastaAuditoria").value;
  return registros.filter((r) => {
    const bolsa = [r.modulo, r.accion, r.responsableNombre, r.responsableCorreo, r.afectadoNombre, r.afectadoDocumento, r.resumen, r.motivo].join(" ").toLowerCase();
    const iso = fechaISO(r.fecha);
    return (!texto || bolsa.includes(texto)) && (!modulo || r.modulo === modulo) && (!accion || r.categoriaAccion === accion) && (!desde || iso >= desde) && (!hasta || iso <= hasta);
  });
}

function renderizarAuditoria() {
  const cuerpo = document.getElementById("cuerpoAuditoria");
  const datos = obtenerFiltrados();
  const paginas = Math.max(1, Math.ceil(datos.length / limite)); pagina = Math.min(paginas, Math.max(1, pagina));
  const inicio = (pagina - 1) * limite; const visibles = datos.slice(inicio, inicio + limite);
  cuerpo.innerHTML = visibles.length ? visibles.map((r) => `<tr><td><strong>${html(fechaVisible(r.fecha))}</strong></td><td>${html(r.modulo || "Sistema")}</td><td><span class="badge-auditoria ${String(r.categoriaAccion).toLowerCase()}">${html(etiqueta(r.accion))}</span></td><td><strong>${html(r.responsableNombre || "Usuario")}</strong><small>${html(r.responsableCorreo || r.responsableRol || r.responsableId || "—")}</small></td><td><strong>${html(r.afectadoNombre || "Registro")}</strong><small>${html(r.afectadoDocumento || r.afectadoId || "—")}</small></td><td>${html(r.resumen || "Cambio registrado")}</td><td>${html(r.motivo || "—")}</td><td><button class="btn-auditoria secundario" type="button" data-detalle="${html(r.id)}"><i class="bi bi-eye"></i></button></td></tr>`).join("") : '<tr><td colspan="8" class="auditoria-vacio">No existen cambios para los filtros seleccionados.</td></tr>';
  document.getElementById("informacionAuditoria").textContent = datos.length ? `Mostrando ${inicio + 1}–${Math.min(inicio + limite, datos.length)} de ${datos.length}` : "Mostrando 0 registros";
  document.getElementById("paginaAuditoria").textContent = `Página ${pagina} de ${paginas}`;
  document.getElementById("anteriorAuditoria").disabled = pagina <= 1; document.getElementById("siguienteAuditoria").disabled = pagina >= paginas;
}

function mostrarDetalle(e) {
  const id = e.target.closest("[data-detalle]")?.dataset.detalle; if (!id) return;
  const r = registros.find((x) => x.id === id); if (!r) return;
  document.getElementById("tituloDetalleAuditoria").textContent = `${etiqueta(r.accion)} · ${r.modulo}`;
  document.getElementById("contenidoDetalleAuditoria").innerHTML = `<div class="detalle-auditoria-grid"><div><span>Fecha</span><strong>${html(fechaVisible(r.fecha))}</strong></div><div><span>Responsable</span><strong>${html(r.responsableNombre || r.responsableId || "—")}</strong></div><div><span>Usuario / correo</span><strong>${html(r.responsableCorreo || r.responsableId || "—")}</strong></div><div><span>Afectado</span><strong>${html(r.afectadoNombre || r.afectadoId || "—")}</strong></div><div><span>Motivo</span><strong>${html(r.motivo || "No especificado")}</strong></div><div><span>Documento</span><strong>${html(r.documentoId || r.afectadoDocumento || "—")}</strong></div></div><pre class="cambio-json">${html(JSON.stringify({ cambios:r.cambios, antes:r.antes, despues:r.despues }, null, 2))}</pre>`;
  const modal = document.getElementById("modalDetalleAuditoria"); modal.hidden = false; modal.inert = false; modal.removeAttribute("inert"); modal.setAttribute("aria-hidden", "false"); document.getElementById("cerrarDetalleAuditoria").focus();
}
function cerrarDetalle() { const modal=document.getElementById("modalDetalleAuditoria"); if(modal.contains(document.activeElement))document.activeElement.blur(); modal.inert=true; modal.setAttribute("inert",""); modal.setAttribute("aria-hidden","true"); modal.hidden=true; }
function limpiarFiltros(){["buscarAuditoria","filtroModuloAuditoria","filtroAccionAuditoria","fechaDesdeAuditoria","fechaHastaAuditoria"].forEach((id)=>document.getElementById(id).value="");pagina=1;renderizarAuditoria();}
function completarModulos(){const s=document.getElementById("filtroModuloAuditoria"),actual=s.value;const modulos=[...new Set(registros.map((r)=>r.modulo).filter(Boolean))].sort();s.innerHTML='<option value="">Todos los módulos</option>'+modulos.map((m)=>`<option value="${html(m)}">${html(m)}</option>`).join("");if(modulos.includes(actual))s.value=actual;}
function actualizarResumen(){document.getElementById("totalAuditoria").textContent=registros.length;document.getElementById("usuariosAuditoria").textContent=new Set(registros.map((r)=>r.responsableId||r.responsableCorreo).filter(Boolean)).size;document.getElementById("ultimoCambioAuditoria").textContent=registros.length?fechaVisible(registros[0].fecha):"—";}
function fechaMs(v){if(typeof v?.toMillis==="function")return v.toMillis();if(typeof v==="string")return Date.parse(v)||0;return 0;}function fechaISO(v){const ms=fechaMs(v);return ms?new Date(ms).toISOString().slice(0,10):"";}function fechaVisible(v){const ms=fechaMs(v);return ms?new Date(ms).toLocaleString("es-PE",{dateStyle:"short",timeStyle:"short"}):"Pendiente";}function etiqueta(v){return String(v||"OPERACIÓN").replaceAll("_"," ");}function html(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
