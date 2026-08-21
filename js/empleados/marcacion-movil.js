import { auth, db } from "../firebase-config.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let colaboradores = [];
let accesos = [];
let solicitudes = [];
let sucursales = [];
let control;

export function iniciarAdministracionMarcacionMovil() {
  control?.abort();
  control = new AbortController();
  const opciones = { signal: control.signal };
  document.getElementById("buscarAccesoMovil")?.addEventListener("input", renderizar, opciones);
  document.getElementById("listaAccesosMoviles")?.addEventListener("click", procesarAccion, opciones);
  document.getElementById("listaGeocercasMoviles")?.addEventListener("click", procesarGeocerca, opciones);
  cargar();
}

async function cargar() {
  const empresaId = sessionStorage.getItem("empresaId");
  if (!empresaId) return;
  try {
    const resultados = await Promise.all(
      ["colaboradores", "accesosMoviles", "solicitudesDispositivoMovil", "sucursales"].map(
        (nombre) =>
          getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))),
      ),
    );
    [colaboradores, accesos, solicitudes, sucursales] = resultados.map((resultado) =>
      resultado.docs.map((documento) => ({ id: documento.id, ...documento.data() })),
    );
    renderizar();
    renderizarGeocercas();
    actualizarResumen();
  } catch (error) {
    alerta("No se pudo cargar", mensaje(error), "error");
  }
}

function renderizar() {
  const lista = document.getElementById("listaAccesosMoviles");
  if (!lista) return;
  const busqueda = normalizar(document.getElementById("buscarAccesoMovil")?.value);
  const accesoPorColaborador = new Map(accesos.map((a) => [a.colaboradorId, a]));
  const filas = colaboradores
    .filter((c) => c.estado !== "INACTIVO")
    .map((colaborador) => {
      const acceso = accesoPorColaborador.get(colaborador.id);
      const solicitud = solicitudes.find(
        (s) => s.colaboradorId === colaborador.id && s.estado === "PENDIENTE",
      );
      return {
        colaborador,
        acceso,
        solicitud,
        nombre: nombreColaborador(colaborador),
        dni: documentoColaborador(colaborador),
        correo: correoColaborador(colaborador),
      };
    })
    .filter(
      (fila) =>
        !busqueda ||
        normalizar(`${fila.nombre} ${fila.dni} ${fila.correo}`).includes(busqueda),
    );

  lista.innerHTML = filas.length
    ? filas
        .map(({ colaborador, acceso, solicitud, nombre, dni, correo }) => {
          const correoAcceso = acceso?.correo || correo;
          const estado = solicitud
            ? "PENDIENTE_AUTORIZACION"
            : acceso?.estado || "NO_HABILITADO";
          const etiqueta = solicitud
            ? "Dispositivo por autorizar"
            : acceso?.estado === "AUTORIZADO"
              ? "Dispositivo autorizado"
              : acceso?.usuarioId
                ? "Esperando autorización"
                : acceso
                  ? "Esperando registro"
                  : "No habilitado";
          const dispositivo = solicitud?.dispositivo || acceso?.dispositivo;
          const modelo = dispositivo
            ? dispositivo.modelo || modeloDesdeNavegador(dispositivo.navegador) || dispositivo.descripcion
            : null;
          const actividad = acceso ? estadoActividad(acceso.actualizadoEn) : null;
          return `
            <article class="fila-acceso-movil">
              <div class="avatar-acceso-movil">${html(iniciales(nombre))}</div>
              <div>
                <strong>${html(nombre)}</strong>
                <small>${html(dni)} · ${html(correoAcceso || "Sin correo")}</small>
                <em class="estado-acceso-movil ${html(estado)}">${html(etiqueta)}</em>
                ${solicitud ? `<small><i class="bi bi-phone"></i> ${html(solicitud.dispositivo?.descripcion || "Dispositivo móvil")}</small>` : ""}
                ${dispositivo ? `<small class="resumen-dispositivo-movil"><i class="bi bi-phone"></i> ${html(modelo || "Modelo no informado")} · ${html(dispositivo.plataforma || "Plataforma desconocida")}</small>` : ""}
                ${actividad ? `<small class="actividad-dispositivo ${actividad.activo ? "activo" : "inactivo"}"><i class="bi bi-circle-fill"></i> ${html(actividad.texto)}</small>` : ""}
              </div>
              <div class="acciones-acceso-movil">
                ${!acceso ? `<button class="primario" data-habilitar="${colaborador.id}">Habilitar</button>` : ""}
                ${dispositivo ? `<button data-ver-dispositivo="${solicitud?.id || colaborador.id}"><i class="bi bi-phone"></i> Ver dispositivo</button>` : ""}
                ${solicitud ? `<button class="primario" data-autorizar="${solicitud.id}">Autorizar dispositivo</button><button data-rechazar="${solicitud.id}">Rechazar</button>` : ""}
                ${acceso ? `<button data-whatsapp="${colaborador.id}"><i class="bi bi-whatsapp"></i> Enviar acceso</button>${acceso.usuarioId&&correoAcceso?`<button data-restablecer="${colaborador.id}"><i class="bi bi-key"></i> Restablecer contraseña</button>`:""}<button data-cambiar-correo="${colaborador.id}"><i class="bi bi-envelope-at"></i> Cambiar correo</button><button data-copiar="${colaborador.id}">Copiar enlace</button><button class="peligro" data-revocar="${colaborador.id}">Revocar</button>` : ""}
              </div>
            </article>`;
        })
        .join("")
    : '<p class="movil-vacio">No se encontraron colaboradores.</p>';
}

