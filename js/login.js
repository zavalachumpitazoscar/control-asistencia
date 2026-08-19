import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const btnLogin = document.getElementById("btnLogin");
const toast = document.getElementById("toast");
const correoInput = document.getElementById("correo");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const SUPERADMIN_UID = "q9H2AzN2eIODDioC7auy92MpcHf2";
let ingresando = false;
let toastTimer;

function mostrarToast(tipo, mensaje) {
  clearTimeout(toastTimer);
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  requestAnimationFrame(() => toast.classList.add("mostrar"));
  toastTimer = setTimeout(() => toast.classList.remove("mostrar"), 4000);
}

function mostrarCarga() {
  btnLogin.disabled = true;
  btnLogin.classList.add("cargando");
  btnLogin.querySelector("span").textContent = "Verificando acceso";
}

function ocultarCarga() {
  btnLogin.disabled = false;
  btnLogin.classList.remove("cargando");
  btnLogin.querySelector("span").textContent = "Ingresar al sistema";
}

togglePassword.addEventListener("click", () => {
  const visible = passwordInput.type === "text";
  passwordInput.type = visible ? "password" : "text";
  togglePassword.setAttribute("aria-pressed", String(!visible));
  togglePassword.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  passwordInput.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (ingresando) return;

  const correo = correoInput.value.trim();
  const password = passwordInput.value;
  if (!correo || !password) {
    mostrarToast("error", "Completa el correo y la contraseña para continuar.");
    (!correo ? correoInput : passwordInput).focus();
    return;
  }
  if (!correoInput.validity.valid) {
    mostrarToast("error", "Ingresa un correo electrónico válido.");
    correoInput.focus();
    return;
  }

  ingresando = true;
  mostrarCarga();
  try {
    const credencial = await signInWithEmailAndPassword(auth, correo, password);
    const uid = credencial.user.uid;
    if (uid === SUPERADMIN_UID) {
      mostrarToast("exito", "Acceso general correcto. Abriendo superadministración.");
      setTimeout(() => { window.location.href = "superadmin.html"; }, 700);
      return;
    }
    const documento = await getDoc(doc(db, "usuarios", uid));
    if (!documento.exists()) {
      await signOut(auth);
      mostrarToast("error", "No encontramos información de la empresa asociada.");
      return;
    }

    const usuario = documento.data();
    if (usuario.estado !== "ACTIVO") {
      await signOut(auth);
      mostrarToast("info", "Esta cuenta se encuentra inactiva. Comunícate con el administrador.");
      return;
    }

    sessionStorage.setItem("empresaId", usuario.empresaId);
    sessionStorage.setItem("uid", usuario.uid || uid);
    sessionStorage.setItem("rol", usuario.rol);
    sessionStorage.setItem("principal", usuario.principal);
    sessionStorage.setItem("nombre", usuario.nombre || "");
    sessionStorage.setItem("correo", usuario.correo || correo);
    mostrarToast("exito", "Acceso correcto. Estamos preparando tu panel.");
    setTimeout(() => { window.location.href = "inicio.html"; }, 850);
  } catch (error) {
    console.error(error);
    const mensajes = {
      "auth/invalid-credential": "El correo o la contraseña son incorrectos.",
      "auth/wrong-password": "El correo o la contraseña son incorrectos.",
      "auth/user-not-found": "El correo o la contraseña son incorrectos.",
      "auth/invalid-email": "Ingresa un correo electrónico válido.",
      "auth/too-many-requests": "Se realizaron demasiados intentos. Espera un momento y vuelve a intentarlo.",
      "auth/network-request-failed": "No se pudo conectar. Revisa tu conexión a internet."
    };
    mostrarToast("error", mensajes[error.code] || "No se pudo iniciar sesión. Inténtalo nuevamente.");
  } finally {
    ingresando = false;
    ocultarCarga();
  }
});

