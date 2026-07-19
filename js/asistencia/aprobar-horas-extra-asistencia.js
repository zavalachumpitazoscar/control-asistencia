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
from "../firebase-config.js";


/*=====================================================
VARIABLES
=====================================================*/

let modal;

let btnCerrar;

let btnCancelar;

let btnGuardar;

let inputMinutos;

let inputMotivo;

let seccionMinutos;

let datosActuales = null;

let empresaId = null;

let controlEventos = null;


/*=====================================================
INICIAR
=====================================================*/

export function iniciarAprobacionHorasExtraAsistencia(){

    controlEventos?.abort();


    controlEventos =
        new AbortController();


    const opcionesEvento = {

        signal:
            controlEventos.signal

    };


    modal =
        document.getElementById(
            "modalHorasExtraAsistencia"
        );

    btnCerrar =
        document.getElementById(
            "cerrarHorasExtraAsistencia"
        );

    btnCancelar =
        document.getElementById(
            "cancelarHorasExtraAsistencia"
        );

    btnGuardar =
        document.getElementById(
            "guardarHorasExtraAsistencia"
        );

    inputMinutos =
        document.getElementById(
            "minutosHorasExtraAprobados"
        );

    inputMotivo =
        document.getElementById(
            "motivoHorasExtraAsistencia"
        );

    seccionMinutos =
        document.getElementById(
            "seccionMinutosAprobados"
        );


    if(!modal){

        console.warn(
            "No se encontró modalHorasExtraAsistencia."
        );

        return;

    }


    empresaId =
        sessionStorage.getItem(
            "empresaId"
        );


    document.addEventListener(
        "asistencia:gestionar-horas-extra",
        evento=>{

            abrirModal(
                evento.detail
            );

        },
        opcionesEvento
    );


    btnCerrar?.addEventListener(
        "click",
        cerrarModal,
        opcionesEvento
    );


    btnCancelar?.addEventListener(
        "click",
        cerrarModal,
        opcionesEvento
    );


    btnGuardar?.addEventListener(
        "click",
        guardarDecision,
        opcionesEvento
    );


    document
    .querySelectorAll(
        'input[name="decisionHorasExtra"]'
    )
    .forEach(input=>{

        input.addEventListener(
            "change",
            actualizarDecision,
            opcionesEvento
        );

    });


    modal.addEventListener(
        "click",
        evento=>{

            if(
                evento.target ===
                modal
            ){

                cerrarModal();

            }

        },
        opcionesEvento
    );

}


/*=====================================================
ABRIR MODAL
=====================================================*/

function abrirModal(
    datos
){

    if(
        !datos?.colaboradorId
        ||
        !datos?.fecha
        ||
        !datos?.calculoHorasExtra
    ){

        return;

    }


    datosActuales =
        datos;


    const calculo =
        datos.calculoHorasExtra;


    const aprobacion =
        datos.aprobacionHorasExtra
        ||
        null;


    asignarTexto(
        "nombreHorasExtraAsistencia",
        datos.colaboradorNombre ||
        "Colaborador"
    );


    asignarTexto(
        "fechaHorasExtraAsistencia",
        formatearFechaVisible(
            datos.fecha
        )
    );


    asignarTexto(
        "totalHorasExtraCalculadas",
        formatearDuracion(
            calculo.minutosExtraTotal
        )
    );


    mostrarDetalleCalculo(
        calculo
    );


    const decision =
        aprobacion?.decision
        ||
        "APROBADO";


    seleccionarRadio(
        "decisionHorasExtra",
        decision
    );


    if(inputMinutos){

        inputMinutos.max =
            calculo.minutosExtraTotal;


        inputMinutos.value =
            aprobacion?.minutosAprobados
            ??
            calculo.minutosExtraTotal;

    }


    if(inputMotivo){

        inputMotivo.value =
            aprobacion?.motivo
            ||
            "";

    }


    actualizarDecision();


    modal.style.display =
        "flex";

}


/*=====================================================
MOSTRAR DETALLE
=====================================================*/