async function procesarAccion(evento) {
  const boton = evento.target.closest("button");
  if (!boton) return;
  try {
    if (boton.dataset.copiar) return copiarEnlace();
    if (boton.dataset.whatsapp) return enviarAccesoWhatsApp(boton.dataset.whatsapp);
    if (boton.dataset.verDispositivo) return verDispositivo(boton.dataset.verDispositivo);
    if (boton.dataset.habilitar) return await habilitar(boton.dataset.habilitar);
    if (boton.dataset.restablecer) return restablecerPasswordMovil(boton.dataset.restablecer);
    if (boton.dataset.cambiarCorreo) return cambiarCorreo(boton.dataset.cambiarCorreo);
    if (boton.dataset.autorizar) return autorizar(boton.dataset.autorizar);
    if (boton.dataset.rechazar) return rechazar(boton.dataset.rechazar);
    if (boton.dataset.revocar) return revocar(boton.dataset.revocar);
  } catch (error) {
    alerta("No se pudo completar", mensaje(error), "error");
  }
}

async function restablecerPasswordMovil(colaboradorId) {
  const acceso = accesos.find((a) => a.colaboradorId === colaboradorId);
  const empresaId = sessionStorage.getItem("empresaId");
  if (!acceso || acceso.empresaId !== empresaId) throw new Error("El acceso móvil no pertenece a esta empresa.");
  if (!acceso.usuarioId || !correoValido(acceso.correo)) {
    return alerta("Cuenta no registrada", "El colaborador todavía no ha creado su contraseña móvil.", "warning");
  }
  const confirmacion = await Swal.fire({
    title: "Restablecer contraseña móvil",
    html: `<p style="font-size:13px;color:#64748b">Firebase enviará un enlace de recuperación a:</p><strong>${html(acceso.correo)}</strong><p style="margin-top:12px;font-size:12px;color:#64748b">El dispositivo autorizado no será revocado.</p>`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Enviar correo",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb",
  });
  if (!confirmacion.isConfirmed) return;
  await sendPasswordResetEmail(auth, acceso.correo);
  await setDoc(doc(collection(db, "auditoriaSistema")), {
    empresaId,
    accion: "RESTABLECER_PASSWORD_MOVIL",
    colaboradorId,
    usuarioMovilUid: acceso.usuarioId,
    correo: acceso.correo,
    realizadoPor: auth.currentUser?.uid || null,
    fecha: serverTimestamp(),
  });
  await Swal.fire({
    title: "Correo enviado",
    text: "El colaborador recibirá el enlace para crear una nueva contraseña. Revisa también Spam o Correo no deseado.",
    icon: "success",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#2563eb",
  });
}

