import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let perfil;
let acceso;
let ubicacion;
let horarioHoy = null;
let tiposPermitidos = ["ENTRADA", "SALIDA"];
let cargando = false;
let creandoCuenta = false;
let observadorUbicacion = null;
const dispositivoId = obtenerDispositivoId();

document.getElementById("ingresarMovil").onclick = ingresar;
document.getElementById("crearAccesoMovil").onclick = crearAcceso;
document.getElementById("solicitarDispositivoMovil").onclick = solicitarDispositivo;
document.getElementById("actualizarUbicacionMovil").onclick = obtenerUbicacion;
document.querySelectorAll("[data-salir-movil]").forEach(
  (boton) => (boton.onclick = () => signOut(auth)),
);
document.querySelector(".botones-marcacion").onclick = (evento) => {
  const boton = evento.target.closest("[data-tipo-marca]");
  if (boton) marcar(boton.dataset.tipoMarca, boton);
};

setInterval(actualizarReloj, 1000);
actualizarReloj();

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) {
    detenerUbicacion();
    mostrar("pantallaLogin");
    return;
  }
  // createUserWithEmailAndPassword dispara este observador antes de que
  // crearAcceso termine de vincular al colaborador. Evitamos que ambos
  // procesos intenten crear usuariosMoviles/{uid} al mismo tiempo.
  if (creandoCuenta) return;
  try {
    await cargarPortal(usuario);
  } catch (error) {
    mensajeLogin(limpiarError(error));
    await signOut(auth);
  }
});

async function crearAcceso() {
  const correo = valor("correoMovil").toLowerCase();
  const password = valor("passwordMovil");
  if (!correo || password.length < 6) {
    return mensajeLogin("Ingresa el correo habilitado y una contraseña de al menos 6 caracteres.");
  }
  cargando = true;
  creandoCuenta = true;
  try {
    const credencial = await createUserWithEmailAndPassword(auth, correo, password);
    const habilitado = await buscarAcceso(correo);
    if (!habilitado) {
      await deleteUser(credencial.user);
      throw new Error("Tu empresa todavía no habilitó este correo.");
    }
    await vincularUsuario(credencial.user, habilitado);
    await cargarPortal(credencial.user);
    await aviso(
      "Cuenta creada",
      "Tu contraseña quedó registrada. Ahora solicita la autorización de este celular.",
      "success",
    );
  } catch (error) {
    mensajeLogin(limpiarError(error));
  } finally {
    creandoCuenta = false;
    cargando = false;
  }
}

async function ingresar() {
  if (cargando) return;
  const correo = valor("correoMovil");
  const password = valor("passwordMovil");
  if (!correo || !password) return mensajeLogin("Ingresa correo y contraseña.");
  cargando = true;
  try {
    await signInWithEmailAndPassword(auth, correo, password);
  } catch {
    mensajeLogin("No se pudo ingresar. Revisa tus credenciales.");
  } finally {
    cargando = false;
  }
}

async function buscarAcceso(correo) {
  const resultado = await getDocs(
    query(collection(db, "accesosMoviles"), where("correo", "==", correo), limit(1)),
  );
  return resultado.empty
    ? null
    : { id: resultado.docs[0].id, ...resultado.docs[0].data() };
}

async function vincularUsuario(usuario, datosAcceso) {
  await setDoc(
    doc(db, "accesosMoviles", datosAcceso.id),
    {
      usuarioId: usuario.uid,
      estado: "ESPERANDO_DISPOSITIVO",
      actualizadoEn: serverTimestamp(),
    },
    { merge: true },
  );
  await crearPerfilMovil(usuario, datosAcceso);
}

async function crearPerfilMovil(usuario, datosAcceso) {
  await setDoc(doc(db, "usuariosMoviles", usuario.uid), {
    empresaId: datosAcceso.empresaId,
    colaboradorId: datosAcceso.colaboradorId,
    correo: datosAcceso.correo,
    nombre: datosAcceso.nombre,
    creadoEn: serverTimestamp(),
  });
}

