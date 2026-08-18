import { auth, db } from "../firebase-config.js";
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
          return `
            <article class="fila-acceso-movil">
              <div class="avatar-acceso-movil">${html(iniciales(nombre))}</div>
              <div>
                <strong>${html(nombre)}</strong>
                <small>${html(dni)} · ${html(correoAcceso || "Sin correo")}</small>
                <em class="estado-acceso-movil ${html(estado)}">${html(etiqueta)}</em>
                ${solicitud ? `<small><i class="bi bi-phone"></i> ${html(solicitud.dispositivo?.descripcion || "Dispositivo móvil")}</small>` : ""}
              </div>
              <div class="acciones-acceso-movil">
                ${!acceso ? `<button class="primario" data-habilitar="${colaborador.id}">Habilitar</button>` : ""}
                ${solicitud ? `<button class="primario" data-autorizar="${solicitud.id}">Autorizar dispositivo</button><button data-rechazar="${solicitud.id}">Rechazar</button>` : ""}
                ${acceso ? `<button data-cambiar-correo="${colaborador.id}"><i class="bi bi-envelope-at"></i> Cambiar correo</button><button data-copiar="${colaborador.id}">Copiar enlace</button><button class="peligro" data-revocar="${colaborador.id}">Revocar</button>` : ""}
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
    if (boton.dataset.habilitar) return habilitar(boton.dataset.habilitar);
    if (boton.dataset.cambiarCorreo) return cambiarCorreo(boton.dataset.cambiarCorreo);
    if (boton.dataset.autorizar) return autorizar(boton.dataset.autorizar);
    if (boton.dataset.rechazar) return rechazar(boton.dataset.rechazar);
    if (boton.dataset.revocar) return revocar(boton.dataset.revocar);
  } catch (error) {
    alerta("No se pudo completar", mensaje(error), "error");
  }
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
    sucursalId: colaborador.sucursalId || colaborador.ubicacionOrganizacional?.sucursalId || null,
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
    text: "El correo anterior y el celular autorizado perderán el acceso. El nuevo correo deberá crear su cuenta, validarse y solicitar autorización nuevamente.",
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
    "El acceso anterior quedó bloqueado. El colaborador debe crear o recuperar su cuenta con el nuevo correo.",
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
    throw new Error("Ese correo ya pertenece a otro colaborador.");
  }
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
  await cargar();
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
    "Envía el enlace al colaborador para que cree su contraseña y valide su correo.",
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
