import {
    createUserWithEmailAndPassword,
    deleteUser
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase-config.js";


//========================================
// VARIABLES DE PASOS
//========================================

let pasoActual = 1;

let totalRepresentantes = 1;

const totalPasos = 5;

const pasos = document.querySelectorAll(".form-step");

const indicadores = document.querySelectorAll(".step");

const progressBar = document.getElementById("progressBar");

const btnAnterior = document.getElementById("btnAnterior");

const btnSiguiente = document.getElementById("btnSiguiente");

const btnRegistrar = document.getElementById("btnRegistrar");

const contenedorRepresentantes = document.getElementById("contenedorRepresentantes");

const btnAgregarRepresentante = document.getElementById("btnAgregarRepresentante");

const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const regexRuc = /^\d{11}$/;

const regexDni = /^\d{8}$/;

const regexTelefono = /^[0-9+\-() ]{7,20}$/;

const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;



const toast = document.getElementById("toast");

function mostrarToast(tipo, mensaje) {

    toast.className = "toast " + tipo;
    toast.textContent = mensaje;
    toast.classList.add("mostrar");

    setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 3000);

}

btnRegistrar.addEventListener("click", async () => {

    const nombre =
        document.getElementById("nombre").value.trim();

    const correo =
        document.getElementById("correo").value.trim();

    const password =
        document.getElementById("password").value.trim();

    if (!nombre || !correo || !password) {

        mostrarToast(
            "error",
            "Completa todos los campos."
        );

        return;
    }

    btnRegistrar.disabled = true;
    btnRegistrar.classList.add("cargando");
    btnRegistrar.innerHTML = "Registrando...";

    let credencial = null;

    try {

        // Crear usuario en Authentication
        credencial =
            await createUserWithEmailAndPassword(
                auth,
                correo,
                password
            );

        console.log("Usuario creado:", credencial.user.uid);

        // Crear documento en Firestore
        await setDoc(
            doc(
                db,
                "usuarios",
                credencial.user.uid
            ),
            {
                uid: credencial.user.uid,
                nombreCompleto: nombre,
                correo: correo,
                estado: "ACTIVO",
                rol: "USUARIO",
                fechaRegistro: serverTimestamp()
            }
        );

        console.log("Documento creado en Firestore");

        mostrarToast(
            "exito",
            "Cuenta creada correctamente."
        );

        setTimeout(() => {

            window.location.href = "index.html";

        }, 2000);

    }
    catch (error) {

        console.error(error);
        console.error(error.code);
        console.error(error.message);

        // Si el usuario ya fue creado en Authentication
        // pero falló Firestore, lo eliminamos.
        if (credencial && credencial.user) {

            try {

                await deleteUser(credencial.user);

            } catch (e) {

                console.error("No se pudo eliminar el usuario:", e);

            }

        }

        switch (error.code) {

            case "auth/email-already-in-use":
                mostrarToast(
                    "error",
                    "Ese correo ya está registrado."
                );
                break;

            case "auth/invalid-email":
                mostrarToast(
                    "error",
                    "Correo inválido."
                );
                break;

            case "auth/weak-password":
                mostrarToast(
                    "error",
                    "La contraseña debe tener al menos 6 caracteres."
                );
                break;

            case "permission-denied":
            case "firestore/permission-denied":
                mostrarToast(
                    "error",
                    "Firestore no permite escribir. Revisa las reglas."
                );
                break;

            default:
                mostrarToast(
                    "error",
                    error.message
                );

        }

    }
    finally {

        btnRegistrar.disabled = false;
        btnRegistrar.classList.remove("cargando");
        btnRegistrar.innerHTML = "Registrarse";

    }

});


function actualizarVista(){

    pasos.forEach(p=>{

        p.classList.remove("active");

    });

    document
        .getElementById("paso"+pasoActual)
        .classList.add("active");



    indicadores.forEach((step,index)=>{

        step.classList.remove("active");

        if(index+1<=pasoActual){

            step.classList.add("active");

        }

    });



    progressBar.style.width=

        ((pasoActual-1)/(totalPasos-1))*100+"%";



    if(pasoActual===1){

        btnAnterior.style.visibility="hidden";

    }else{

        btnAnterior.style.visibility="visible";

    }



    if(pasoActual===totalPasos){

        btnSiguiente.classList.add("oculto");

        btnRegistrar.classList.remove("oculto");

    }else{

        btnRegistrar.classList.add("oculto");

        btnSiguiente.classList.remove("oculto");

    }

}

btnSiguiente.addEventListener(

    "click",

    ()=>{

        if(pasoActual<totalPasos){

            pasoActual++;

            actualizarVista();

        }

    }

);

btnAnterior.addEventListener(

    "click",

    ()=>{

        if(pasoActual>1){

            pasoActual--;

            actualizarVista();

        }

    }

);

actualizarVista();


function crearRepresentante(numero){

    return `

<div class="representante" data-index="${numero}">

<h3>

Representante ${numero}

</h3>

<input
type="text"
class="repNombre"
placeholder="Nombre Completo">

<input
type="text"
class="repDni"
maxlength="8"
placeholder="DNI">

<input
type="email"
class="repCorreo"
placeholder="Correo">

<input
type="text"
class="repTelefono"
placeholder="Teléfono">

<button
type="button"
class="btnEliminarRepresentante">

Eliminar representante

</button>

</div>

`;

}

btnAgregarRepresentante.addEventListener(

    "click",

    ()=>{

        totalRepresentantes++;

        contenedorRepresentantes.insertAdjacentHTML(

            "beforeend",

            crearRepresentante(
                totalRepresentantes
            )

        );

        actualizarRepresentantes();

    }

);

contenedorRepresentantes.addEventListener(

    "click",

    e=>{

        if(

            !e.target.classList.contains(

                "btnEliminarRepresentante"

            )

        ){

            return;

        }

        e.target
            .closest(".representante")
            .remove();

        actualizarRepresentantes();

    }

);

function actualizarRepresentantes(){

    const tarjetas=

        document.querySelectorAll(

            ".representante"

        );

    totalRepresentantes=

        tarjetas.length;

    tarjetas.forEach(

        (tarjeta,index)=>{

            tarjeta.dataset.index=index+1;

            tarjeta.querySelector("h3").textContent=

                "Representante "+(index+1);

            const boton=

                tarjeta.querySelector(

                    ".btnEliminarRepresentante"

                );

            if(index===0){

                boton.classList.add("oculto");

            }else{

                boton.classList.remove("oculto");

            }

        }

    );

}

actualizarRepresentantes();
