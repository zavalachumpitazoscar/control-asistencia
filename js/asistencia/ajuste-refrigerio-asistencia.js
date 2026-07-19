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

let inputMotivo;

let seccionSinMarcaciones;

let seccionRefrigerioCorto;

let listaAdvertencias;

let datosActuales = null;

let empresaId = null;

let controlEventos = null;


/*=====================================================
INICIAR AJUSTE
=====================================================*/

export function iniciarAjusteRefrigerioAsistencia(){

    controlEventos?.abort();


    controlEventos =
        new AbortController();


    const opcionesEvento = {

        signal:
            controlEventos.signal

    };


    modal =
        document.getElementById(
            "modalAjusteRefrigerioAsistencia"
        );

    btnCerrar =
        document.getElementById(
            "cerrarAjusteRefrigerioAsistencia"
        );

    btnCancelar =
        document.getElementById(
            "cancelarAjusteRefrigerioAsistencia"
        );

    btnGuardar =
        document.getElementById(
            "guardarAjusteRefrigerioAsistencia"
        );

    inputMotivo =
        document.getElementById(
            "motivoAjusteRefrigerio"
        );

    seccionSinMarcaciones =
        document.getElementById(
            "seccionRefrigerioSinMarcaciones"
        );

    seccionRefrigerioCorto =
        document.getElementById(
            "seccionRefrigerioCorto"
        );

    listaAdvertencias =
        document.getElementById(
            "listaAdvertenciasRefrigerio"
        );


    if(!modal){

        console.warn(
            "No se encontró modalAjusteRefrigerioAsistencia."
        );

        return;

    }


    empresaId =
        sessionStorage.getItem(
            "empresaId"
        );


    document.addEventListener(
        "asistencia:gestionar-ajuste-refrigerio",
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
        guardarAjuste,
        opcionesEvento
    );


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
    ){

        return;

    }


    datosActuales =
        datos;


    asignarTexto(
        "nombreAjusteRefrigerio",
        datos.colaboradorNombre ||
        "Colaborador"
    );


    asignarTexto(
        "fechaAjusteRefrigerio",
        formatearFechaVisible(
            datos.fecha
        )
    );


    mostrarAdvertencias();

    mostrarSecciones();

    cargarDecisionesActuales();


    if(inputMotivo){

        inputMotivo.value =
            datos.ajusteAsistencia
            ?.motivo
            ||
            "";

    }


    modal.style.display =
        "flex";

}


/*=====================================================
MOSTRAR ADVERTENCIAS
=====================================================*/

function mostrarAdvertencias(){

    if(!listaAdvertencias){

        return;

    }


    const advertencias =
        obtenerAdvertenciasRefrigerio();


    if(advertencias.length === 0){

        listaAdvertencias.innerHTML = `
            <div class="advertencia-refrigerio-item">

                <i class="bi bi-info-circle"></i>

                <span>
                    No existen decisiones pendientes relacionadas con el refrigerio.
                </span>

            </div>
        `;

        return;

    }


    listaAdvertencias.innerHTML =
        advertencias
        .map(
            advertencia=>
            `
                <div class="advertencia-refrigerio-item">

                    <i class="bi bi-exclamation-triangle"></i>

                    <span>
                        ${escaparHTML(
                            advertencia.mensaje
                        )}
                    </span>

                </div>
            `
        )
        .join("");

}


/*=====================================================
MOSTRAR SECCIONES NECESARIAS
=====================================================*/

function mostrarSecciones(){

    const codigos =
        new Set(
            obtenerAdvertenciasRefrigerio()
            .map(
                advertencia=>
                    advertencia.codigo
            )
        );


    const mostrarSinMarcaciones =
        codigos.has(
            "REFRIGERIO_SIN_MARCACIONES"
        )
        ||
        codigos.has(
            "REFRIGERIO_INCOMPLETO"
        );


    const mostrarCorto =
        codigos.has(
            "REFRIGERIO_CORTO"
        );


    if(seccionSinMarcaciones){

        seccionSinMarcaciones.hidden =
            !mostrarSinMarcaciones;

    }


    if(seccionRefrigerioCorto){

        seccionRefrigerioCorto.hidden =
            !mostrarCorto;

    }


    if(btnGuardar){

        btnGuardar.disabled =
            !mostrarSinMarcaciones
            &&
            !mostrarCorto;

    }

}


