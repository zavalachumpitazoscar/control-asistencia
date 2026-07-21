import { auth } from "./firebase-config.js";

import { db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc
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

import { iniciarCompañia } from "./compañia.js";
import { iniciarEmpleados } from "./empleados.js";
import { iniciarAsistencia } from "./asistencia.js";

const sidebar = document.querySelector(".sidebar");

const botonMenu = document.querySelector(".btn-menu");

const botones = document.querySelectorAll(".item");

const contenedor = document.getElementById("contenedorVista");

const titulo = document.querySelector(".topbar h1");

const overlay = document.querySelector(".overlay");


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

    await cargarPerfilUsuario(usuario);

    cargarVista("dashboard");

});





// ============================
// MENU LATERAL
// ============================


botonMenu.addEventListener("click", () => {

    sidebar.classList.toggle("mostrar");
    overlay.classList.toggle("mostrar");

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


await signOut(auth);


window.location.href =
"index.html";


});


async function cargarVista(vista){

    try{

const ruta =
    `vistas/${vista}.html`;


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

        contenedor.innerHTML =
        html;

        switch(vista){

            case "compañia":

                iniciarCompañia();

            break;

            case "empleados":

                iniciarEmpleados();

            break;

            case "asistencia":

                iniciarAsistencia();

            break;


        }

    }
    catch(error){

        contenedor.innerHTML=
        `
        <h2>Vista no encontrada</h2>
        `;

        console.error(error);

    }

}




// cargar dashboard al iniciar

cargarVista("dashboard");


async function cargarPerfilUsuario(usuario){

    const referencia =
    doc(
        db,
        "usuarios",
        usuario.uid
    );

    const documento =
    await getDoc(referencia);

    if(!documento.exists()) return;

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
