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

btnRegistrar.addEventListener(

    "click",

    async()=>{

        if(!validarPasoActual()){

            mostrarToast(

                "error",

                "Complete correctamente toda la información."

            );

            return;

        }

        btnRegistrar.disabled=true;

        btnRegistrar.classList.add("cargando");

        btnRegistrar.innerHTML="Creando empresa...";

        let credencial=null;

        try{

            const correo=

                document
                    .getElementById("correo")
                    .value.trim();

            const password=

                document
                    .getElementById("password")
                    .value;

            credencial=

                await createUserWithEmailAndPassword(

                    auth,

                    correo,

                    password

                );

            const uid=

                credencial.user.uid;

            await setDoc(

                doc(

                    db,

                    "usuarios",

                    uid

                ),

                {

                    uid,

                    correoLogin:correo,

                    rol:"EMPRESA",

                    estado:"ACTIVO",

                    fechaRegistro:

                        serverTimestamp(),

                    empresa:{

                        ruc:

                            document
                                .getElementById("ruc")
                                .value.trim(),

                        razonSocial:

                            document
                                .getElementById("razonSocial")
                                .value.trim(),

                        giro:

                            document
                                .getElementById("giro")
                                .value.trim()

                    },

                    ubicacion:{

                        direccion:

                            document
                                .getElementById("direccion")
                                .value.trim(),

                        departamento:

                            document
                                .getElementById("departamento")
                                .value.trim(),

                        provincia:

                            document
                                .getElementById("provincia")
                                .value.trim(),

                        distrito:

                            document
                                .getElementById("distrito")
                                .value.trim(),

                        pais:

                            document
                                .getElementById("pais")
                                .value.trim(),

                        codigoPostal:

                            document
                                .getElementById("codigoPostal")
                                .value.trim()

                    },

                    representantes:

                        obtenerRepresentantes()

                }

            );

            mostrarToast(

                "exito",

                "Empresa registrada correctamente."

            );

            setTimeout(()=>{

                window.location="index.html";

            },2000);

        }

        catch(error){

            console.error(error);

            if(credencial?.user){

                try{

                    await deleteUser(

                        credencial.user

                    );

                }

                catch(e){

                    console.error(e);

                }

            }

            switch(error.code){

                case "auth/email-already-in-use":

                    mostrarToast(

                        "error",

                        "Ese correo ya está registrado."

                    );

                    break;

                case "auth/invalid-email":

                    mostrarToast(

                        "error",

                        "Correo electrónico inválido."

                    );

                    break;

                case "auth/weak-password":

                    mostrarToast(

                        "error",

                        "La contraseña debe tener al menos 8 caracteres."

                    );

                    break;

                default:

                    mostrarToast(

                        "error",

                        error.message

                    );

            }

        }

        finally{

            btnRegistrar.disabled=false;

            btnRegistrar.classList.remove("cargando");

            btnRegistrar.innerHTML="Crear Empresa";

        }

    }

);