async function cargarPortal(usuario) {
  acceso = await buscarAcceso(usuario.email.toLowerCase());
  if (!acceso) throw new Error("Tu empresa todavía no habilitó la marcación móvil.");
  if (!acceso.usuarioId) {
    await vincularUsuario(usuario, acceso);
    acceso.usuarioId = usuario.uid;
    acceso.estado = "ESPERANDO_DISPOSITIVO";
  } else if (acceso.usuarioId !== usuario.uid) {
    throw new Error("Este correo ya está vinculado a otra cuenta.");
  }

  // Recupera automáticamente cuentas que quedaron a medio vincular:
  // accesosMoviles ya tiene el UID, pero usuariosMoviles/{uid} no existe.
  const perfilMovilRef = doc(db, "usuariosMoviles", usuario.uid);
  const perfilMovilSnap = await getDoc(perfilMovilRef);
  if (!perfilMovilSnap.exists()) {
    await crearPerfilMovil(usuario, acceso);
  }
  perfil = { ...acceso, nombre: acceso.nombre || usuario.displayName || usuario.email };

  if (acceso.dispositivoAutorizadoId !== dispositivoId) {
    const solicitud = await getDoc(
      doc(db, "solicitudesDispositivoMovil", `${usuario.uid}_${dispositivoId}`),
    );
    const pendiente = solicitud.exists() && solicitud.data().estado === "PENDIENTE";
    document.getElementById("detalleDispositivoMovil").textContent = descripcionDispositivo();
    document.getElementById("textoPendienteMovil").textContent = pendiente
      ? "Solicitud enviada. Espera la autorización de tu empresa."
      : "Este celular aún no está autorizado.";
    document.getElementById("solicitarDispositivoMovil").hidden = pendiente;
    mostrar("pantallaPendiente");
    return;
  }

  horarioHoy = await obtenerHorarioDelDia();
  configurarBotonesHorario(horarioHoy);
  await pintarPortal();
  mostrar("pantallaMarcacion");
  obtenerUbicacion();
}

async function solicitarDispositivo() {
  const usuario = auth.currentUser;
  if (!usuario) return;
  try {
    await setDoc(
      doc(db, "solicitudesDispositivoMovil", `${usuario.uid}_${dispositivoId}`),
      {
        empresaId: acceso.empresaId,
        colaboradorId: acceso.colaboradorId,
        usuarioId: usuario.uid,
        dispositivoId,
        dispositivo: datosDispositivo(),
        estado: "PENDIENTE",
        creadoEn: serverTimestamp(),
      },
    );
    await cargarPortal(usuario);
  } catch (error) {
    aviso("No se pudo solicitar", limpiarError(error), "error");
  }
}

async function marcar(tipo, boton) {
  if (cargando) return;
  if (!ubicacion) {
    obtenerUbicacion();
    return aviso(
      "Esperando ubicación",
      "Activa la ubicación precisa y espera hasta que el sistema muestre “Ubicación obtenida”.",
      "warning",
    );
  }

  const confirmacion = await Swal.fire({
    title: `Marcar ${etiqueta(tipo)}`,
    text: "¿Deseas confirmar esta marcación con la huella o seguridad de tu celular?",
    icon: "question",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "Marcar con huella",
    denyButtonText: "Marcar directamente",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb",
  });
  if (confirmacion.isDismissed) return;

  cargando = true;
  boton.disabled = true;
  try {
    let validacionBiometrica = false;
    if (confirmacion.isConfirmed) {
      await validarBiometria();
      validacionBiometrica = true;
    }
    if (ubicacion.precisionMetros > 200) {
      throw new Error("La precisión GPS aún es insuficiente. Espera una mejor ubicación.");
    }
    const sucursal = acceso.sucursalId
      ? await getDoc(doc(db, "sucursales", acceso.sucursalId))
      : null;
    if (sucursal?.exists() && sucursal.data().geocercaMovil) {
      const geocerca = sucursal.data().geocercaMovil;
      const metros = distancia(
        ubicacion.latitud,
        ubicacion.longitud,
        geocerca.latitud,
        geocerca.longitud,
      );
      if (metros > Number(geocerca.radioMetros || 150)) {
        throw new Error(`Estás fuera del perímetro autorizado (${Math.round(metros)} m).`);
      }
    }
    const fecha = fechaLocal();
    await setDoc(doc(db, "marcaciones", `MOVIL_${acceso.colaboradorId}_${Date.now()}`), {
      empresaId: acceso.empresaId,
      colaboradorId: acceso.colaboradorId,
      dni: acceso.dni || null,
      fecha,
      tipo,
      origen: "MOVIL",
      dispositivoId,
      ubicacion,
      validacionBiometrica,
      fechaHora: serverTimestamp(),
      creadoEn: serverTimestamp(),
      usuarioId: auth.currentUser.uid,
    });
    await aviso("Marcación registrada", etiqueta(tipo), "success");
    await pintarPortal();
  } catch (error) {
    aviso("No se pudo marcar", limpiarError(error), "error");
  } finally {
    cargando = false;
    boton.disabled = false;
  }
}