async function habilitar(colaboradorId) {
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  const correo = correoColaborador(colaborador);
  if (!correo) {
    return alerta("Correo obligatorio", "Registra el correo del colaborador.", "warning");
  }
  validarCorreoUnico(correo, colaboradorId);
  await setDoc(doc(db, "accesosMoviles", colaboradorId), {
    empresaId: sessionStorage.getItem("empresaId"),
    colaboradorId,
    correo,
    nombre: nombreColaborador(colaborador),
    dni: documentoColaborador(colaborador),
    sucursalId: colaborador.organizacion?.sucursalId || colaborador.sucursalId || colaborador.ubicacionOrganizacional?.sucursalId || null,
    areaId: colaborador.areaId || colaborador.ubicacionOrganizacional?.areaId || null,
    estado: "ESPERANDO_REGISTRO",
    usuarioId: null,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    actualizadoPor: auth.currentUser?.uid || null,
  });
  await copiarEnlace("Acceso habilitado");
}

async function cambiarCorreo(colaboradorId) {
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  const acceso = accesos.find((a) => a.colaboradorId === colaboradorId);
  if (!colaborador || !acceso) throw new Error("No se encontró el acceso móvil.");

  const resultado = await Swal.fire({
    title: "Cambiar correo móvil",
    html: `<p style="font-size:13px;color:#64748b">Correo actual: <strong>${html(acceso.correo)}</strong></p>`,
    input: "email",
    inputLabel: "Nuevo correo electrónico",
    inputPlaceholder: "colaborador@correo.com",
    showCancelButton: true,
    confirmButtonText: "Cambiar y desvincular",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb",
    inputValidator: (valor) => {
      const correo = normalizarCorreo(valor);
      if (!correoValido(correo)) return "Ingresa un correo válido.";
      if (correo === normalizarCorreo(acceso.correo)) return "El nuevo correo es igual al actual.";
      try {
        validarCorreoUnico(correo, colaboradorId);
      } catch (error) {
        return error.message;
      }
      return null;
    },
  });
  if (!resultado.isConfirmed) return;
  const nuevoCorreo = normalizarCorreo(resultado.value);

  const confirmacion = await Swal.fire({
    title: "¿Confirmar cambio de correo?",
    text: "El correo anterior y el celular autorizado perderán el acceso. El nuevo correo deberá crear su contraseña y solicitar autorización nuevamente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, cambiar correo",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
  });
  if (!confirmacion.isConfirmed) return;

  if (acceso.usuarioId) {
    await deleteDoc(doc(db, "usuariosMoviles", acceso.usuarioId));
  }
  const solicitudesAnteriores = solicitudes.filter((s) => s.colaboradorId === colaboradorId);
  await Promise.all(
    solicitudesAnteriores.map((solicitud) =>
      deleteDoc(doc(db, "solicitudesDispositivoMovil", solicitud.id)),
    ),
  );
  await updateDoc(doc(db, "colaboradores", colaboradorId), {
    "contacto.correo": nuevoCorreo,
    correo: nuevoCorreo,
    actualizadoEn: serverTimestamp(),
  });
  await updateDoc(doc(db, "accesosMoviles", colaboradorId), {
    correo: nuevoCorreo,
    usuarioId: null,
    estado: "ESPERANDO_REGISTRO",
    dispositivoAutorizadoId: null,
    dispositivo: null,
    autorizadoEn: null,
    actualizadoEn: serverTimestamp(),
    actualizadoPor: auth.currentUser?.uid || null,
  });
  const url = new URL("movil.html", location.href).href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {}
  await alerta(
    "Cambio completado",
    "El acceso anterior quedó bloqueado. El colaborador debe crear su contraseña con el nuevo correo y solicitar autorización.",
    "success",
  );
  await cargar();
}

