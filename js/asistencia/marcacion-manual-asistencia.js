import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


import {
    auth,
    db
}
from "../firebase-config.js";


import {
    interpretarHoraSegunHorarios
}
from "./clasificar-marcaciones.js";


/*=====================================================
VARIABLES
=====================================================*/

let modal;

let btnCerrar;

let btnCancelar;

let btnGuardar;

let inputHora;

let inputMotivo;

let colaboradorId = null;

let colaboradorNombre = "";

let colaboradorDocumento = "";

let fechaSeleccionada = null;

let tipoSolicitado = null;

let horarioSeleccionado = null;

let empresaId = null;

let controlEventos = null;


/*=====================================================
INICIAR MARCACIÓN MANUAL
=====================================================*/

export function iniciarMarcacionManualAsistencia(){

    /*
        Si la vista se vuelve a cargar, eliminamos
        los listeners anteriores.
    */

    controlEventos?.abort();

    controlEventos =
        new AbortController();


    const opcionesEvento = {

        signal:
            controlEventos.signal

    };


    modal =
        document.getElementById(
            "modalMarcacionManualAsistencia"
        );

    btnCerrar =
        document.getElementById(
            "cerrarMarcacionManualAsistencia"
        );

    btnCancelar =
        document.getElementById(
            "cancelarMarcacionManualAsistencia"
        );

    btnGuardar =
        document.getElementById(
            "guardarMarcacionManualAsistencia"
        );

    inputHora =
        document.getElementById(
            "horaMarcacionManualAsistencia"
        );

    inputMotivo =
        document.getElementById(
            "motivoMarcacionManualAsistencia"
        );


    if(!modal){

        console.warn(
            "No se encontró modalMarcacionManualAsistencia."
        );

        return;

    }


    empresaId =
        sessionStorage.getItem(
            "empresaId"
        );


    document.addEventListener(
        "asistencia:agregar-marcacion-manual",
        evento=>{

            abrirModalMarcacionManual(
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
        guardarMarcacionManual,
        opcionesEvento
    );


    inputHora?.addEventListener(
        "input",
        validarHoraIngresada,
        opcionesEvento
    );


    inputMotivo?.addEventListener(
        "input",
        actualizarContadorMotivo,
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

async function abrirModalMarcacionManual(
    datos
){

    colaboradorId =
        datos?.colaboradorId ||
        null;

    colaboradorNombre =
        datos?.colaboradorNombre ||
        "Colaborador";

    fechaSeleccionada =
        datos?.fecha ||
        null;

    tipoSolicitado =
        String(
            datos?.tipo ||
            ""
        )
        .toUpperCase();

    horarioSeleccionado =
        datos?.horario ||
        null;


    if(
        !colaboradorId
        ||
        !fechaSeleccionada
        ||
        ![
            "ENTRADA",
            "SALIDA"
        ]
        .includes(
            tipoSolicitado
        )
    ){

        return;

    }


    if(!empresaId){

        Swal.fire({

            icon:"error",

            title:"Empresa no encontrada",

            text:
                "No se encontró la empresa activa.",

            confirmButtonColor:
                "#2563eb"

        });

        return;

    }


    limpiarFormulario();


    mostrarDatosModal();


    /*
        Hora sugerida según la marcación faltante.
    */

    if(inputHora){

        inputHora.value =
            tipoSolicitado ===
            "ENTRADA"
            ?
            horarioSeleccionado
            ?.entrada
            ?.programada
            ||
            ""
            :
            horarioSeleccionado
            ?.salida
            ?.programada
            ||
            "";

    }


    modal.style.display =
        "flex";


    try{

        await cargarDatosColaborador();

    }
    catch(error){

        console.error(
            "Error obteniendo colaborador:",
            error
        );

    }


    validarHoraIngresada();


    setTimeout(
        ()=>{

            inputHora?.focus();

        },
        100
    );

}


/*=====================================================
CARGAR DATOS DEL COLABORADOR
=====================================================*/

async function cargarDatosColaborador(){

    const documento =
        await getDoc(
            doc(
                db,
                "colaboradores",
                colaboradorId
            )
        );


    if(!documento.exists()){

        return;

    }


    const datos =
        documento.data();


    const nombres =
        datos.datosPersonales
        ?.nombres
        ||
        datos.nombres
        ||
        "";


    const apellidos =
        datos.datosPersonales
        ?.apellidos
        ||
        datos.apellidos
        ||
        "";


    colaboradorNombre =
        [
            nombres,
            apellidos
        ]
        .filter(Boolean)
        .join(" ")
        .trim()
        ||
        datos.nombreCompleto
        ||
        colaboradorNombre;


    colaboradorDocumento =
        datos.documento?.numero
        ||
        datos.numeroDocumento
        ||
        datos.dni
        ||
        datos.datosPersonales?.dni
        ||
        "";


    asignarTexto(
        "nombreMarcacionManualAsistencia",
        colaboradorNombre
    );

}


/*=====================================================
MOSTRAR INFORMACIÓN
=====================================================*/

function mostrarDatosModal(){

    asignarTexto(
        "nombreMarcacionManualAsistencia",
        colaboradorNombre
    );


    asignarTexto(
        "fechaMarcacionManualAsistencia",
        formatearFechaVisible(
            fechaSeleccionada
        )
    );


    const tipoElemento =
        document.getElementById(
            "tipoMarcacionManualAsistencia"
        );


    const icono =
        document.getElementById(
            "iconoTipoMarcacionManual"
        );


    if(tipoElemento){

        tipoElemento.textContent =
            tipoSolicitado ===
            "ENTRADA"
            ?
            "Entrada manual"
            :
            "Salida manual";


        tipoElemento.classList.toggle(
            "entrada",
            tipoSolicitado ===
            "ENTRADA"
        );


        tipoElemento.classList.toggle(
            "salida",
            tipoSolicitado ===
            "SALIDA"
        );

    }


    if(icono){

        icono.className =
            tipoSolicitado ===
            "ENTRADA"
            ?
            "bi bi-box-arrow-in-right"
            :
            "bi bi-box-arrow-right";

    }


    mostrarHorarioAsignado();

}


/*=====================================================
MOSTRAR HORARIO
=====================================================*/

function mostrarHorarioAsignado(){

    const contenedor =
        document.getElementById(
            "horarioMarcacionManualAsistencia"
        );


    if(!contenedor){

        return;

    }


    if(!horarioSeleccionado){

        contenedor.innerHTML = `
            <strong>
                Sin horario asignado
            </strong>

            <br>

            Primero debes asignar un horario al colaborador
            para poder interpretar correctamente la marcación.
        `;

        return;

    }


    const entrada =
        horarioSeleccionado.entrada ||
        {};


    const salida =
        horarioSeleccionado.salida ||
        {};


    contenedor.innerHTML = `
        <strong>
            ${escaparHTML(
                horarioSeleccionado.nombre ||
                "Horario"
            )}
        </strong>

        <br>

        Entrada:
        ${formatearHora(entrada.permitirDesde)}
        a
        ${formatearHora(entrada.permitirHasta)}

        <br>

        Salida:
        ${formatearHora(salida.permitirDesde)}
        a
        ${formatearHora(salida.permitirHasta)}
    `;

}


/*=====================================================
VALIDAR HORA
=====================================================*/

function validarHoraIngresada(){

    const hora =
        inputHora?.value ||
        "";


    const resultadoElemento =
        document.getElementById(
            "resultadoInterpretacionMarcacion"
        );


    const titulo =
        document.getElementById(
            "tituloInterpretacionMarcacion"
        );


    const detalle =
        document.getElementById(
            "detalleInterpretacionMarcacion"
        );


    if(
        !resultadoElemento
        ||
        !titulo
        ||
        !detalle
    ){

        return null;

    }


    resultadoElemento.classList.remove(
        "advertencia",
        "error"
    );


    if(!hora){

        resultadoElemento.hidden =
            true;

        return null;

    }


    resultadoElemento.hidden =
        false;


    if(!horarioSeleccionado){

        resultadoElemento.classList.add(
            "error"
        );


        titulo.textContent =
            "El colaborador no tiene horario";


        detalle.textContent =
            "Asigna primero un horario para esta fecha.";


        return {

            valido:false,

            tipoInterpretado:
                "SIN_CLASIFICAR"

        };

    }


    const interpretacion =
        interpretarHoraSegunHorarios({

            hora,

            horarios:[
                horarioSeleccionado
            ]

        });


    const tipoInterpretado =
        interpretacion.tipo;


    if(
        tipoInterpretado ===
        "SIN_CLASIFICAR"
    ){

        resultadoElemento.classList.add(
            "error"
        );


        titulo.textContent =
            "Hora fuera de las ventanas permitidas";


        detalle.textContent =
            `La hora ${hora} no corresponde a la entrada ni a la salida del horario.`;


        return {

            valido:false,

            tipoInterpretado

        };

    }


    if(
        tipoInterpretado !==
        tipoSolicitado
    ){

        resultadoElemento.classList.add(
            "advertencia"
        );


        titulo.textContent =
            "La hora corresponde a otro tipo";


        detalle.textContent =
            `La hora ${hora} fue interpretada como ${
                obtenerTextoTipo(
                    tipoInterpretado
                )
            }, pero estás registrando ${
                obtenerTextoTipo(
                    tipoSolicitado
                )
            }.`;

        return {

            valido:false,

            tipoInterpretado

        };

    }


    titulo.textContent =
        `${obtenerTextoTipo(
            tipoInterpretado
        )} válida`;


    detalle.textContent =
        `La hora ${hora} está dentro de la ventana configurada del horario.`;


    return {

        valido:true,

        tipoInterpretado,

        horarioId:
            interpretacion.horarioId

    };

}


/*=====================================================
GUARDAR MARCACIÓN
=====================================================*/

async function guardarMarcacionManual(){

    const usuario =
        auth.currentUser;


    if(!usuario){

        mostrarAdvertencia(
            "Sesión no disponible",
            "No existe un usuario autenticado."
        );

        return;

    }


    const hora =
        inputHora?.value ||
        "";


    const motivo =
        inputMotivo?.value
        .trim()
        ||
        "";


    if(!hora){

        mostrarAdvertencia(
            "Hora obligatoria",
            "Selecciona la hora de la marcación."
        );

        return;

    }


    if(!motivo){

        mostrarAdvertencia(
            "Motivo obligatorio",
            "Indica por qué se está registrando la marcación manualmente."
        );

        return;

    }


    const validacion =
        validarHoraIngresada();


    if(
        !validacion
        ||
        !validacion.valido
    ){

        mostrarAdvertencia(
            "Verifica la hora",
            "La hora ingresada no corresponde al tipo de marcación seleccionado."
        );

        return;

    }


    const fechaHora =
        crearFechaHoraLocal(
            fechaSeleccionada,
            hora
        );


    if(
        Number.isNaN(
            fechaHora.getTime()
        )
    ){

        mostrarAdvertencia(
            "Fecha incorrecta",
            "No se pudo interpretar la fecha y hora."
        );

        return;

    }


    const marcacionId =
        construirIdMarcacion(
            empresaId,
            colaboradorId,
            fechaHora
        );


    const referencia =
        doc(
            db,
            "marcaciones",
            marcacionId
        );


    try{

        btnGuardar.disabled =
            true;


        btnGuardar.innerHTML = `
            <span class="spinner-boton"></span>
            Guardando...
        `;


        const existente =
            await getDoc(
                referencia
            );


        if(existente.exists()){

            throw new Error(
                "Ya existe una marcación para el colaborador en esa fecha y hora."
            );

        }


        const colaboradorDocumentoFirestore =
            await getDoc(
                doc(
                    db,
                    "colaboradores",
                    colaboradorId
                )
            );


        const datosColaborador =
            colaboradorDocumentoFirestore.exists()
            ?
            colaboradorDocumentoFirestore.data()
            :
            {};


        await setDoc(
            referencia,
            {

                empresaId,

                colaboradorId,

                colaboradorNombre,

                colaboradorDocumento,

                fecha:
                    fechaSeleccionada,

                fechaHora:
                    Timestamp.fromDate(
                        fechaHora
                    ),

                fechaHoraISO:
                    convertirFechaHoraAISO(
                        fechaHora
                    ),

                hora:
                    `${hora}:00`,

                /*
                    Tipo declarado y validado utilizando
                    el horario del colaborador.
                */

                tipo:
                    tipoSolicitado,

                tipoOriginal:
                    "MANUAL",

                tipoInterpretado:
                    validacion.tipoInterpretado,

                horarioIdInterpretado:
                    validacion.horarioId ||
                    horarioSeleccionado?.id ||
                    null,

                origen:
                    "MANUAL",

                sucursalId:
                    datosColaborador.organizacion
                    ?.sucursalId
                    ||
                    datosColaborador.sucursalId
                    ||
                    null,

                areaId:
                    datosColaborador.organizacion
                    ?.areaId
                    ||
                    datosColaborador.areaId
                    ||
                    null,

                subareaId:
                    datosColaborador.organizacion
                    ?.subareaId
                    ||
                    datosColaborador.subareaId
                    ||
                    null,

                estado:
                    "VALIDA",

                observaciones:
                    motivo,

                motivoRegistroManual:
                    motivo,

                registradaManualmentePor:
                    usuario.uid,

                fechaRegistroManual:
                    serverTimestamp(),

                creadoPor:
                    usuario.uid,

                fechaCreacion:
                    serverTimestamp()

            }
        );


/*
    Guardamos los datos antes de cerrar el modal,
    porque cerrarModal() limpia las variables.
*/

const datosActualizacion = {

    colaboradorId,

    fecha:
        fechaSeleccionada,

    tipo:
        tipoSolicitado,

    hora

};


/*
    Avisamos inmediatamente al resumen para que
    vuelva a consultar las marcaciones.
*/

document.dispatchEvent(
    new CustomEvent(
        "asistencia:marcacion-manual-registrada",
        {
            detail:
                datosActualizacion
        }
    )
);


cerrarModal();


Swal.fire({

    icon:"success",

    title:"Marcación registrada",

    text:
        `${
            obtenerTextoTipo(
                datosActualizacion.tipo
            )
        } registrada correctamente a las ${
            datosActualizacion.hora
        }.`,

    confirmButtonColor:
        "#2563eb"

});

    }
    catch(error){

        console.error(
            "Error registrando marcación manual:",
            error
        );


        Swal.fire({

            icon:"error",

            title:"No se pudo registrar",

            text:
                error.message ||
                "Ocurrió un error al guardar la marcación.",

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
                Registrar marcación
            `;

        }

    }

}


/*=====================================================
LIMPIAR Y CERRAR
=====================================================*/

function limpiarFormulario(){

    if(inputHora){

        inputHora.value =
            "";

    }


    if(inputMotivo){

        inputMotivo.value =
            "";

    }


    asignarTexto(
        "contadorMotivoMarcacionManual",
        "0/300"
    );


    const resultado =
        document.getElementById(
            "resultadoInterpretacionMarcacion"
        );


    if(resultado){

        resultado.hidden =
            true;


        resultado.classList.remove(
            "advertencia",
            "error"
        );

    }

}


function cerrarModal(){

    if(modal){

        modal.style.display =
            "none";

    }


    limpiarFormulario();


    colaboradorId =
        null;

    colaboradorNombre =
        "";

    colaboradorDocumento =
        "";

    fechaSeleccionada =
        null;

    tipoSolicitado =
        null;

    horarioSeleccionado =
        null;

}


/*=====================================================
CONTADOR DE MOTIVO
=====================================================*/

function actualizarContadorMotivo(){

    const cantidad =
        inputMotivo?.value.length ||
        0;


    asignarTexto(
        "contadorMotivoMarcacionManual",
        `${cantidad}/300`
    );

}


/*=====================================================
UTILIDADES
=====================================================*/

function crearFechaHoraLocal(
    fecha,
    hora
){

    return new Date(
        `${fecha}T${hora}:00`
    );

}


function convertirFechaHoraAISO(
    fecha
){

    const anio =
        fecha.getFullYear();

    const mes =
        String(
            fecha.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );

    const dia =
        String(
            fecha.getDate()
        )
        .padStart(
            2,
            "0"
        );

    const hora =
        String(
            fecha.getHours()
        )
        .padStart(
            2,
            "0"
        );

    const minutos =
        String(
            fecha.getMinutes()
        )
        .padStart(
            2,
            "0"
        );

    const segundos =
        String(
            fecha.getSeconds()
        )
        .padStart(
            2,
            "0"
        );


    return `${anio}-${mes}-${dia}T${hora}:${minutos}:${segundos}`;

}


function construirIdMarcacion(
    empresa,
    colaborador,
    fechaHora
){

    return [

        limpiarParaId(
            empresa
        ),

        limpiarParaId(
            colaborador
        ),

        fechaHora.getTime()

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


function formatearHora(
    hora
){

    return hora
    ?
    String(
        hora
    )
    .slice(
        0,
        5
    )
    :
    "—";

}


function obtenerTextoTipo(
    tipo
){

    const textos = {

        ENTRADA:
            "entrada",

        SALIDA:
            "salida",

        INICIO_REFRIGERIO:
            "inicio de refrigerio",

        FIN_REFRIGERIO:
            "fin de refrigerio",

        SIN_CLASIFICAR:
            "marcación sin clasificar"

    };


    return textos[tipo]
    ||
    tipo;

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