async function validarBiometria() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("Este navegador no admite huella, rostro o PIN del dispositivo.");
  }
  const clave = `credencialBiometrica_${dispositivoId}`;
  const guardada = localStorage.getItem(clave);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  if (!guardada) {
    const usuarioId = crypto.getRandomValues(new Uint8Array(16));
    const credencial = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Control de asistencia" },
        user: {
          id: usuarioId,
          name: auth.currentUser.email,
          displayName: perfil.nombre,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    });
    if (!credencial) throw new Error("No se pudo registrar la seguridad del celular.");
    localStorage.setItem(clave, arrayBufferBase64(credencial.rawId));
    return;
  }

  const verificacion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        { id: base64ArrayBuffer(guardada), type: "public-key" },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!verificacion) throw new Error("No se confirmó la identidad.");
}

async function pintarPortal() {
  document.getElementById("nombreColaboradorMovil").textContent = perfil.nombre;
  document.getElementById("organizacionColaboradorMovil").textContent = horarioHoy
    ? `Horario: ${horarioHoy.nombre || "asignado"}`
    : "Sin horario asignado · Solo entrada y salida";

  const resultado = await getDocs(
    query(
      collection(db, "marcaciones"),
      where("empresaId", "==", acceso.empresaId),
      where("colaboradorId", "==", acceso.colaboradorId),
      where("fecha", "==", fechaLocal()),
    ),
  );
  const marcas = resultado.docs
    .map((documento) => documento.data())
    .sort((a, b) => (a.fechaHora?.seconds || 0) - (b.fechaHora?.seconds || 0));

  document.getElementById("historialMarcacionesMovil").innerHTML = marcas.length
    ? marcas
        .map(
          (marca) =>
            `<div class="marca-historial"><strong>${html(etiqueta(marca.tipo))}</strong><time>${marca.fechaHora?.toDate?.().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) || "Registrando…"}</time></div>`,
        )
        .join("")
    : "<p>Aún no existen marcaciones.</p>";

  const siguiente = tiposPermitidos.find(
    (tipo) => !marcas.some((marca) => marca.tipo === tipo),
  );
  document.querySelectorAll("[data-tipo-marca]").forEach((boton) => {
    const visible = tiposPermitidos.includes(boton.dataset.tipoMarca);
    boton.hidden = !visible;
    boton.disabled = !siguiente || boton.dataset.tipoMarca !== siguiente;
    boton.classList.toggle("siguiente", boton.dataset.tipoMarca === siguiente);
  });
}

async function obtenerHorarioDelDia() {
  const [asignacionesSnap, horariosSnap, excepcionesSnap] = await Promise.all([
    getDocs(query(collection(db, "asignacionesHorarios"), where("empresaId", "==", acceso.empresaId))),
    getDocs(query(collection(db, "horarios"), where("empresaId", "==", acceso.empresaId))),
    getDocs(query(collection(db, "excepcionesHorarios"), where("empresaId", "==", acceso.empresaId))),
  ]);
  const asignaciones = asignacionesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const horarios = new Map(
    horariosSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
  );
  const excepciones = excepcionesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const fecha = fechaLocal();
  let ids = [];

  asignaciones
    .filter(
      (a) =>
        a.estado !== "INACTIVO" &&
        Array.isArray(a.colaboradorIds) &&
        a.colaboradorIds.includes(acceso.colaboradorId),
    )
    .forEach((a) => ids.push(...horariosAsignadosEnFecha(a, fecha)));

  const excepcion = excepciones.find(
    (e) =>
      e.colaboradorId === acceso.colaboradorId &&
      e.fecha === fecha &&
      e.estado !== "INACTIVO",
  );
  if (excepcion?.tipo === "SIN_HORARIO") ids = [];
  if (excepcion?.tipo === "REEMPLAZAR") ids = excepcion.horarioIds || [];
  if (excepcion?.tipo === "AGREGAR") ids.push(...(excepcion.horarioIds || []));

  return [...new Set(ids)].map((id) => horarios.get(id)).find(Boolean) || null;
}

