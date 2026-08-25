import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
let contexto = null;
let relojes = [];
let vinculos = [];

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
}

function empresaId() {
  return contexto?.empresa?.empresaId || contexto?.empresa?.id || "";
}

function serialValido(valor) {
  const serial = String(valor || "").trim().toUpperCase();
  return /^[A-Z0-9_-]{4,80}$/.test(serial) ? serial : "";
}

function idVinculo(serial, pin) {
  return encodeURIComponent(`${serial}__${pin}`);
}

function nombreColaborador(colaborador) {
  const datos = colaborador?.datosPersonales || {};
  return colaborador?.nombreCompleto || `${datos.nombres || ""} ${datos.apellidos || ""}`.trim() || colaborador?.nombre || colaborador?.id || "Colaborador";
}

function documentoColaborador(colaborador) {
  const documento = colaborador?.documento?.numero || colaborador?.dni || colaborador?.documento || "";
  return typeof documento === "string" || typeof documento === "number" ? String(documento).trim() : "";
}

function nombreSucursal(id) {
  return contexto?.sucursales?.find((sucursal) => sucursal.id === id)?.nombre || "Sin sucursal específica";
}

function fechaVisible(valor) {
  const fecha = valor?.toDate?.() || (valor ? new Date(valor) : null);
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Sin marcaciones recibidas";
}