function validarCorreoUnico(correo, colaboradorId) {
  const normalizado = normalizarCorreo(correo);
  const repetidoEnAccesos = accesos.some(
    (a) => a.colaboradorId !== colaboradorId && normalizarCorreo(a.correo) === normalizado,
  );
  const repetidoEnColaboradores = colaboradores.some(
    (c) => c.id !== colaboradorId && correoColaborador(c) === normalizado,
  );
  if (repetidoEnAccesos || repetidoEnColaboradores) {
    const duplicado = colaboradores.find(c => c.id !== colaboradorId && correoColaborador(c) === normalizado);
    const nombre = duplicado ? nombreColaborador(duplicado) : "otro acceso móvil";
    const documento = duplicado ? documentoColaborador(duplicado) : "sin documento disponible";
    throw new Error(`El correo ${normalizado} ya pertenece a ${nombre} (${documento}). Corrige el correo antes de habilitar el acceso móvil.`);
  }
}

async function verDispositivo(referencia) {
  const solicitud = solicitudes.find((item) => item.id === referencia);
  const acceso = accesos.find(
    (item) => item.colaboradorId === (solicitud?.colaboradorId || referencia),
  );
  const dispositivo = solicitud?.dispositivo || acceso?.dispositivo || {};
  const modelo = dispositivo.modelo || modeloDesdeNavegador(dispositivo.navegador);
  const estado = solicitud?.estado === "PENDIENTE"
    ? "Pendiente de autorización"
    : acceso?.estado === "AUTORIZADO"
      ? "Autorizado"
      : acceso?.estado || solicitud?.estado || "Sin estado";
  const actividad = acceso ? estadoActividad(acceso.actualizadoEn) : null;
  await Swal.fire({
    title: "Información del dispositivo",
    width: 680,
    confirmButtonText: "Cerrar",
    confirmButtonColor: "#2563eb",
    html: `<div class="detalle-dispositivo-modal">
      <div class="dispositivo-modal-cabecera"><i class="bi bi-phone"></i><span><strong>${html(modelo || dispositivo.descripcion || "Modelo no informado")}</strong><small>${html(estado)}</small></span></div>
      <dl>
        <div><dt>Descripción</dt><dd>${html(dispositivo.descripcion || "No informada")}</dd></div>
        <div><dt>Modelo</dt><dd>${html(modelo || "El navegador no lo informa")}</dd></div>
        <div><dt>Plataforma</dt><dd>${html(dispositivo.plataforma || "No informada")}</dd></div>
        <div><dt>Pantalla</dt><dd>${html(dispositivo.pantalla || "No informada")}</dd></div>
        <div><dt>Zona horaria</dt><dd>${html(dispositivo.zonaHoraria || "No informada")}</dd></div>
        <div><dt>Idioma</dt><dd>${html(dispositivo.idioma || "No informado")}</dd></div>
        <div><dt>Memoria / núcleos</dt><dd>${html(dispositivo.memoriaGB ? `${dispositivo.memoriaGB} GB` : "—")} / ${html(dispositivo.nucleos || "—")}</dd></div>
        <div><dt>Última actividad</dt><dd>${html(actividad?.texto || "Sin actividad registrada")}</dd></div>
        <div><dt>Solicitado</dt><dd>${html(formatearFechaHora(solicitud?.creadoEn))}</dd></div>
        <div><dt>Autorizado</dt><dd>${html(formatearFechaHora(acceso?.autorizadoEn))}</dd></div>
      </dl>
      <details><summary>Información del navegador</summary><p>${html(dispositivo.navegador || "No informada")}</p></details>
    </div>`,
  });
}

function estadoActividad(timestamp) {
  const fecha = timestamp?.toDate?.();
  if (!fecha) return { activo: false, texto: "Sin actividad registrada" };
  const minutos = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 60000));
  if (minutos <= 10) return { activo: true, texto: "Activo recientemente" };
  return { activo: false, texto: `Última actividad: ${formatearFechaHora(timestamp)}` };
}

function modeloDesdeNavegador(navegador = "") {
  const android = String(navegador).match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
  if (android?.[1]) return android[1].trim();
  if (/iPhone/i.test(navegador)) return "Apple iPhone";
  if (/iPad/i.test(navegador)) return "Apple iPad";
  return "";
}