function mostrarDetalleCalculo(
    calculo
){

    const contenedor =
        document.getElementById(
            "detalleHorasExtraCalculadas"
        );


    if(!contenedor){

        return;

    }


    if(
        !Array.isArray(
            calculo.detalles
        )
        ||
        calculo.detalles.length === 0
    ){

        contenedor.textContent =
            "No existe detalle adicional.";

        return;

    }


    contenedor.innerHTML =
        calculo.detalles
        .map(
            detalle=>
            `
                <div class="detalle-extra-modal">

                    <i class="bi bi-clock"></i>

                    <span>
                        ${escaparHTML(
                            detalle.mensaje
                        )}
                    </span>

                </div>
            `
        )
        .join("");

}


/*=====================================================
CAMBIAR DECISIÓN
=====================================================*/

function actualizarDecision(){

    const decision =
        obtenerRadioSeleccionado(
            "decisionHorasExtra"
        )
        ||
        "APROBADO";


    if(seccionMinutos){

        seccionMinutos.hidden =
            decision ===
            "RECHAZADO";

    }


    if(
        decision ===
        "RECHAZADO"
        &&
        inputMinutos
    ){

        inputMinutos.value =
            0;

    }


    if(
        decision ===
        "APROBADO"
        &&
        inputMinutos
        &&
        Number(
            inputMinutos.value
        ) <= 0
    ){

        inputMinutos.value =
            datosActuales
            ?.calculoHorasExtra
            ?.minutosExtraTotal
            ||
            0;

    }

}


/*=====================================================
GUARDAR DECISIÓN
=====================================================*/

async function guardarDecision(){

    const usuario =
        auth.currentUser;


    if(!usuario){

        mostrarAdvertencia(
            "Sesión no disponible",
            "No existe un usuario autenticado."
        );

        return;

    }


    if(
        !empresaId
        ||
        !datosActuales
    ){

        return;

    }


    const calculo =
        datosActuales.calculoHorasExtra;


    const decision =
        obtenerRadioSeleccionado(
            "decisionHorasExtra"
        )
        ||
        "APROBADO";


    const motivo =
        inputMotivo?.value
        .trim()
        ||
        "";


    if(!motivo){

        mostrarAdvertencia(
            "Motivo obligatorio",
            "Explica por qué se aprueban o rechazan las horas extra."
        );

        return;

    }


    let minutosAprobados =
        decision ===
        "APROBADO"
        ?
        Number(
            inputMinutos?.value
            ||
            0
        )
        :
        0;


    if(
        decision ===
        "APROBADO"

        &&

        (
            minutosAprobados <= 0
            ||
            minutosAprobados >
            calculo.minutosExtraTotal
        )
    ){

        mostrarAdvertencia(
            "Minutos incorrectos",
            `Los minutos aprobados deben estar entre 1 y ${calculo.minutosExtraTotal}.`
        );

        return;

    }


    const estadoAprobacion =
        decision ===
        "RECHAZADO"
        ?
        "RECHAZADO"
        :
        minutosAprobados <
        calculo.minutosExtraTotal
        ?
        "PARCIAL"
        :
        "APROBADO";


    const documentoId =
        construirIdDocumento(

            empresaId,

            datosActuales.colaboradorId,

            datosActuales.fecha

        );


    try{

        btnGuardar.disabled =
            true;


        btnGuardar.innerHTML = `
            <span class="spinner-boton"></span>
            Guardando...
        `;


        await setDoc(
            doc(
                db,
                "aprobacionesHorasExtra",
                documentoId
            ),
            {

                empresaId,

                colaboradorId:
                    datosActuales.colaboradorId,

                colaboradorNombre:
                    datosActuales.colaboradorNombre,

                fecha:
                    datosActuales.fecha,

                minutosCalculados:
                    calculo.minutosExtraTotal,

                minutosExtraSalida:
                    calculo.minutosExtraSalida
                    ||
                    0,

                minutosExtraRefrigerio:
                    calculo.minutosExtraRefrigerio
                    ||
                    0,

                decision,

                estadoAprobacion,

                minutosAprobados,

                motivo,

                estado:
                    "ACTIVO",

                decididoPor:
                    usuario.uid,

                fechaDecision:
                    serverTimestamp(),

                fechaModificacion:
                    serverTimestamp()

            },
            {
                merge:true
            }
        );


        const datosActualizacion = {

            colaboradorId:
                datosActuales.colaboradorId,

            fecha:
                datosActuales.fecha

        };


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:horas-extra-actualizadas",
                {
                    detail:
                        datosActualizacion
                }
            )
        );


        cerrarModal();


        Swal.fire({

            icon:"success",

            title:
                decision ===
                "APROBADO"
                ?
                "Horas extra aprobadas"
                :
                "Horas extra rechazadas",

            text:
                estadoAprobacion ===
                "PARCIAL"
                ?
                `Se aprobaron ${minutosAprobados} de ${calculo.minutosExtraTotal} minutos.`
                :
                "La decisión fue guardada correctamente.",

            confirmButtonColor:
                "#2563eb"

        });

    }
    catch(error){

        console.error(
            "Error guardando horas extra:",
            error
        );


        Swal.fire({

            icon:"error",

            title:"No se pudo guardar",

            text:
                error.message ||
                "Ocurrió un error al guardar la decisión.",

            confirmButtonColor:
                "#2563eb"

        });

    }
    finally{

        if(btnGuardar){

            btnGuardar.disabled =
                false;


            btnGuardar.innerHTML = `
                <i class="bi bi-check-circle"></i>
                Guardar decisión
            `;

        }

    }

}