function actualizarVista(){

    if(pasoActual===5){

    construirResumen();

    document.querySelectorAll(".resumen-card").forEach(card=>{

    animarElemento(card,"anim-pop");
    });

    }

    const paso= document.getElementById("paso"+pasoActual);

    animarElemento(paso,"anim-slide-left");

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

    animarElemento(progressBar,"animFade");

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

        const ultimo= contenedorRepresentantes.lastElementChild; 
        animarElemento(ultimo,"anim-pop");

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

        const tarjeta= e.target.closest(".representante");

        tarjeta.style.transition=".25s";

        tarjeta.style.opacity="0";

        tarjeta.style.transform="scale(.95)";

        setTimeout(()=>{

        tarjeta.remove();

        actualizarRepresentantes();

        },250);

        return;
        
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


function marcarError(input){

    input.classList.remove("ok-input");

    input.classList.add("input-error");

    animarElemento(input,"anim-shake");

}

function marcarCorrecto(input){

    input.classList.remove("error-input");

    input.classList.add("input-success");

    animarElemento(input,"anim-success");

}

function limpiarEstado(input){

    input.classList.remove(
        "error-input",
        "ok-input"
    );

}

function validarPaso1(){

    const correo =
        document.getElementById("correo");

    const password =
        document.getElementById("password");

    const confirmar =
        document.getElementById("confirmPassword");

    let valido = true;

    if(!regexCorreo.test(correo.value.trim())){

        marcarError(correo);

        valido = false;

    }else{

        marcarCorrecto(correo);

    }

    if(!regexPassword.test(password.value)){

        marcarError(password);

        valido = false;

    }else{

        marcarCorrecto(password);

    }

    if(confirmar.value !== password.value){

        marcarError(confirmar);

        valido = false;

    }else{

        marcarCorrecto(confirmar);

    }

    return valido;

}

function validarPaso2(){

    let valido = true;

    const ruc =
        document.getElementById("ruc");

    const razon =
        document.getElementById("razonSocial");

    const giro =
        document.getElementById("giro");

    if(!regexRuc.test(ruc.value.trim())){

        marcarError(ruc);

        valido = false;

    }else{

        marcarCorrecto(ruc);

    }

    if(razon.value.trim()===""){

        marcarError(razon);

        valido = false;

    }else{

        marcarCorrecto(razon);

    }

    if(giro.value.trim()===""){

        marcarError(giro);

        valido = false;

    }else{

        marcarCorrecto(giro);

    }

    return valido;

}

function validarPaso3(){

    let valido = true;

    [

        "direccion",

        "departamento",

        "provincia",

        "distrito",

        "pais"

    ].forEach(id=>{

        const input =
            document.getElementById(id);

        if(input.value.trim()===""){

            marcarError(input);

            valido = false;

        }else{

            marcarCorrecto(input);

        }

    });

    return valido;

}

function validarPaso4(){

    let valido = true;

    document
        .querySelectorAll(".representante")
        .forEach(rep=>{

            const nombre =
                rep.querySelector(".repNombre");

            const dni =
                rep.querySelector(".repDni");

            const correo =
                rep.querySelector(".repCorreo");

            const telefono =
                rep.querySelector(".repTelefono");

            if(nombre.value.trim()===""){

                marcarError(nombre);

                valido = false;

            }else{

                marcarCorrecto(nombre);

            }

            if(!regexDni.test(dni.value.trim())){

                marcarError(dni);

                valido = false;

            }else{

                marcarCorrecto(dni);

            }

            if(!regexCorreo.test(correo.value.trim())){

                marcarError(correo);

                valido = false;

            }else{

                marcarCorrecto(correo);

            }

            if(!regexTelefono.test(telefono.value.trim())){

                marcarError(telefono);

                valido = false;

            }else{

                marcarCorrecto(telefono);

            }

        });

    return valido;

}

function validarPasoActual(){

    switch(pasoActual){

        case 1:
            return validarPaso1();

        case 2:
            return validarPaso2();

        case 3:
            return validarPaso3();

        case 4:
            return validarPaso4();

        default:
            return true;

    }

}

btnSiguiente.addEventListener("click",()=>{

    if(!validarPasoActual()){

        mostrarToast(
            "error",
            "Complete correctamente los campos antes de continuar."
        );

        return;

    }

    pasoActual++;

    actualizarVista();

});


function obtenerRepresentantes(){

    const representantes=[];

    document
        .querySelectorAll(".representante")
        .forEach(rep=>{

            representantes.push({

                nombre:
                    rep.querySelector(".repNombre").value.trim(),

                dni:
                    rep.querySelector(".repDni").value.trim(),

                correo:
                    rep.querySelector(".repCorreo").value.trim(),

                telefono:
                    rep.querySelector(".repTelefono").value.trim(),

                cargo:
                    rep.querySelector(".repCargo")
                        ? rep.querySelector(".repCargo").value.trim()
                        : "Representante Legal"

            });

        });

    return representantes;

}

function construirResumen(){

    const resumen =
        document.getElementById("resumen");

    const representantes =
        obtenerRepresentantes();

    resumen.innerHTML = `

<div class="resumen-card">

<h3>

🏢 Empresa

</h3>

<div class="resumen-item">

<span class="resumen-label">

RUC

</span>

<span class="resumen-value">

${document.getElementById("ruc").value}

</span>

</div>

<div class="resumen-item">

<span class="resumen-label">

Razón Social

</span>

<span class="resumen-value">

${document.getElementById("razonSocial").value}

</span>

</div>

<div class="resumen-item">

<span class="resumen-label">

Giro

</span>

<span class="resumen-value">

${document.getElementById("giro").value}

</span>

</div>

</div>

<div class="resumen-card">

<h3>

📍 Ubicación

</h3>

<div class="resumen-item">

<span class="resumen-label">

Dirección

</span>

<span class="resumen-value">

${document.getElementById("direccion").value}

</span>

</div>

<div class="resumen-item">

<span class="resumen-label">

Departamento

</span>

<span class="resumen-value">

${document.getElementById("departamento").value}

</span>

</div>

<div class="resumen-item">

<span class="resumen-label">

Provincia

</span>

<span class="resumen-value">

${document.getElementById("provincia").value}

</span>

</div>

<div class="resumen-item">

<span class="resumen-label">

Distrito

</span>

<span class="resumen-value">

${document.getElementById("distrito").value}

</span>

</div>

<div class="resumen-item">

<span class="resumen-label">

País

</span>

<span class="resumen-value">

${document.getElementById("pais").value}

</span>

</div>

</div>

<div class="resumen-card">

<h3>

👤 Representantes (${representantes.length})

</h3>

${representantes.map(rep=>`

<div class="resumen-item">

<span class="resumen-label">

${rep.nombre}

</span>

<span class="resumen-value">

${rep.correo}

</span>

</div>

`).join("")}

</div>

<div class="resumen-card">

<h3>

🔐 Cuenta

</h3>

<div class="resumen-item">

<span class="resumen-label">

Correo de acceso

</span>

<span class="resumen-value">

${document.getElementById("correo").value}

</span>

</div>

</div>

`;

}



function animarElemento(elemento, clase){

    elemento.classList.remove(clase);

    void elemento.offsetWidth;

    elemento.classList.add(clase);

}