function horariosAsignadosEnFecha(asignacion, fecha) {
  if (asignacion.tipoAsignacion === "DIARIA") {
    return asignacion.fechaInicio === fecha ? [asignacion.horarioId].filter(Boolean) : [];
  }
  if (asignacion.tipoAsignacion === "MENSUAL") {
    return (asignacion.programacion || [])
      .filter((item) => item.fecha === fecha)
      .map((item) => item.horarioId)
      .filter(Boolean);
  }
  if (asignacion.tipoAsignacion !== "SEMANAL") return [];
  if (!asignacion.fechaInicio || !asignacion.fechaFin || fecha < asignacion.fechaInicio || fecha > asignacion.fechaFin) return [];
  const inicio = fechaObjeto(asignacion.fechaInicio);
  const seleccionada = fechaObjeto(fecha);
  const diferenciaDias = Math.floor((seleccionada - inicio) / 86400000);
  const numeroSemana = Math.floor(diferenciaDias / 7);
  const intervalo = Number(asignacion.intervaloSemanas || 1);
  const ciclo =
    Array.isArray(asignacion.cicloSemanal) && asignacion.cicloSemanal.length
      ? asignacion.cicloSemanal
      : [asignacion.programacionSemanal || {}];
  if (ciclo.length === 1 && numeroSemana % intervalo !== 0) return [];
  const nombres = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  let indice = 0;
  if (asignacion.reiniciarCicloCadaMes && ciclo.length > 1) {
    const primero = new Date(seleccionada.getFullYear(), seleccionada.getMonth(), 1);
    indice =
      Math.floor((seleccionada.getDate() - 1 + ((primero.getDay() + 6) % 7)) / 7) %
      ciclo.length;
  } else if (ciclo.length > 1) {
    indice = numeroSemana % ciclo.length;
  }
  const ids = ciclo[indice]?.[nombres[seleccionada.getDay()]];
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

function configurarBotonesHorario(horario) {
  const requiereRefrigerio =
    Boolean(horario?.refrigerio?.habilitado) &&
    String(horario?.refrigerio?.modo || "MARCACION").toUpperCase() === "MARCACION";
  tiposPermitidos = requiereRefrigerio
    ? ["ENTRADA", "INICIO_ALMUERZO", "FIN_ALMUERZO", "SALIDA"]
    : ["ENTRADA", "SALIDA"];
  const textos = {
    ENTRADA: horario?.entrada?.programada
      ? `Entrada · ${String(horario.entrada.programada).slice(0, 5)}`
      : "Entrada",
    INICIO_ALMUERZO: "Inicio de almuerzo",
    FIN_ALMUERZO: "Fin de almuerzo",
    SALIDA: horario?.salida?.programada
      ? `Salida · ${String(horario.salida.programada).slice(0, 5)}`
      : "Salida",
  };
  document.querySelectorAll("[data-tipo-marca]").forEach((boton) => {
    boton.hidden = !tiposPermitidos.includes(boton.dataset.tipoMarca);
    const texto = boton.querySelector("span");
    if (texto) texto.textContent = textos[boton.dataset.tipoMarca];
  });
}

async function obtenerUbicacion() {
  const estado = document.getElementById("estadoUbicacionMovil");
  const precision = document.getElementById("precisionUbicacionMovil");
  ubicacion = null;
  detenerUbicacion();
  if (!navigator.geolocation) {
    estado.textContent = "Ubicación no compatible";
    precision.textContent = "Este navegador no permite obtener el GPS.";
    return;
  }
  estado.textContent = "Buscando ubicación precisa…";
  precision.textContent = "Activa el GPS y espera unos segundos.";
  try {
    const permiso = await navigator.permissions?.query({ name: "geolocation" });
    if (permiso?.state === "denied") {
      estado.textContent = "Ubicación desactivada o bloqueada";
      precision.textContent = "Actívala en los permisos del navegador y vuelve a intentar.";
      return;
    }
    if (permiso?.state === "prompt") {
      estado.textContent = "Esperando autorización de ubicación…";
      precision.textContent = "Acepta el permiso de ubicación precisa.";
    }
  } catch {}

  observadorUbicacion = navigator.geolocation.watchPosition(
    (posicion) => {
      ubicacion = {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        precisionMetros: posicion.coords.accuracy,
        altitud: posicion.coords.altitude ?? null,
      };
      const metros = Math.round(posicion.coords.accuracy);
      estado.textContent =
        metros <= 200 ? "Ubicación obtenida" : "Ubicación detectada, mejorando precisión…";
      precision.textContent =
        metros <= 200
          ? `Precisión aproximada: ${metros} m`
          : `Precisión actual: ${metros} m. Espera unos segundos.`;
    },
    (error) => {
      ubicacion = null;
      if (error.code === 1) {
        estado.textContent = "Permiso de ubicación rechazado";
        precision.textContent = "Autoriza la ubicación en la configuración del navegador.";
      } else if (error.code === 2) {
        estado.textContent = "Ubicación desactivada";
        precision.textContent = "Activa el GPS; el sistema seguirá esperando una respuesta.";
      } else {
        estado.textContent = "La ubicación está tardando…";
        precision.textContent = "Mantén el GPS activo y vuelve a presionar el botón de ubicación.";
      }
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  );
}

function detenerUbicacion() {
  if (observadorUbicacion !== null) {
    navigator.geolocation.clearWatch(observadorUbicacion);
    observadorUbicacion = null;
  }
}

function obtenerDispositivoId() {
  let id = localStorage.getItem("dispositivoMarcacionMovil");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dispositivoMarcacionMovil", id);
  }
  return id;
}
function datosDispositivo() {
  return {
    descripcion: descripcionDispositivo(),
    plataforma: navigator.userAgentData?.platform || navigator.platform || "Desconocida",
    navegador: navigator.userAgent,
    zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
    pantalla: `${screen.width}x${screen.height}`,
  };
}
function descripcionDispositivo() {
  const tipo = navigator.userAgent.includes("Android")
    ? "Android"
    : navigator.userAgent.includes("iPhone")
      ? "iPhone"
      : "Navegador móvil";
  return `${navigator.userAgentData?.platform || navigator.platform || "Celular"} · ${tipo}`;
}
function fechaLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function fechaObjeto(valorFecha) {
  const [anio, mes, dia] = String(valorFecha).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}
function distancia(lat1, lon1, lat2, lon2) {
  const radio = 6371000;
  const x = ((lat2 - lat1) * Math.PI) / 180;
  const y = ((lon2 - lon1) * Math.PI) / 180;
  const calculo =
    Math.sin(x / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(y / 2) ** 2;
  return 2 * radio * Math.atan2(Math.sqrt(calculo), Math.sqrt(1 - calculo));
}
function arrayBufferBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function base64ArrayBuffer(valorBase64) {
  const base64 = valorBase64.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(relleno), (caracter) => caracter.charCodeAt(0));
}
function actualizarReloj() {
  const fecha = new Date();
  document.getElementById("horaOficialMovil").textContent = fecha.toLocaleTimeString("es-PE");
  document.getElementById("fechaOficialMovil").textContent = fecha.toLocaleDateString(
    "es-PE",
    { weekday: "long", day: "2-digit", month: "long", year: "numeric" },
  );
}
function mostrar(id) {
  ["pantallaLogin", "pantallaPendiente", "pantallaMarcacion"].forEach(
    (pantalla) => (document.getElementById(pantalla).hidden = pantalla !== id),
  );
}
function valor(id) {
  return document.getElementById(id).value.trim();
}
function etiqueta(tipo) {
  return {
    ENTRADA: "Entrada",
    INICIO_ALMUERZO: "Inicio de almuerzo",
    FIN_ALMUERZO: "Fin de almuerzo",
    SALIDA: "Salida",
  }[tipo] || tipo;
}
function mensajeLogin(mensaje, correcto = false) {
  const elemento = document.getElementById("mensajeLoginMovil");
  elemento.textContent = mensaje;
  elemento.style.color = correcto ? "#047857" : "#dc2626";
}
function limpiarError(error) {
  const mensaje = String(error?.message || "Error inesperado");
  if (
    mensaje.includes("Missing or insufficient permissions") ||
    mensaje.includes("permission-denied")
  ) {
    return "No se pudo vincular la cuenta. El administrador debe publicar las reglas actualizadas de Firestore.";
  }
  if (mensaje.includes("auth/email-already-in-use")) {
    return "Este correo ya tiene una contraseña registrada. Pulsa Ingresar. Si no la conoces, solicita al administrador reiniciar tu cuenta móvil.";
  }
  if (mensaje.includes("auth/requires-recent-login")) {
    return "Por seguridad, cierra sesión e ingresa nuevamente antes de continuar.";
  }
  return mensaje
    .replace(/^FirebaseError:\s*/, "")
    .replace(/Firebase:\s*/, "");
}
function aviso(titulo, texto, icono) {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: icono,
    confirmButtonColor: "#2563eb",
  });
}
function html(valorHtml) {
  return String(valorHtml ?? "").replace(
    /[&<>'"]/g,
    (caracter) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        caracter
      ],
  );
}
