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
let geocercasPersonalizadas = [];
let control;
let paginaAccesos = 1;
let cantidadAccesos = 10;

export function iniciarAdministracionMarcacionMovil() {
  control?.abort();
  control = new AbortController();
  const opciones = { signal: control.signal };
  document.getElementById("buscarAccesoMovil")?.addEventListener("input", () => {
    paginaAccesos = 1;
    renderizar();
  }, opciones);
  document.getElementById("listaAccesosMoviles")?.addEventListener("click", procesarAccion, opciones);
  document.getElementById("cantidadAccesosMoviles")?.addEventListener("change", (evento) => {
    cantidadAccesos = Number(evento.target.value) || 10;
    paginaAccesos = 1;
    renderizar();
  }, opciones);
  document.getElementById("botonesPaginacionAccesos")?.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-pagina-acceso]");
    if (!boton || boton.disabled) return;
    paginaAccesos = Number(boton.dataset.paginaAcceso);
    renderizar();
    document.querySelector(".admin-movil-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, opciones);
  document.getElementById("listaGeocercasMoviles")?.addEventListener("click", procesarGeocerca, opciones);
  document.getElementById("btnNuevaGeocercaMovil")?.addEventListener("click", crearGeocercaPersonalizada, opciones);
  cargar();
}

async function cargar() {
  const empresaId = sessionStorage.getItem("empresaId");
  if (!empresaId) return;
  try {
    const resultados = await Promise.all(
      ["colaboradores", "accesosMoviles", "solicitudesDispositivoMovil", "sucursales", "geocercasMoviles"].map(
        (nombre) =>
          getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))),
      ),
    );
    [colaboradores, accesos, solicitudes, sucursales, geocercasPersonalizadas] = resultados.map((resultado) =>
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

  const totalPaginas = Math.max(1, Math.ceil(filas.length / cantidadAccesos));
  paginaAccesos = Math.min(Math.max(1, paginaAccesos), totalPaginas);
  const inicio = (paginaAccesos - 1) * cantidadAccesos;
  const filasPagina = filas.slice(inicio, inicio + cantidadAccesos);
  lista.innerHTML = filasPagina.length
    ? filasPagina
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
            ? modeloVisibleDispositivo(dispositivo) || dispositivo.descripcion
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
                ${acceso ? `<button data-limites="${colaborador.id}"><i class="bi bi-geo-alt"></i> Límites de marcación</button><button data-whatsapp="${colaborador.id}"><i class="bi bi-whatsapp"></i> Enviar acceso</button>${acceso.usuarioId&&correoAcceso?`<button data-restablecer="${colaborador.id}"><i class="bi bi-key"></i> Restablecer contraseña</button>`:""}<button data-cambiar-correo="${colaborador.id}"><i class="bi bi-envelope-at"></i> Cambiar correo</button><button data-copiar="${colaborador.id}">Copiar enlace</button><button class="peligro" data-revocar="${colaborador.id}">Revocar</button>` : ""}
              </div>
            </article>`;
        })
        .join("")
    : '<p class="movil-vacio">No se encontraron colaboradores.</p>';
  renderizarPaginacionAccesos(filas.length, inicio, filasPagina.length, totalPaginas);
}

function renderizarPaginacionAccesos(total, inicio, visibles, totalPaginas) {
  const pie = document.getElementById("paginacionAccesosMoviles");
  const resumen = document.getElementById("resumenPaginacionAccesos");
  const botones = document.getElementById("botonesPaginacionAccesos");
  const selector = document.getElementById("cantidadAccesosMoviles");
  if (!pie || !resumen || !botones) return;
  pie.hidden = total === 0;
  if (!total) return;
  if (selector) selector.value = String(cantidadAccesos);
  resumen.textContent = `Mostrando ${inicio + 1}–${inicio + visibles} de ${total}`;
  const paginas = paginasVisibles(paginaAccesos, totalPaginas);
  botones.innerHTML = `<button data-pagina-acceso="${paginaAccesos - 1}" ${paginaAccesos === 1 ? "disabled" : ""} aria-label="Página anterior"><i class="bi bi-chevron-left"></i></button>${paginas.map((pagina) => pagina === "…" ? `<span>…</span>` : `<button data-pagina-acceso="${pagina}" class="${pagina === paginaAccesos ? "activo" : ""}" ${pagina === paginaAccesos ? 'aria-current="page"' : ""}>${pagina}</button>`).join("")}<button data-pagina-acceso="${paginaAccesos + 1}" ${paginaAccesos === totalPaginas ? "disabled" : ""} aria-label="Página siguiente"><i class="bi bi-chevron-right"></i></button>`;
}

function paginasVisibles(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, indice) => indice + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (actual >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", actual - 1, actual, actual + 1, "…", total];
}

async function procesarAccion(evento) {
  const boton = evento.target.closest("button");
  if (!boton) return;
  try {
    if (boton.dataset.copiar) return copiarEnlace();
    if (boton.dataset.whatsapp) return enviarAccesoWhatsApp(boton.dataset.whatsapp);
    if (boton.dataset.verDispositivo) return verDispositivo(boton.dataset.verDispositivo);
    if (boton.dataset.limites) return configurarLimitesMarcacion(boton.dataset.limites);
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
  const modelo = modeloVisibleDispositivo(dispositivo);
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
        <div><dt>Modelo detectado</dt><dd>${html(modelo || "El navegador no lo informa")}${dispositivo.modeloTecnico && !String(modelo).includes(dispositivo.modeloTecnico) ? `<small>Código: ${html(dispositivo.modeloTecnico)}</small>` : ""}</dd></div>
        <div><dt>Plataforma</dt><dd>${html(dispositivo.plataforma || "No informada")}</dd></div>
        <div><dt>Pantalla</dt><dd>${html(dispositivo.pantalla || "No informada")}</dd></div>
        <div><dt>Zona horaria</dt><dd>${html(dispositivo.zonaHoraria || "No informada")}</dd></div>
        <div><dt>Idioma</dt><dd>${html(dispositivo.idioma || "No informado")}</dd></div>
        <div><dt>RAM aproximada / procesadores lógicos</dt><dd>${html(dispositivo.memoriaGB ? `Hasta ${dispositivo.memoriaGB} GB informados` : "No informada")} / ${html(dispositivo.nucleos || "No informados")}<small>Valores aproximados proporcionados por el navegador; no representan necesariamente la ficha técnica real.</small></dd></div>
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
  if (android?.[1] && !/^(K|Android)$/i.test(android[1].trim())) return android[1].trim();
  if (/iPhone/i.test(navegador)) return "Apple iPhone";
  if (/iPad/i.test(navegador)) return "Apple iPad";
  return "";
}

function modeloVisibleDispositivo(dispositivo = {}) {
  const informado = String(dispositivo.modelo || "").trim();
  if (informado && !/^(K|Android|Modelo no informado)$/i.test(informado)) return informado;
  const detectado = modeloDesdeNavegador(dispositivo.navegador);
  return detectado || "Modelo no informado por el navegador";
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
  const geocercasSucursales = sucursales
        .map(
          (sucursal) => `
          <div class="fila-geocerca" data-sucursal="${sucursal.id}">
            <div><strong>${html(sucursal.nombre)}</strong><p>Geocerca de sucursal · ${html(sucursal.direccion || "Sin dirección")}</p></div>
            <label>Latitud<input data-lat type="number" step="any" value="${html(sucursal.geocercaMovil?.latitud ?? "")}"></label>
            <label>Longitud<input data-lng type="number" step="any" value="${html(sucursal.geocercaMovil?.longitud ?? "")}"></label>
            <label>Radio (metros)<input data-radio type="number" min="20" max="5000" value="${html(sucursal.geocercaMovil?.radioMetros ?? 150)}"></label>
            <div class="geocerca-acciones"><button data-ubicacion-actual>Usar mi ubicación</button><button class="primario" data-guardar-geocerca>Guardar</button></div>
          </div>`,
        )
        .join("");
  const personalizadas = geocercasPersonalizadas.map((zona) => `
    <div class="fila-geocerca" data-geocerca="${zona.id}">
      <div><strong>${html(zona.nombre || "Geocerca personalizada")}</strong><p>Geocerca independiente</p></div>
      <label>Latitud<input data-lat type="number" step="any" value="${html(zona.latitud ?? "")}"></label>
      <label>Longitud<input data-lng type="number" step="any" value="${html(zona.longitud ?? "")}"></label>
      <label>Radio (metros)<input data-radio type="number" min="20" max="5000" value="${html(zona.radioMetros ?? 150)}"></label>
      <div class="geocerca-acciones"><button data-ubicacion-actual>Usar mi ubicación</button><button class="primario" data-guardar-geocerca>Guardar</button><button class="peligro" data-eliminar-geocerca>Eliminar</button></div>
    </div>`).join("");
  lista.innerHTML = geocercasSucursales + personalizadas
    || '<p class="movil-vacio">No existen geocercas. Puedes crear una ubicación independiente.</p>';
}

async function procesarGeocerca(evento) {
  const fila = evento.target.closest("[data-sucursal], [data-geocerca]");
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
  if (evento.target.closest("[data-eliminar-geocerca]")) {
    const confirmacion = await Swal.fire({
      title: "¿Eliminar geocerca?",
      text: "También dejará de aplicarse a los colaboradores que la tengan asignada.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmacion.isConfirmed) return;
    await deleteDoc(doc(db, "geocercasMoviles", fila.dataset.geocerca));
    await cargar();
    return;
  }
  if (!evento.target.closest("[data-guardar-geocerca]")) return;
  try {
    const valores = valoresGeocerca(fila);
    if (fila.dataset.sucursal) {
      await updateDoc(doc(db, "sucursales", fila.dataset.sucursal), {
        geocercaMovil: valores,
        actualizadoEn: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, "geocercasMoviles", fila.dataset.geocerca), {
        ...valores,
        actualizadoEn: serverTimestamp(),
      });
    }
    alerta("Perímetro guardado", "Geocerca actualizada.", "success");
    await cargar();
  } catch (error) {
    alerta("No se pudo guardar", mensaje(error), "error");
  }
}

function valoresGeocerca(fila) {
  const latitud = Number(fila.querySelector("[data-lat]").value);
  const longitud = Number(fila.querySelector("[data-lng]").value);
  const radioMetros = Number(fila.querySelector("[data-radio]").value);
  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) throw new Error("Ingresa una latitud válida.");
  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) throw new Error("Ingresa una longitud válida.");
  if (!Number.isFinite(radioMetros) || radioMetros < 20 || radioMetros > 5000) throw new Error("El radio debe estar entre 20 y 5000 metros.");
  return { latitud, longitud, radioMetros };
}

async function crearGeocercaPersonalizada() {
  const resultado = await Swal.fire({
    title: "Nueva geocerca",
    width: 650,
    showCancelButton: true,
    confirmButtonText: "Crear geocerca",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb",
    html: `<div class="form-geocerca-personalizada">
      <label>Nombre<input id="geocercaNombre" class="swal2-input" placeholder="Ej.: Almacén central"></label>
      <label>Latitud<input id="geocercaLat" class="swal2-input" type="number" step="any"></label>
      <label>Longitud<input id="geocercaLng" class="swal2-input" type="number" step="any"></label>
      <label>Radio en metros<input id="geocercaRadio" class="swal2-input" type="number" min="20" max="5000" value="150"></label>
      <button type="button" id="usarUbicacionNueva" class="swal2-confirm swal2-styled">Usar mi ubicación actual</button>
    </div>`,
    didOpen: () => {
      document.getElementById("usarUbicacionNueva")?.addEventListener("click", () => {
        navigator.geolocation.getCurrentPosition(
          (posicion) => {
            document.getElementById("geocercaLat").value = posicion.coords.latitude;
            document.getElementById("geocercaLng").value = posicion.coords.longitude;
          },
          () => Swal.showValidationMessage("No se pudo obtener la ubicación."),
          { enableHighAccuracy: true },
        );
      });
    },
    preConfirm: () => {
      const nombre = document.getElementById("geocercaNombre").value.trim();
      const latitud = Number(document.getElementById("geocercaLat").value);
      const longitud = Number(document.getElementById("geocercaLng").value);
      const radioMetros = Number(document.getElementById("geocercaRadio").value);
      if (!nombre) return Swal.showValidationMessage("Indica un nombre."), false;
      if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) return Swal.showValidationMessage("Latitud inválida."), false;
      if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) return Swal.showValidationMessage("Longitud inválida."), false;
      if (!Number.isFinite(radioMetros) || radioMetros < 20 || radioMetros > 5000) return Swal.showValidationMessage("El radio debe estar entre 20 y 5000 metros."), false;
      return { nombre, latitud, longitud, radioMetros };
    },
  });
  if (!resultado.isConfirmed) return;
  const empresaId = sessionStorage.getItem("empresaId");
  const referencia = doc(collection(db, "geocercasMoviles"));
  await setDoc(referencia, {
    ...resultado.value,
    empresaId,
    tipo: "PERSONALIZADA",
    activo: true,
    creadoEn: serverTimestamp(),
  });
  await cargar();
}

async function configurarLimitesMarcacion(colaboradorId) {
  const acceso = accesos.find((item) => item.colaboradorId === colaboradorId);
  if (!acceso) return;
  const asignadas = new Set(acceso.limitesMarcacion?.geocercas || []);
  const opcionesSucursal = sucursales.map((sucursal) => ({
    id: `SUCURSAL:${sucursal.id}`,
    nombre: `${sucursal.nombre} (sucursal)`,
    valida: geocercaValida(sucursal.geocercaMovil),
  }));
  const opcionesPersonalizadas = geocercasPersonalizadas.map((zona) => ({
    id: `PERSONALIZADA:${zona.id}`,
    nombre: `${zona.nombre} (personalizada)`,
    valida: geocercaValida(zona),
  }));
  const opciones = [...opcionesSucursal, ...opcionesPersonalizadas];
  const modoActual = acceso.limitesMarcacion?.modo === "GEOCERCAS" ? "GEOCERCAS" : "LIBRE";
  const resultado = await Swal.fire({
    title: "Límites de marcación",
    width: 720,
    showCancelButton: true,
    confirmButtonText: "Guardar límites",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb",
    html: `<div class="limites-marcacion-modal">
      <label><input type="radio" name="modoLimite" value="LIBRE" ${modoActual === "LIBRE" ? "checked" : ""}> <strong>Marcación libre</strong><small>Puede marcar desde cualquier ubicación. El GPS y la dirección se registran como evidencia.</small></label>
      <label><input type="radio" name="modoLimite" value="GEOCERCAS" ${modoActual === "GEOCERCAS" ? "checked" : ""}> <strong>Restringir por geocercas</strong><small>Solo podrá marcar dentro de al menos una ubicación seleccionada.</small></label>
      <div class="lista-limites-geocercas">${opciones.length ? opciones.map((opcion) => `<label class="${opcion.valida ? "" : "geocerca-invalida"}"><input type="checkbox" data-zona="${html(opcion.id)}" ${asignadas.has(opcion.id) ? "checked" : ""} ${opcion.valida ? "" : "disabled"}> ${html(opcion.nombre)}${opcion.valida ? "" : " — falta configurar coordenadas y radio"}</label>`).join("") : "<p>No existen geocercas configuradas.</p>"}</div>
    </div>`,
    preConfirm: () => {
      const modo = document.querySelector('input[name="modoLimite"]:checked')?.value || "LIBRE";
      const geocercas = [...document.querySelectorAll("[data-zona]:checked")].map((elemento) => elemento.dataset.zona);
      if (modo === "GEOCERCAS" && !geocercas.length) return Swal.showValidationMessage("Selecciona al menos una geocerca válida."), false;
      return { modo, geocercas };
    },
  });
  if (!resultado.isConfirmed) return;
  await updateDoc(doc(db, "accesosMoviles", colaboradorId), {
    limitesMarcacion: resultado.value,
    actualizadoEn: serverTimestamp(),
  });
  await alerta("Límites guardados", resultado.value.modo === "LIBRE" ? "El colaborador puede marcar desde cualquier ubicación." : "Las geocercas seleccionadas ya están activas.", "success");
  await cargar();
}

function geocercaValida(zona) {
  return Number.isFinite(Number(zona?.latitud))
    && Number.isFinite(Number(zona?.longitud))
    && Number(zona?.radioMetros) >= 20;
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