function formatearFechaHora(timestamp) {
  const fecha = timestamp?.toDate?.();
  return fecha
    ? fecha.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
    : "No registrada";
}

async function autorizar(solicitudId) {
  const solicitud = solicitudes.find((s) => s.id === solicitudId);
  if (!solicitud) throw new Error("Solicitud no encontrada.");
  await updateDoc(doc(db, "accesosMoviles", solicitud.colaboradorId), {
    estado: "AUTORIZADO",
    dispositivoAutorizadoId: solicitud.dispositivoId,
    dispositivo: solicitud.dispositivo,
    autorizadoEn: serverTimestamp(),
    actualizadoPor: auth.currentUser?.uid || null,
  });
  await updateDoc(doc(db, "solicitudesDispositivoMovil", solicitud.id), {
    estado: "AUTORIZADO",
    resueltoEn: serverTimestamp(),
  });
  const colaborador = colaboradores.find((c) => c.id === solicitud.colaboradorId);
  const resultado = await Swal.fire({
    title: "Dispositivo autorizado",
    text: "El colaborador ya puede ingresar y marcar desde este dispositivo.",
    icon: "success",
    showCancelButton: true,
    confirmButtonText: "Enviar acceso por WhatsApp",
    cancelButtonText: "Cerrar",
    confirmButtonColor: "#16a34a",
  });
  if (resultado.isConfirmed && colaborador) enviarAccesoWhatsApp(colaborador.id);
  await cargar();
}

function telefonoColaborador(colaborador) {
  return String(colaborador?.contacto?.telefono || colaborador?.telefono || "").trim();
}

function telefonoWhatsApp(valor) {
  let numero = String(valor || "").replace(/\D/g, "");
  if (numero.startsWith("00")) numero = numero.slice(2);
  // Los celulares peruanos suelen guardarse con 9 dígitos. WhatsApp requiere 51.
  if (numero.length === 9) numero = `51${numero}`;
  return numero;
}

