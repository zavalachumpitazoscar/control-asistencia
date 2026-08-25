import { auth, db } from "./firebase-config.js";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
let empresas = [], comunicados = [], cargado = false;

document.addEventListener("superadmin:cambio-vista", (e) => { if (e.detail?.vista === "comunicados") iniciar(); });
$("comunicadoAlcance")?.addEventListener("change", actualizarAlcance);
$("comunicadoEmpresa")?.addEventListener("change", actualizarResumen);
$("formComunicadoSuper")?.addEventListener("submit", publicar);
$("recargarComunicadosSuper")?.addEventListener("click", () => cargarDatos(true));
$("listaComunicadosSuper")?.addEventListener("click", gestionar);

function fechaISO(fecha = new Date()) { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`; }
function prepararFechas() { const hoy = new Date(), hasta = new Date(hoy); hasta.setDate(hasta.getDate() + 7); if (!$("comunicadoDesde").value) $("comunicadoDesde").value = fechaISO(hoy); if (!$("comunicadoHasta").value) $("comunicadoHasta").value = fechaISO(hasta); }
async function iniciar() { prepararFechas(); if (!cargado) await cargarDatos(); }

async function cargarDatos(forzar = false) {
  if (cargado && !forzar) return;
  const lista = $("listaComunicadosSuper");
  lista.innerHTML = '<div class="communications-empty">Cargando comunicados…</div>';
  try {
    const [empresasSnap, anunciosSnap] = await Promise.all([
      getDocs(query(collection(db, "companias"), limit(500))),
      getDocs(query(collection(db, "anunciosEmpresa"), where("origen", "==", "SUPERADMIN"), limit(500))),
    ]);
    empresas = empresasSnap.docs.map((d) => { const x = d.data(); return { id: x.empresaId || d.id, nombre: x.empresa?.razonSocial || x.razonSocial || "Empresa sin nombre", estado: x.estado || "PENDIENTE" }; }).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    comunicados = anunciosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    $("comunicadoEmpresa").innerHTML = empresas.map((e) => `<option value="${esc(e.id)}">${esc(e.nombre)} · ${esc(e.estado)}</option>`).join("");
    cargado = true; actualizarAlcance(); renderizar();
  } catch (error) { console.error(error); lista.innerHTML = `<div class="communications-empty error">No se pudieron cargar los comunicados: ${esc(error.message)}</div>`; }
}

function actualizarAlcance() { const especifica = $("comunicadoAlcance").value === "EMPRESA"; $("campoEmpresaComunicado").hidden = !especifica; $("comunicadoEmpresa").required = especifica; actualizarResumen(); }
function actualizarResumen() { const todas = $("comunicadoAlcance").value === "TODAS", empresa = empresas.find((e) => e.id === $("comunicadoEmpresa").value); $("resumenDestinoComunicado").textContent = todas ? `Se publicará en ${empresas.length} empresa(s).` : `Se publicará solamente para ${empresa?.nombre || "la empresa seleccionada"}.`; }

async function publicar(evento) {
  evento.preventDefault();
  const boton = $("publicarComunicadoSuper"), todas = $("comunicadoAlcance").value === "TODAS", seleccionadas = todas ? empresas : empresas.filter((e) => e.id === $("comunicadoEmpresa").value), titulo = $("comunicadoTitulo").value.trim(), mensaje = $("comunicadoMensaje").value.trim(), visibleDesde = $("comunicadoDesde").value, visibleHasta = $("comunicadoHasta").value;
  if (!seleccionadas.length) return aviso("Selecciona una empresa válida.", true);
  if (!titulo || mensaje.length < 5) return aviso("Completa el título y el mensaje.", true);
  if (!visibleDesde || !visibleHasta || visibleHasta < visibleDesde) return aviso("La vigencia del comunicado no es válida.", true);
  const confirmar = await Swal.fire({ icon: "question", title: todas ? "Publicar para todas las empresas" : "Publicar para esta empresa", text: todas ? `Se crearán ${seleccionadas.length} anuncios, uno por cada cliente.` : `El anuncio se enviará a ${seleccionadas[0].nombre}.`, showCancelButton: true, confirmButtonText: "Sí, publicar", cancelButtonText: "Cancelar", confirmButtonColor: "#2867ee" });
  if (!confirmar.isConfirmed) return;
  boton.disabled = true; boton.textContent = "Publicando…";
  try {
    const grupoId = `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const base = { grupoId, origen: "SUPERADMIN", alcance: todas ? "TODAS" : "EMPRESA", titulo, mensaje, destino: $("comunicadoDestino").value, visibleDesde, visibleHasta, estado: "PUBLICADO", creadoPor: auth.currentUser?.uid || null, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() };
    const batch = writeBatch(db); seleccionadas.forEach((empresa) => batch.set(doc(collection(db, "anunciosEmpresa")), { ...base, empresaId: empresa.id, empresaNombre: empresa.nombre })); await batch.commit();
    await setDoc(doc(collection(db, "auditoriaSuperadmin")), { tipo: "PUBLICAR_COMUNICADO", grupoId, alcance: base.alcance, cantidadEmpresas: seleccionadas.length, titulo, destino: base.destino, empresaId: todas ? null : seleccionadas[0].id, fecha: serverTimestamp(), superadminUid: auth.currentUser?.uid || null });
    $("formComunicadoSuper").reset(); prepararFechas(); cargado = false; await cargarDatos(true); aviso(`Comunicado publicado en ${seleccionadas.length} empresa(s).`);
  } catch (error) { console.error(error); aviso(error.message || "No se pudo publicar el comunicado.", true); }
  finally { boton.disabled = false; boton.textContent = "Publicar comunicado"; }
}