/*=====================================================
ADVERTENCIAS DE REFRIGERIO
=====================================================*/

function obtenerAdvertenciasRefrigerio(){

    const codigosPermitidos =
        new Set([

            "REFRIGERIO_SIN_MARCACIONES",

            "REFRIGERIO_INCOMPLETO",

            "REFRIGERIO_CORTO",

            "REFRIGERIO_EXCESIVO"

        ]);


    return (
        datosActuales?.advertencias ||
        []
    )
    .filter(
        advertencia=>

            codigosPermitidos.has(
                advertencia.codigo
            )

    );

}


/*=====================================================
CARGAR DECISIONES GUARDADAS
=====================================================*/

function cargarDecisionesActuales(){

    seleccionarRadio(
        "tratamientoRefrigerio",

        datosActuales
        ?.tratamientoRefrigerio
        ||
        "LABORADO"
    );


    seleccionarRadio(
        "tratamientoRefrigerioCorto",

        datosActuales
        ?.tratamientoRefrigerioCorto
        ||
        "NO_CONSIDERAR_EXTRA"
    );

}


/*=====================================================
GUARDAR AJUSTE
=====================================================*/

async function guardarAjuste(){

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


    const motivo =
        inputMotivo?.value
        .trim()
        ||
        "";


    if(!motivo){

        mostrarAdvertencia(
            "Motivo obligatorio",
            "Explica brevemente por qué se aplica esta decisión."
        );

        return;

    }


    const tratamientoRefrigerio =
        obtenerRadioSeleccionado(
            "tratamientoRefrigerio"
        )
        ||
        "LABORADO";


    const tratamientoRefrigerioCorto =
        obtenerRadioSeleccionado(
            "tratamientoRefrigerioCorto"
        )
        ||
        "NO_CONSIDERAR_EXTRA";


    const documentoId =
        construirIdAjuste(

            empresaId,

            datosActuales.colaboradorId,

            datosActuales.fecha

        );


    const esNuevo =
        !datosActuales.ajusteAsistencia;


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
                "ajustesAsistenciaDiaria",
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

                tratamientoRefrigerio,

                tratamientoRefrigerioCorto,

                motivo,

                estado:
                    "ACTIVO",

                modificadoPor:
                    usuario.uid,

                fechaModificacion:
                    serverTimestamp(),

                ...(
                    esNuevo
                    ?
                    {

                        creadoPor:
                            usuario.uid,

                        fechaRegistro:
                            serverTimestamp()

                    }
                    :
                    {}
                )

            },
            {
                merge:true
            }
        );


        const datosActualizacion = {

            colaboradorId:
                datosActuales.colaboradorId,

            fecha:
                datosActuales.fecha,

            tratamientoRefrigerio,

            tratamientoRefrigerioCorto

        };


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:ajuste-diario-actualizado",
                {
                    detail:
                        datosActualizacion
                }
            )
        );


        cerrarModal();


        Swal.fire({

            icon:"success",

            title:"Decisión aplicada",

            text:
                "El resumen fue recalculado utilizando la decisión seleccionada.",

            confirmButtonColor:
                "#2563eb"

        });

    }
    catch(error){

        console.error(
            "Error guardando ajuste de refrigerio:",
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
                Aplicar decisión
            `;

        }

    }

}


/*=====================================================
CERRAR MODAL
=====================================================*/

function cerrarModal(){

    if(modal){

        modal.style.display =
            "none";

    }


    datosActuales =
        null;


    if(inputMotivo){

        inputMotivo.value =
            "";

    }


    if(listaAdvertencias){

        listaAdvertencias.innerHTML =
            "";

    }


    if(seccionSinMarcaciones){

        seccionSinMarcaciones.hidden =
            true;

    }


    if(seccionRefrigerioCorto){

        seccionRefrigerioCorto.hidden =
            true;

    }

}


/*=====================================================
RADIOS
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


/*=====================================================
UTILIDADES
=====================================================*/

function construirIdAjuste(
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