async function enviarAccesoWhatsApp(colaboradorId) {
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  if (!colaborador) throw new Error("No se encontró al colaborador.");
  const telefonoOriginal = telefonoColaborador(colaborador);
  const telefono = telefonoWhatsApp(telefonoOriginal);
  if (!telefono || telefono.length < 10) {
    return alerta(
      "Falta el teléfono",
      "Registra un número de celular válido en los datos del colaborador y vuelve a intentarlo.",
      "warning",
    );
  }
  const portal = new URL("movil.html", location.href).href;
  const nombre = nombreColaborador(colaborador);
  const mensaje = [
    `Hola ${nombre}, tu dispositivo fue autorizado para usar la marcación móvil.`,
    "Ingresa al portal con el correo habilitado por tu empresa:",
    portal,
    "Por seguridad, utiliza únicamente el dispositivo autorizado.",
  ].join("\n\n");
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function rechazar(solicitudId) {
  await updateDoc(doc(db, "solicitudesDispositivoMovil", solicitudId), {
    estado: "RECHAZADO",
    resueltoEn: serverTimestamp(),
  });
  await cargar();
}

async function revocar(colaboradorId) {
  const acceso = accesos.find((a) => a.colaboradorId === colaboradorId);
  const confirmacion = await Swal.fire({
    title: "¿Revocar acceso móvil?",
    text: "La cuenta y el dispositivo dejarán de poder marcar.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Revocar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
  });
  if (!confirmacion.isConfirmed) return;
  if (acceso?.usuarioId) await deleteDoc(doc(db, "usuariosMoviles", acceso.usuarioId));
  await Promise.all(
    solicitudes
      .filter((s) => s.colaboradorId === colaboradorId)
      .map((s) => deleteDoc(doc(db, "solicitudesDispositivoMovil", s.id))),
  );
  await deleteDoc(doc(db, "accesosMoviles", colaboradorId));
  await cargar();
}

async function copiarEnlace(titulo = "Enlace copiado") {
  const url = new URL("movil.html", location.href).href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {}
  await alerta(
    titulo,
    "Envía el enlace al colaborador para que cree su contraseña y solicite autorización del celular.",
    "success",
  );
  await cargar();
}

function renderizarGeocercas() {
  const lista = document.getElementById("listaGeocercasMoviles");
  if (!lista) return;
  lista.innerHTML = sucursales.length
    ? sucursales
        .map(
          (sucursal) => `
          <div class="fila-geocerca" data-sucursal="${sucursal.id}">
            <div><strong>${html(sucursal.nombre)}</strong><p>${html(sucursal.direccion || "Sin dirección")}</p></div>
            <label>Latitud<input data-lat type="number" step="any" value="${html(sucursal.geocercaMovil?.latitud ?? "")}"></label>
            <label>Longitud<input data-lng type="number" step="any" value="${html(sucursal.geocercaMovil?.longitud ?? "")}"></label>
            <label>Radio (metros)<input data-radio type="number" min="20" max="5000" value="${html(sucursal.geocercaMovil?.radioMetros ?? 150)}"></label>
            <div class="geocerca-acciones"><button data-ubicacion-actual>Usar mi ubicación</button><button class="primario" data-guardar-geocerca>Guardar</button></div>
          </div>`,
        )
        .join("")
    : '<p class="movil-vacio">No existen sucursales.</p>';
}

async function procesarGeocerca(evento) {
  const fila = evento.target.closest("[data-sucursal]");
  if (!fila) return;
  if (evento.target.closest("[data-ubicacion-actual]")) {
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        fila.querySelector("[data-lat]").value = posicion.coords.latitude;
        fila.querySelector("[data-lng]").value = posicion.coords.longitude;
      },
      () => alerta("Sin ubicación", "Autoriza la ubicación.", "warning"),
      { enableHighAccuracy: true },
    );
    return;
  }
  if (!evento.target.closest("[data-guardar-geocerca]")) return;
  try {
    await updateDoc(doc(db, "sucursales", fila.dataset.sucursal), {
      geocercaMovil: {
        latitud: Number(fila.querySelector("[data-lat]").value),
        longitud: Number(fila.querySelector("[data-lng]").value),
        radioMetros: Number(fila.querySelector("[data-radio]").value),
      },
      actualizadoEn: serverTimestamp(),
    });
    alerta("Perímetro guardado", "Geocerca actualizada.", "success");
  } catch (error) {
    alerta("No se pudo guardar", mensaje(error), "error");
  }
}

function actualizarResumen() {
  asignar("movilPendientes", solicitudes.filter((s) => s.estado === "PENDIENTE").length);
  asignar("movilAutorizados", accesos.filter((a) => a.estado === "AUTORIZADO").length);
  asignar(
    "movilSinHabilitar",
    Math.max(0, colaboradores.filter((c) => c.estado !== "INACTIVO").length - accesos.length),
  );
  asignar("movilObservaciones", 0);
}
function correoColaborador(colaborador) {
  return normalizarCorreo(colaborador?.contacto?.correo || colaborador?.correo || "");
}
function normalizarCorreo(correo) {
  return String(correo || "").trim().toLowerCase();
}
function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}
function nombreColaborador(colaborador) {
  return [
    colaborador?.datosPersonales?.nombres || colaborador?.nombres,
    colaborador?.datosPersonales?.apellidos || colaborador?.apellidos,
  ]
    .filter(Boolean)
    .join(" ") || "Colaborador";
}
function documentoColaborador(colaborador) {
  return colaborador?.documento?.numero || colaborador?.numeroDocumento || colaborador?.dni || "Sin DNI";
}
function iniciales(nombre) {
  return nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}
function normalizar(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function html(valor) {
  return String(valor ?? "").replace(
    /[&<>'"]/g,
    (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[caracter],
  );
}
function asignar(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor;
}
function mensaje(error) {
  return String(error?.message || "Error inesperado").replace(/^FirebaseError:\s*/, "");
}
function alerta(titulo, texto, icono) {
  return Swal.fire({ title: titulo, text: texto, icon: icono, confirmButtonColor: "#2563eb" });
}