/*=====================================================
CERRAR
=====================================================*/

function cerrarModal(){

    if(modal){

        modal.style.display =
            "none";

    }


    datosActuales =
        null;


    if(inputMinutos){

        inputMinutos.value =
            "";

    }


    if(inputMotivo){

        inputMotivo.value =
            "";

    }

}


/*=====================================================
UTILIDADES
=====================================================*/

function seleccionarRadio(
    nombre,
    valor
){

    const input =
        document.querySelector(
            `input[name="${nombre}"][value="${valor}"]`
        );


    if(input){

        input.checked =
            true;

    }

}


function obtenerRadioSeleccionado(
    nombre
){

    return document.querySelector(
        `input[name="${nombre}"]:checked`
    )
    ?.value
    ||
    null;

}


function construirIdDocumento(
    empresa,
    colaborador,
    fecha
){

    return [

        limpiarParaId(
            empresa
        ),

        limpiarParaId(
            colaborador
        ),

        limpiarParaId(
            fecha
        )

    ]
    .join("_");

}


function limpiarParaId(
    valor
){

    return String(
        valor ??
        ""
    )
    .trim()
    .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
    );

}


function formatearDuracion(
    minutosTotales
){

    const total =
        Math.max(
            0,
            Number(
                minutosTotales ||
                0
            )
        );


    const horas =
        Math.floor(
            total /
            60
        );


    const minutos =
        total %
        60;


    if(horas === 0){

        return `${minutos} min`;

    }


    if(minutos === 0){

        return `${horas} h`;

    }


    return `${horas} h ${minutos} min`;

}


function formatearFechaVisible(
    fechaISO
){

    return new Intl.DateTimeFormat(
        "es-PE",
        {
            weekday:"long",
            day:"2-digit",
            month:"long",
            year:"numeric"
        }
    )
    .format(
        new Date(
            `${fechaISO}T00:00:00`
        )
    );

}


function asignarTexto(
    id,
    texto
){

    const elemento =
        document.getElementById(
            id
        );


    if(elemento){

        elemento.textContent =
            texto;

    }

}


function mostrarAdvertencia(
    titulo,
    texto
){

    Swal.fire({

        icon:"warning",

        title:titulo,

        text:texto,

        confirmButtonColor:
            "#2563eb"

    });

}


function escaparHTML(
    valor
){

    return String(
        valor ??
        ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}
