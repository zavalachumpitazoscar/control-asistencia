import { auth } from "./firebase-config.js";

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


onAuthStateChanged(auth,(usuario)=>{


    if(!usuario){


        window.location.href =
        "index.html";


        return;


    }


    cargarVista(
        "dashboard"
    );


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
