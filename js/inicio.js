import { auth } from "./firebase-config.js";

import { db } from "./firebase-config.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    updateEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
}
from
"https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
onAuthStateChanged,
signOut
}
from
"https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { iniciarCompañia } from "./compañia.js?v=20260825-1";
import { iniciarEmpleados } from "./empleados.js?v=20260826-3";
import { iniciarRelojes } from "./relojes.js?v=20260827-6";
import { iniciarAsistencia } from "./asistencia.js?v=20260827-1";
import { iniciarAuditoria, iniciarMonitorAuditoriaGlobal } from "./auditoria.js?v=20260825-2";
import { iniciarDashboard } from "./dashboard.js?v=20260825-3";
import { iniciarConfiguracion, aplicarAparienciaGuardada, obtenerAparienciaGuardada } from "./configuracion.js?v=20260814-1";
import { iniciarManual, abrirManual } from "./manual.js?v=20260824-3";
import { iniciarCentroControl, programarCierreAutomatico } from "./centro-control.js?v=20260825-2";
import { iniciarAnunciosGlobales } from "./anuncios-globales.js?v=20260825-1";
import { iniciarSeguimientoUsoSistema, cerrarSeguimientoUsoSistema } from "./seguimiento-uso-sistema.js?v=20260822-2";
import { mostrarBloqueoSuscripcion, obtenerBloqueoSuscripcion } from "./suscripcion-acceso.js?v=20260825-1";

aplicarAparienciaGuardada();
iniciarManual();
iniciarAnunciosGlobales();

const sidebar = document.querySelector(".sidebar");

const botonMenu = document.querySelector(".btn-menu");

const botones = document.querySelectorAll(".item");

const contenedor = document.getElementById("contenedorVista");

let escuchasVistaActiva = [];
window.registrarEscuchaVista = function(detener){
    if(typeof detener === "function") escuchasVistaActiva.push(detener);
    return detener;
};
function detenerEscuchasVistaActiva(){
    const escuchas = escuchasVistaActiva;
    escuchasVistaActiva = [];
    escuchas.forEach(detener=>{
        try{ detener(); }
        catch(error){ console.warn("No se pudo cerrar una escucha de la vista:",error); }
    });
}
window.detenerEscuchasVistaActiva = detenerEscuchasVistaActiva;

let secuenciaCargaVista = 0;
function programarAuditoriaEnSegundoPlano(usuario){
    const iniciar = ()=>Promise.resolve(iniciarMonitorAuditoriaGlobal(usuario))
        .catch(error=>console.warn("La auditoría en segundo plano no pudo iniciar:",error));
    if("requestIdleCallback" in window) window.requestIdleCallback(iniciar,{ timeout:3000 });
    else setTimeout(iniciar,1200);
}

const titulo = document.querySelector(".topbar h1");

const overlay = document.querySelector(".overlay");

const contenidoPrincipal = document.querySelector(".contenido");

const topbar = document.querySelector(".topbar");

const sincronizacionInicial = document.getElementById("sincronizacionInicial");

function actualizarSincronizacion(mensaje){
    const texto=sincronizacionInicial?.querySelector("p");
    if(texto)texto.textContent=mensaje;
}

function finalizarSincronizacion(){
    if(!sincronizacionInicial)return;
    sincronizacionInicial.setAttribute("aria-busy","false");
    sincronizacionInicial.classList.add("oculta");
    setTimeout(()=>sincronizacionInicial.remove(),350);
}

const ANCHO_MENU_MOVIL = 1024;

// Tamaño global de todos los módulos cargados en el sistema.
const tamanosSistemaPermitidos = ["pequeno", "mediano", "grande", "muy-grande"];
const selectorTamanoGlobal = document.querySelector(".selector-tamano-global");
const disparadorTamanoGlobal = document.querySelector(".selector-tamano-global-disparador");

function aplicarTamanoSistema(tamano){
    const valor = tamanosSistemaPermitidos.includes(tamano) ? tamano : "mediano";
    document.body.dataset.tamanoSistema = valor;
    localStorage.setItem("tamanoSistema", valor);
    document.querySelectorAll("[data-tamano-sistema]").forEach(boton=>{
        const activo = boton.dataset.tamanoSistema === valor;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));
    });
    const etiquetas = { pequeno:"Pequeño", mediano:"Mediano", grande:"Grande", "muy-grande":"Muy grande" };
    const texto = disparadorTamanoGlobal?.querySelector("span");
    if(texto) texto.textContent = `Vista: ${etiquetas[valor]}`;
}