function avisar(mensaje, error = false) {
  const toast = $("toastSuper");
  if (!toast) return;
  toast.textContent = mensaje;
  toast.className = `toast show${error ? " error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 4200);
}

async function auditar(tipo, detalle = {}) {
  await setDoc(doc(collection(db, "auditoriaSuperadmin")), { tipo, ...detalle, superadminUid: auth.currentUser?.uid || "", superadminCorreo: auth.currentUser?.email || "", fecha: serverTimestamp() });
}

function prepararSelectores() {
  if (!contexto) return;
  $("relojSucursal").innerHTML = '<option value="">Sin sucursal específica</option>' + contexto.sucursales.map((sucursal) => `<option value="${escapar(sucursal.id)}">${escapar(sucursal.nombre || sucursal.id)}</option>`).join("");
  $("vinculoColaborador").innerHTML = '<option value="">Selecciona un colaborador</option>' + contexto.colaboradores.filter((colaborador) => String(colaborador.estado || "ACTIVO").toUpperCase() === "ACTIVO").sort((a, b) => nombreColaborador(a).localeCompare(nombreColaborador(b), "es")).map((colaborador) => `<option value="${escapar(colaborador.id)}">${escapar(nombreColaborador(colaborador))} · ${escapar(documentoColaborador(colaborador) || "Sin documento")}</option>`).join("");
  actualizarSelectorRelojes();
}

function actualizarSelectorRelojes() {
  const actual = $("vinculoReloj")?.value || "";
  $("vinculoReloj").innerHTML = '<option value="">Selecciona un reloj</option>' + relojes.filter((reloj) => reloj.estado === "ACTIVO").map((reloj) => `<option value="${escapar(reloj.id)}">${escapar(reloj.nombre || reloj.id)} · ${escapar(reloj.id)}</option>`).join("");
  if (relojes.some((reloj) => reloj.id === actual && reloj.estado === "ACTIVO")) $("vinculoReloj").value = actual;
}

function renderizar() {
  $("listaRelojesBiometricos").innerHTML = relojes.length ? relojes.map((reloj) => `<article class="biometric-row"><div><b>${escapar(reloj.nombre || "Reloj ZKTeco")}</b><small>${escapar(reloj.modelo || "Modelo no indicado")} · Serie ${escapar(reloj.id)}</small><span>${escapar(nombreSucursal(reloj.sucursalId))} · Último evento: ${escapar(fechaVisible(reloj.ultimaMarcacionEn))}</span><em class="biometric-state ${reloj.estado === "ACTIVO" ? "" : "inactive"}">${escapar(reloj.estado || "INACTIVO")}</em></div><div><button data-cambiar-reloj="${escapar(reloj.id)}">${reloj.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button></div></article>`).join("") : '<div class="usage-empty">Todavía no hay relojes autorizados.</div>';
  $("listaVinculosReloj").innerHTML = vinculos.length ? vinculos.map((vinculo) => `<article class="biometric-row"><div><b>${escapar(vinculo.colaboradorNombre || vinculo.colaboradorId)}</b><small>PIN ${escapar(vinculo.pin)} · ${escapar(vinculo.relojNombre || vinculo.relojSerial)}</small><span>${escapar(vinculo.colaboradorDocumento || "Sin documento")}</span></div><div><button class="danger" data-eliminar-vinculo="${escapar(vinculo.id)}">Quitar</button></div></article>`).join("") : '<div class="usage-empty">Todavía no hay colaboradores vinculados.</div>';
  actualizarSelectorRelojes();
}

async function cargar() {
  const id = empresaId();
  if (!id) return;
  try {
    const [snapRelojes, snapVinculos] = await Promise.all([
      getDocs(query(collection(db, "relojesBiometricos"), where("empresaId", "==", id))),
      getDocs(query(collection(db, "vinculosReloj"), where("empresaId", "==", id))),
    ]);
    relojes = snapRelojes.docs.map((documento) => ({ id: documento.id, ...documento.data() })).sort((a, b) => String(a.nombre || a.id).localeCompare(String(b.nombre || b.id), "es"));
    vinculos = snapVinculos.docs.map((documento) => ({ id: documento.id, ...documento.data() })).sort((a, b) => String(a.colaboradorNombre || a.pin).localeCompare(String(b.colaboradorNombre || b.pin), "es"));
    renderizar();
  } catch (error) {
    console.error("No se cargaron los relojes:", error);
    avisar("No se pudieron cargar los relojes biométricos.", true);
  }
}

document.addEventListener("superadmin:empresa-abierta", (evento) => {
  contexto = evento.detail;
  relojes = [];
  vinculos = [];
  prepararSelectores();
  renderizar();
});

document.querySelector('[data-tab="relojes"]')?.addEventListener("click", cargar);
$("recargarRelojes")?.addEventListener("click", cargar);

$("formRelojBiometrico")?.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const idEmpresa = empresaId();
  const serial = serialValido($("relojSerial").value);
  const nombre = $("relojNombre").value.trim();
  const modelo = $("relojModelo").value.trim();
  if (!serial) return avisar("Revisa el número de serie del reloj.", true);
  if (!nombre || !modelo) return avisar("Completa el nombre y el modelo.", true);
  try {
    const referencia = doc(db, "relojesBiometricos", serial);
    const existente = await getDoc(referencia);
    if (existente.exists() && existente.data().empresaId !== idEmpresa) return avisar("Este número de serie ya pertenece a otra empresa.", true);
    await setDoc(referencia, { empresaId: idEmpresa, nombre, modelo, sucursalId: $("relojSucursal").value || null, estado: "ACTIVO", protocolo: "ZKTECO_ADMS", zonaHoraria: "America/Lima", creadoEn: existente.exists() ? existente.data().creadoEn || serverTimestamp() : serverTimestamp(), actualizadoEn: serverTimestamp(), actualizadoPor: auth.currentUser?.uid || "" }, { merge: true });
    await auditar("AUTORIZAR_RELOJ_ZKTECO", { empresaId: idEmpresa, relojSerial: serial, relojNombre: nombre, modelo });
    evento.currentTarget.reset();
    $("relojModelo").value = "FACE-T5";
    avisar("Reloj autorizado correctamente.");
    await cargar();
  } catch (error) {
    console.error(error);
    avisar("No se pudo autorizar el reloj.", true);
  }
});

$("formVinculoReloj")?.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const idEmpresa = empresaId();
  const serial = $("vinculoReloj").value;
  const pin = $("vinculoPin").value.trim();
  const colaborador = contexto?.colaboradores?.find((item) => item.id === $("vinculoColaborador").value);
  const reloj = relojes.find((item) => item.id === serial);
  if (!reloj || !pin || !colaborador) return avisar("Selecciona reloj, PIN y colaborador.", true);
  if (!/^[A-Za-z0-9_.-]{1,40}$/.test(pin)) return avisar("El PIN contiene caracteres no admitidos.", true);
  try {
    await setDoc(doc(db, "vinculosReloj", idVinculo(serial, pin)), { empresaId: idEmpresa, relojSerial: serial, relojNombre: reloj.nombre || serial, pin, colaboradorId: colaborador.id, colaboradorNombre: nombreColaborador(colaborador), colaboradorDocumento: documentoColaborador(colaborador) || null, sucursalId: reloj.sucursalId || null, estado: "ACTIVO", creadoEn: serverTimestamp(), creadoPor: auth.currentUser?.uid || "" }, { merge: true });
    await auditar("VINCULAR_PIN_RELOJ", { empresaId: idEmpresa, relojSerial: serial, pin, colaboradorId: colaborador.id });
    $("vinculoPin").value = "";
    avisar("PIN vinculado correctamente.");
    await cargar();
  } catch (error) {
    console.error(error);
    avisar("No se pudo guardar la vinculación.", true);
  }
});

$("listaRelojesBiometricos")?.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("[data-cambiar-reloj]");
  if (!boton) return;
  const reloj = relojes.find((item) => item.id === boton.dataset.cambiarReloj);
  if (!reloj) return;
  const nuevoEstado = reloj.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
  const confirmacion = await Swal.fire({ icon: "question", title: `${nuevoEstado === "ACTIVO" ? "Activar" : "Desactivar"} reloj`, text: nuevoEstado === "ACTIVO" ? "El receptor volverá a aceptar marcaciones de este dispositivo." : "El receptor rechazará nuevas marcaciones de este dispositivo.", showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar" });
  if (!confirmacion.isConfirmed) return;
  try {
    await updateDoc(doc(db, "relojesBiometricos", reloj.id), { estado: nuevoEstado, actualizadoEn: serverTimestamp(), actualizadoPor: auth.currentUser?.uid || "" });
    await auditar("CAMBIAR_ESTADO_RELOJ_ZKTECO", { empresaId: empresaId(), relojSerial: reloj.id, estado: nuevoEstado });
    await cargar();
  } catch (error) {
    console.error(error);
    avisar("No se pudo cambiar el estado del reloj.", true);
  }
});

$("listaVinculosReloj")?.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("[data-eliminar-vinculo]");
  if (!boton) return;
  const vinculo = vinculos.find((item) => item.id === boton.dataset.eliminarVinculo);
  if (!vinculo) return;
  const confirmacion = await Swal.fire({ icon: "warning", title: "Quitar vinculación", text: "Las siguientes marcaciones de este PIN quedarán pendientes hasta que vuelvas a vincularlo.", showCancelButton: true, confirmButtonText: "Quitar", cancelButtonText: "Cancelar", confirmButtonColor: "#d9394b" });
  if (!confirmacion.isConfirmed) return;
  try {
    await deleteDoc(doc(db, "vinculosReloj", vinculo.id));
    await auditar("ELIMINAR_VINCULO_RELOJ", { empresaId: empresaId(), relojSerial: vinculo.relojSerial, pin: vinculo.pin, colaboradorId: vinculo.colaboradorId });
    await cargar();
  } catch (error) {
    console.error(error);
    avisar("No se pudo quitar la vinculación.", true);
  }
});