function grupos() { const mapa = new Map(); comunicados.forEach((a) => { const clave = a.grupoId || a.id; if (!mapa.has(clave)) mapa.set(clave, { ...a, ids: [], empresas: [] }); const grupo = mapa.get(clave); grupo.ids.push(a.id); grupo.empresas.push(a.empresaNombre || a.empresaId); }); return [...mapa.values()].sort((a, b) => milis(b.creadoEn) - milis(a.creadoEn)); }
function renderizar() { const lista = grupos(); $("listaComunicadosSuper").innerHTML = lista.length ? lista.map((a) => `<article class="communication-item"><div class="communication-icon">✦</div><div><div class="communication-meta"><span>${a.alcance === "TODAS" ? `${a.ids.length} empresas` : esc(a.empresas[0] || "Empresa")}</span><span>${destinoTexto(a.destino)}</span><span>Hasta ${fechaVisible(a.visibleHasta)}</span></div><h4>${esc(a.titulo)}</h4><p>${esc(a.mensaje)}</p></div><button type="button" data-eliminar-comunicado="${esc(a.grupoId || a.id)}">Eliminar</button></article>`).join("") : '<div class="communications-empty">Todavía no existen comunicados del superadministrador.</div>'; }
async function gestionar(evento) { const id = evento.target.closest("[data-eliminar-comunicado]")?.dataset.eliminarComunicado; if (!id) return; const confirmar = await Swal.fire({ icon: "warning", title: "Eliminar comunicado", text: "Dejará de mostrarse en todas las empresas donde fue publicado.", showCancelButton: true, confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar", confirmButtonColor: "#c62f40" }); if (!confirmar.isConfirmed) return; try { const documentos = comunicados.filter((a) => (a.grupoId || a.id) === id), batch = writeBatch(db); documentos.forEach((a) => batch.delete(doc(db, "anunciosEmpresa", a.id))); await batch.commit(); comunicados = comunicados.filter((a) => (a.grupoId || a.id) !== id); renderizar(); aviso("Comunicado eliminado."); } catch (error) { aviso(error.message || "No se pudo eliminar el comunicado.", true); } }
function destinoTexto(v) { return v === "ADMIN" ? "Administradores" : v === "MOVIL" ? "Móviles" : "Todos"; }
function milis(v) { return v?.toMillis?.() || Number(v?.seconds || 0) * 1000 || 0; }
function fechaVisible(v) { const [a, m, d] = String(v || "").slice(0, 10).split("-"); return a && m && d ? `${d}/${m}/${a}` : "Sin límite"; }
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function aviso(mensaje, error = false) { const caja = $("toastSuper"); caja.textContent = mensaje; caja.className = `toast show${error ? " error" : ""}`; setTimeout(() => caja.classList.remove("show"), 4500); }