document.querySelectorAll("[data-tamano-sistema]").forEach(boton=>{
    boton.addEventListener("click", evento=>{
        evento.stopPropagation();
        aplicarTamanoSistema(boton.dataset.tamanoSistema);
        selectorTamanoGlobal?.classList.remove("abierto");
    });
});
disparadorTamanoGlobal?.addEventListener("click", evento=>{
    evento.stopPropagation();
    selectorTamanoGlobal?.classList.toggle("abierto");
});
document.addEventListener("click", ()=>selectorTamanoGlobal?.classList.remove("abierto"));

aplicarTamanoSistema(
    localStorage.getItem("tamanoSistema") ||
    localStorage.getItem("tamanoDashboard") ||
    "mediano"
);

// Efecto visual de la barra superior al desplazarse.
let actualizacionTopbarPendiente = false;

function actualizarEstadoTopbar(){

    if(!contenidoPrincipal || !topbar) return;

    topbar.classList.toggle(
        "en-desplazamiento",
        contenidoPrincipal.scrollTop > 18
    );

    actualizacionTopbarPendiente = false;

}

if(contenidoPrincipal && topbar){

    contenidoPrincipal.addEventListener("scroll",()=>{

        if(actualizacionTopbarPendiente) return;

        actualizacionTopbarPendiente = true;

        requestAnimationFrame(actualizarEstadoTopbar);

    },{ passive:true });

    actualizarEstadoTopbar();

}

// Etiquetas accesibles y ayudas al pasar el cursor cuando el menú está reducido.
botones.forEach(btn => {
    const etiqueta = btn.textContent.trim();
    btn.setAttribute("aria-label", etiqueta);
    btn.title = etiqueta;
});

// Ayuda táctil: al mantener presionado un acceso móvil muestra su nombre.
const tooltipNavegacionMovil = document.createElement("div");
tooltipNavegacionMovil.className = "tooltip-navegacion-movil";
tooltipNavegacionMovil.setAttribute("role", "tooltip");
document.body.appendChild(tooltipNavegacionMovil);

let temporizadorTooltipMovil = null;
let temporizadorOcultarTooltipMovil = null;

function mostrarTooltipMovil(elemento){
    if(window.innerWidth > 600) return;
    const etiqueta = elemento.getAttribute("aria-label") || elemento.textContent.trim();
    tooltipNavegacionMovil.textContent = etiqueta;
    tooltipNavegacionMovil.classList.add("mostrar");
    clearTimeout(temporizadorOcultarTooltipMovil);
}

function ocultarTooltipMovil(){
    clearTimeout(temporizadorTooltipMovil);
    temporizadorOcultarTooltipMovil = setTimeout(()=>tooltipNavegacionMovil.classList.remove("mostrar"), 180);
}

[...botones, document.querySelector(".salir")].filter(Boolean).forEach(elemento=>{
    const etiqueta = elemento.classList.contains("salir") ? "Cerrar sesión" : elemento.getAttribute("aria-label");
    elemento.setAttribute("aria-label", etiqueta);
    elemento.addEventListener("pointerdown", ()=>{
        clearTimeout(temporizadorTooltipMovil);
        temporizadorTooltipMovil = setTimeout(()=>mostrarTooltipMovil(elemento), 380);
    });
    elemento.addEventListener("pointerup", ocultarTooltipMovil);
    elemento.addEventListener("pointercancel", ocultarTooltipMovil);
    elemento.addEventListener("pointerleave", ocultarTooltipMovil);
});

// Recupera la preferencia del menú solamente para pantallas de escritorio.
if(
    window.innerWidth > ANCHO_MENU_MOVIL &&
    localStorage.getItem("sidebarColapsado") === "true"
){
    document.body.classList.add("sidebar-colapsado");
}


// ============================
// MENÚ USUARIO
// ============================

const btnUsuario =
document.getElementById("btnUsuario");

const menuUsuario =
document.getElementById("menuUsuario");

function reiniciarValidacionPassword(){

    document
    .querySelectorAll(".regla")
    .forEach(regla=>{

        regla.classList.remove("ok","error");

        regla.innerHTML =
        "✖ " + regla.textContent.substring(2);

    });

    document.getElementById("perfilPassword").value="";

}

