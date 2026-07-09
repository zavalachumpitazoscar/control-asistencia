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

if(btnUsuario && menuUsuario){

    btnUsuario.addEventListener("click",(e)=>{

        e.stopPropagation();

        menuUsuario.classList.toggle("mostrar");

    });

    document.addEventListener("click",(e)=>{

        if(
            !menuUsuario.contains(e.target) &&
            !btnUsuario.contains(e.target)
        ){

            menuUsuario.classList.remove("mostrar");

        }

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

        const respuesta =
        await fetch(
        `vistas/${vista}.html`
        );

        const html =
        await respuesta.text();

        contenedor.innerHTML =
        html;

        switch(vista){

            case "compañia":

                iniciarCompañia();

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

if(passwordNueva !== ""){

    const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[.!@#$%])(?=.{8,})/;

    if(!regex.test(passwordNueva)){

        alert(
`La contraseña debe contener:

• Mínimo 8 caracteres
• Una letra mayúscula
• Una letra minúscula
• Un carácter especial (. ! @ # $ %)`
        );

        return;

    }

}

    if(passwordNueva){

    await updatePassword(
        usuario,
        passwordNueva
    );

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

        alert(
            "Perfil actualizado correctamente."
        );

    }

    catch(error){

        console.error(error);

        switch(error.code){

            case "auth/invalid-credential":

            case "auth/wrong-password":

                alert(
                    "La contraseña actual es incorrecta."
                );

            break;

            case "auth/email-already-in-use":

                alert(
                    "Ese correo ya está siendo utilizado."
                );

            break;

            case "auth/requires-recent-login":

                alert(
                    "Debes volver a iniciar sesión para realizar este cambio."
                );

            break;

            default:

                alert(error.message);

        }

    }

});