if(btnUsuario && menuUsuario){

    btnUsuario.addEventListener("click",(e)=>{

    e.stopPropagation();

    const abierto =
    menuUsuario.classList.toggle("mostrar");

    if(abierto){

        reiniciarValidacionPassword();

    }

});

document.addEventListener("click",(e)=>{

    if(
        !menuUsuario.contains(e.target) &&
        !btnUsuario.contains(e.target)
    ){

        menuUsuario.classList.remove("mostrar");

        reiniciarValidacionPassword();

    }

});

}


const inputPassword =
document.getElementById("perfilPassword");

if(inputPassword){

inputPassword.addEventListener("input",()=>{

const valor =
inputPassword.value;

actualizarRegla(
"reglaLongitud",
valor.length>=8
);

actualizarRegla(
"reglaMayuscula",
/[A-Z]/.test(valor)
);

actualizarRegla(
"reglaMinuscula",
/[a-z]/.test(valor)
);

actualizarRegla(
"reglaEspecial",
/[.!@#$%]/.test(valor)
);

});

}



// ============================
// PROTEGER PAGINA
// ============================


onAuthStateChanged(auth, async(usuario)=>{

    if(!usuario){

        window.location.href="index.html";

        return;

    }

    try{
        actualizarSincronizacion("Validando tu cuenta y los permisos de la empresa…");
        const perfilActual = await cargarPerfilUsuario(usuario);
        const empresaIdActual = sessionStorage.getItem("empresaId") || perfilActual?.empresaId;
        await configurarAccesoRelojes(empresaIdActual);
        const bloqueoSuscripcion = await obtenerBloqueoSuscripcion(empresaIdActual);
        if(bloqueoSuscripcion){
            finalizarSincronizacion();
            await mostrarBloqueoSuscripcion(bloqueoSuscripcion);
            await signOut(auth);
            return;
        }
        actualizarSincronizacion("Sincronizando la información necesaria para comenzar…");
        await iniciarSeguimientoUsoSistema(usuario,sessionStorage.getItem("empresaId"));
        programarCierreAutomatico();
        const vistaInicial = obtenerAparienciaGuardada().vistaInicial || "dashboard";
        botones.forEach((boton)=>boton.classList.toggle("activo",boton.dataset.vista===vistaInicial));
        const botonInicial = document.querySelector(`.item[data-vista="${vistaInicial}"]`);
        if(botonInicial) titulo.textContent = botonInicial.innerText;
        actualizarSincronizacion("Preparando el panel y sus registros…");
        await cargarVista(vistaInicial);
        programarAuditoriaEnSegundoPlano(usuario);
    }catch(error){
        console.error("No se pudo completar la sincronización inicial:",error);
        await Swal.fire({icon:"error",title:"No se pudo sincronizar la información",text:"Vuelve a iniciar sesión o recarga la página para intentarlo nuevamente.",confirmButtonColor:"#2563eb"});
    }finally{
        finalizarSincronizacion();
    }

});





// ============================
// MENU LATERAL
// ============================


botonMenu.addEventListener("click", () => {

    if(window.innerWidth > ANCHO_MENU_MOVIL){

        const colapsado =
        document.body.classList.toggle("sidebar-colapsado");

        localStorage.setItem(
            "sidebarColapsado",
            String(colapsado)
        );

        sidebar.classList.remove("mostrar");
        overlay.classList.remove("mostrar");

        return;

    }

    sidebar.classList.toggle("mostrar");
    overlay.classList.toggle("mostrar");

});

window.addEventListener("resize",()=>{

    if(window.innerWidth > ANCHO_MENU_MOVIL){

        sidebar.classList.remove("mostrar");
        overlay.classList.remove("mostrar");

    }

});

overlay.addEventListener("click", () => {

    sidebar.classList.remove("mostrar");
    overlay.classList.remove("mostrar");

});




botones.forEach(btn=>{


btn.addEventListener(
"click",
()=>{


botones.forEach(b=>
b.classList.remove(
"activo"
)
);



btn.classList.add(
"activo"
);



titulo.textContent =
btn.innerText;



cargarVista(
btn.dataset.vista
);



// cerrar menú en celular

sidebar.classList.remove("mostrar");
overlay.classList.remove("mostrar");



});


});


// ============================
// CERRAR SESIÓN
// ============================


document
.querySelector(".salir")
.addEventListener(
"click",
async()=>{


await cerrarSeguimientoUsoSistema();


await signOut(auth);


window.location.href =
"index.html";


});


async function cargarVista(
    vista
){

    const secuenciaActual = ++secuenciaCargaVista;
    detenerEscuchasVistaActiva();
    document.querySelector("body > #modalDetalleAuditoria")?.remove();

    try{

        const tabsEmpleados = [

            "colaboradores",

            "horarios",

            "permisos",

            "feriados",

            "marcacion-movil"

        ];


        const esTabEmpleados =
            tabsEmpleados.includes(
                vista
            );


        /*
            Las pestañas internas primero cargan
            la vista principal de Empleados.
        */

        const vistaPrincipal =
            esTabEmpleados
            ?
            "empleados"
            :
            vista;


        const tabInicial =
            esTabEmpleados
            ?
            vista
            :
            "colaboradores";


        const ruta =
            `vistas/${vistaPrincipal}.html?v=20260820-5`;


        const respuesta =
            await fetch(
                ruta
            );


        if(!respuesta.ok){

            throw new Error(
                `No se pudo cargar ${ruta}. Estado HTTP: ${respuesta.status}`
            );

        }


        const html =
            await respuesta.text();

        if(secuenciaActual !== secuenciaCargaVista) return;

        contenedor.innerHTML =
            html;


        switch(vistaPrincipal){

            case "dashboard":

                await iniciarDashboard();

            break;

            case "compañia":

                await iniciarCompañia();

            break;


            case "empleados":

                await iniciarEmpleados(
                    tabInicial
                );

            break;


            case "asistencia":

                await iniciarAsistencia();

            break;

            case "relojes":

                await iniciarRelojes();

            break;

            case "auditoria":

                iniciarAuditoria();

            break;

            case "centro-control":

                iniciarCentroControl();

            break;

            case "configuracion":

                iniciarConfiguracion({ abrirManual });

            break;

        }

    }
    catch(error){

        contenedor.innerHTML =
        `
            <h2>
                Vista no encontrada
            </h2>
        `;


        console.error(
            error
        );

    }

}




document.getElementById("btnManualGlobal")?.addEventListener("click", abrirManual);


async function configurarAccesoRelojes(empresaId){
    const boton = document.getElementById("menuRelojesCliente");
    if(!boton || !empresaId){ if(boton) boton.hidden = true; return; }
    try{
        const resultado = await getDocs(query(collection(db,"relojesBiometricos"),where("empresaId","==",empresaId)));
        boton.hidden = resultado.empty;
    }catch(error){
        console.warn("No se pudo validar el acceso a Relojes:",error);
        boton.hidden = true;
    }
}

async function cargarPerfilUsuario(usuario){

    const referencia =
    doc(
        db,
        "usuarios",
        usuario.uid
    );

    const documento =
    await getDoc(referencia);

    if(!documento.exists()) return null;

    const datos =
    documento.data();

    document.getElementById("nombreUsuarioTop").textContent =
    datos.nombre || "";

    document.getElementById("nombreUsuarioMenu").textContent =
    datos.nombre || "";

    document.getElementById("correoUsuarioMenu").textContent =
    datos.correo || datos.correoLogin || usuario.email;

    document.getElementById("perfilNombre").value =
    datos.nombre || "";

    document.getElementById("perfilCorreo").value =
    datos.correo || datos.correoLogin || usuario.email;

    document.querySelector(".badge-rol").textContent =
    datos.rol || "";

    sessionStorage.setItem("rolUsuarioDashboard", datos.rol || "Administrador");
    const organizacionUsuario = datos.organizacion || {};
    [["sucursalUsuarioDashboard", organizacionUsuario.sucursal || datos.sucursal], ["areaUsuarioDashboard", organizacionUsuario.area || datos.area], ["subareaUsuarioDashboard", organizacionUsuario.subarea || datos.subarea]].forEach(([clave, valor]) => {
        const texto = valor && typeof valor === "object" ? (valor.nombre || valor.id || "") : (valor || "");
        if (texto) sessionStorage.setItem(clave, texto); else sessionStorage.removeItem(clave);
    });
    document.dispatchEvent(new CustomEvent("perfilUsuarioActualizado"));
    return datos;
}


document
.getElementById("guardarPerfil")
.addEventListener(
"click",
async()=>{

    const usuario =
    auth.currentUser;

    if(!usuario){

        return;

    }

    const nombre =
    document
    .getElementById("perfilNombre")
    .value
    .trim();

    const correo =
    document
    .getElementById("perfilCorreo")
    .value
    .trim();

    const passwordActual =
    document
    .getElementById("perfilPasswordActual")
    .value
    .trim();

const passwordNueva =
document
.getElementById("perfilPassword")
.value.trim();

const cambioNombre =
nombre !== document.getElementById("nombreUsuarioTop").textContent;

const cambioCorreo =
correo !== usuario.email;

const cambioPassword =
passwordNueva !== "";

if(passwordNueva !== ""){

    const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[.!@#$%])(?=.{8,})/;

    if(!regex.test(passwordNueva)){

Swal.fire({
    icon: "warning",
    title: "Contraseña no válida",
    html: `
        La contraseña debe contener:<br><br>
        • Mínimo <b>8 caracteres</b><br>
        • Una <b>letra mayúscula</b><br>
        • Una <b>letra minúscula</b><br>
        • Un <b>carácter especial</b> (. ! @ # $ %)
    `,
    confirmButtonColor: "#f59e0b"
});

        return;

    }

}

    if(

    (correo !== usuario.email || passwordNueva !== "") &&

    passwordActual === ""

){

Swal.fire({
    icon: "warning",
    title: "Contraseña requerida",
    text: "Debes ingresar tu contraseña actual para realizar este cambio.",
    confirmButtonColor: "#f59e0b"
});
    return;

}


    try{

        // Si cambia correo o contraseña,
        // Firebase exige reautenticación.

        if(
            correo !== usuario.email ||
            passwordNueva !== ""
        ){

            const credencial =
            EmailAuthProvider.credential(
                usuario.email,
                passwordActual
            );

            await reauthenticateWithCredential(
                usuario,
                credencial
            );

        }

        // Actualizar correo

        if(correo !== usuario.email){

            await updateEmail(
                usuario,
                correo
            );

        }

        // Actualizar contraseña

        if(passwordNueva !== ""){

            await updatePassword(
                usuario,
                passwordNueva
            );

        }

        // Actualizar Firestore

        await updateDoc(

            doc(
                db,
                "usuarios",
                usuario.uid
            ),

            {

                nombre,

                correo

            }

        );

        // Actualizar pantalla

        document
        .getElementById("nombreUsuarioTop")
        .textContent = nombre;

        document
        .getElementById("nombreUsuarioMenu")
        .textContent = nombre;

        document
        .getElementById("correoUsuarioMenu")
        .textContent = correo;

        // Limpiar contraseñas

        document
        .getElementById("perfilPassword")
        .value = "";

        document
        .getElementById("perfilPasswordActual")
        .value = "";

        let titulo = "¡Actualizado!";
let mensaje = "Los datos fueron actualizados correctamente.";

if(cambioPassword){

    titulo = "¡Contraseña actualizada!";
    mensaje = "Tu contraseña fue cambiada correctamente.";

}
else if(cambioCorreo){

    titulo = "¡Correo actualizado!";
    mensaje = "Tu correo electrónico fue actualizado correctamente.";

}
else if(cambioNombre){

    titulo = "¡Datos actualizados!";
    mensaje = "Tu información personal fue actualizada correctamente.";

}

Swal.fire({
    icon: "success",
    title: titulo,
    text: mensaje,
    confirmButtonColor: "#2563eb"
});

    }

    catch(error){

        console.error(error);

        switch(error.code){

            case "auth/invalid-credential":

            case "auth/wrong-password":

                Swal.fire({
    icon: "error",
    title: "Contraseña incorrecta",
    text: "La contraseña actual es incorrecta.",
    confirmButtonColor: "#dc2626"
});

            break;

            case "auth/email-already-in-use":

                Swal.fire({
    icon: "error",
    title: "Correo en uso",
    text: "Ese correo ya está siendo utilizado.",
    confirmButtonColor: "#dc2626"
});

            break;

            case "auth/requires-recent-login":

                Swal.fire({
    icon: "warning",
    title: "Vuelve a iniciar sesión",
    text: "Debes volver a iniciar sesión para realizar este cambio.",
    confirmButtonColor: "#f59e0b"
});

            break;

            default:

                Swal.fire({
    icon: "error",
    title: "Ocurrió un error",
    text: error.message,
    confirmButtonColor: "#dc2626"
});

        }

    }

});


function actualizarRegla(id,cumple){

const regla =
document.getElementById(id);

if(!regla)return;

if(cumple){

regla.classList.remove("error");

regla.classList.add("ok");

regla.innerHTML =
"✔ " + regla.textContent.substring(2);

}
else{

regla.classList.remove("ok");

regla.classList.add("error");

regla.innerHTML =
"✖ " + regla.textContent.substring(2);

}

}
