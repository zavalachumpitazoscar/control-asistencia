import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
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

let inicioRefrigerioActual = null;

let finRefrigerioActual = null;

let configuracionRefrigerio = null;

let empresaId = null;

let controlEventos = null;

let modoEdicion = false;

let marcacionEditando = null;

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

    document.addEventListener(
    "asistencia:editar-marcacion-existente",
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

    inicioRefrigerioActual =
    datos?.inicioRefrigerioActual ||
    null;


finRefrigerioActual =
    datos?.finRefrigerioActual ||
    null;


configuracionRefrigerio =
    datos?.refrigerio ||
    horarioSeleccionado?.refrigerio ||
    null;


marcacionEditando =
    datos?.marcacion ||
    null;


modoEdicion =
    Boolean(
        marcacionEditando?.id
    );
    
    if(
        !colaboradorId
        ||
        !fechaSeleccionada
        ||
![
    "ENTRADA",
    "INICIO_REFRIGERIO",
    "FIN_REFRIGERIO",
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
        modoEdicion
        ?
        String(
            marcacionEditando?.hora ||
            ""
        )
        .slice(
            0,
            5
        )
        :
        obtenerHoraSugerida();

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
OBTENER HORA SUGERIDA
=====================================================*/

function obtenerHoraSugerida(){

    if(
        tipoSolicitado ===
        "ENTRADA"
    ){

        return horarioSeleccionado
        ?.entrada
        ?.programada
        ||
        "";

    }


    if(
        tipoSolicitado ===
        "SALIDA"
    ){

        return horarioSeleccionado
        ?.salida
        ?.programada
        ||
        "";

    }


    if(
        tipoSolicitado ===
        "INICIO_REFRIGERIO"
    ){

        const desde =
            configuracionRefrigerio
            ?.permitirInicioDesde;


        const hasta =
            configuracionRefrigerio
            ?.permitirInicioHasta;


        if(
            desde
            &&
            hasta
        ){

            const puntoMedio =
                Math.floor(
                    (
                        convertirHoraAMinutos(
                            desde
                        )
                        +
                        convertirHoraAMinutos(
                            hasta
                        )
                    )
                    /
                    2
                );


            return convertirMinutosAHora(
                puntoMedio
            );

        }


        return desde ||
        "";

    }


    if(
        tipoSolicitado ===
        "FIN_REFRIGERIO"
    ){

        const horaInicio =
            obtenerHoraMarcacionLocal(
                inicioRefrigerioActual
            );


        if(horaInicio){

            return convertirMinutosAHora(

                convertirHoraAMinutos(
                    horaInicio
                )
                +
                Number(
                    configuracionRefrigerio
                    ?.duracionMinutos
                    ||
                    0
                )

            );

        }

    }


    return "";

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
    "tituloModalMarcacionManual",

    modoEdicion
    ?
    "Editar marcación"
    :
    "Registrar marcación manual"
);


asignarTexto(
    "subtituloModalMarcacionManual",

    modoEdicion
    ?
    "Modifica la hora registrada conservando el historial del cambio."
    :
    "Agrega una marcación faltante del colaborador."
);


if(btnGuardar){

    btnGuardar.innerHTML =
        modoEdicion
        ?
        `
            <i class="bi bi-pencil-square"></i>
            Guardar modificación
        `
        :
        `
            <i class="bi bi-check-circle"></i>
            Registrar marcación
        `;

}


if(inputMotivo){

    inputMotivo.placeholder =
        modoEdicion
        ?
        "Explica por qué se está modificando esta marcación."
        :
        "Ejemplo: El colaborador olvidó marcar su salida.";

}

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
        `${obtenerTextoTipo(
            tipoSolicitado
        )} manual`;


    tipoElemento.classList.remove(
        "entrada",
        "salida",
        "refrigerio"
    );


    if(
        tipoSolicitado ===
        "ENTRADA"
    ){

        tipoElemento.classList.add(
            "entrada"
        );

    }
    else if(
        tipoSolicitado ===
        "SALIDA"
    ){

        tipoElemento.classList.add(
            "salida"
        );

    }
    else{

        tipoElemento.classList.add(
            "refrigerio"
        );

    }

}


if(icono){

    const iconos = {

        ENTRADA:
            "bi bi-box-arrow-in-right",

        SALIDA:
            "bi bi-box-arrow-right",

        INICIO_REFRIGERIO:
            "bi bi-cup-hot",

        FIN_REFRIGERIO:
            "bi bi-cup-straw"

    };


    icono.className =
        iconos[tipoSolicitado]
        ||
        "bi bi-clock";

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

    /*
    FIN DEL REFRIGERIO

    No se puede interpretar solamente con la ventana
    de inicio. Debe ser posterior al inicio real y
    anterior a la salida.
*/

if(
    tipoSolicitado ===
    "FIN_REFRIGERIO"
){

    const horaInicio =
        obtenerHoraMarcacionLocal(
            inicioRefrigerioActual
        );


    if(!horaInicio){

        resultadoElemento.classList.add(
            "error"
        );


        titulo.textContent =
            "Falta el inicio del refrigerio";


        detalle.textContent =
            "Primero registra la marcación de inicio del refrigerio.";


        return {

            valido:false,

            tipoInterpretado:
                "FIN_REFRIGERIO"

        };

    }


    const minutosInicio =
        convertirHoraAMinutos(
            horaInicio
        );


    const minutosFin =
        convertirHoraAMinutos(
            hora
        );


    const minutosSalida =
        convertirHoraAMinutos(
            horarioSeleccionado
            ?.salida
            ?.permitirDesde
        );


    if(
        minutosFin <=
        minutosInicio
    ){

        resultadoElemento.classList.add(
            "error"
        );


        titulo.textContent =
            "Hora de término incorrecta";


        detalle.textContent =
            "El término del refrigerio debe ser posterior a su inicio.";


        return {

            valido:false,

            tipoInterpretado:
                "FIN_REFRIGERIO"

        };

    }


    if(
        minutosSalida
        &&
        minutosFin >=
        minutosSalida
    ){

        resultadoElemento.classList.add(
            "error"
        );


        titulo.textContent =
            "Hora fuera del refrigerio";


        detalle.textContent =
            "El término del refrigerio debe ser anterior a la ventana de salida.";


        return {

            valido:false,

            tipoInterpretado:
                "FIN_REFRIGERIO"

        };

    }


    const duracionReal =
        minutosFin -
        minutosInicio;


    const duracionPermitida =
        Number(
            configuracionRefrigerio
            ?.duracionMinutos
            ||
            0
        );


    titulo.textContent =
        "Fin de refrigerio válido";


    if(
        duracionReal ===
        duracionPermitida
    ){

        detalle.textContent =
            `El refrigerio tiene la duración programada de ${duracionPermitida} minutos.`;

    }
    else if(
        duracionReal <
        duracionPermitida
    ){

        resultadoElemento.classList.add(
            "advertencia"
        );


        detalle.textContent =
            `El refrigerio duró ${duracionReal} minutos, ${
                duracionPermitida - duracionReal
            } minutos menos de lo programado.`;

    }
    else{

        resultadoElemento.classList.add(
            "advertencia"
        );


        detalle.textContent =
            `El refrigerio duró ${duracionReal} minutos, ${
                duracionReal - duracionPermitida
            } minutos más de lo permitido.`;

    }


    return {

        valido:true,

        tipoInterpretado:
            "FIN_REFRIGERIO",

        horarioId:
            horarioSeleccionado.id

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


const marcacionIdNuevo =
    construirIdMarcacion(
        empresaId,
        colaboradorId,
        fechaHora
    );


const marcacionIdOriginal =
    modoEdicion
    ?
    marcacionEditando.id
    :
    marcacionIdNuevo;


const referencia =
    doc(
        db,
        "marcaciones",
        marcacionIdOriginal
    );


    try{

        btnGuardar.disabled =
            true;


        btnGuardar.innerHTML = `
            <span class="spinner-boton"></span>
            Guardando...
        `;


/*
    Si se modifica la hora, comprobamos que no exista
    otra marcación en la nueva fecha y hora.
*/

if(
    !modoEdicion
    ||
    marcacionIdNuevo !==
    marcacionIdOriginal
){

    const referenciaNueva =
        doc(
            db,
            "marcaciones",
            marcacionIdNuevo
        );


    const existente =
        await getDoc(
            referenciaNueva
        );


    if(existente.exists()){

        throw new Error(
            "Ya existe otra marcación para el colaborador en esa fecha y hora."
        );

    }

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


        if(modoEdicion){

    await updateDoc(
        referencia,
        {

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

            tipo:
                tipoSolicitado,

            tipoInterpretado:
                validacion.tipoInterpretado,

            horarioIdInterpretado:
                validacion.horarioId
                ||
                horarioSeleccionado?.id
                ||
                null,

            /*
                Información de la última edición.
            */

            editada:true,

            horaAnterior:
                marcacionEditando.hora
                ||
                null,

            fechaHoraAnterior:
                marcacionEditando.fechaHora
                ||
                null,

            motivoUltimaEdicion:
                motivo,

            editadaPor:
                usuario.uid,

            fechaEdicion:
                serverTimestamp(),

            /*
                Historial permanente.
            */

            historialEdiciones:
                arrayUnion({

                    horaAnterior:
                        marcacionEditando.hora
                        ||
                        null,

                    horaNueva:
                        `${hora}:00`,

                    tipoAnterior:
                        marcacionEditando.tipo
                        ||
                        "SIN_CLASIFICAR",

                    tipoNuevo:
                        tipoSolicitado,

                    motivo,

                    usuarioId:
                        usuario.uid,

                    fecha:
                        Timestamp.now()

                })

        }
    );

}
else{

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

            tipo:
                tipoSolicitado,

            tipoOriginal:
                "MANUAL",

            tipoInterpretado:
                validacion.tipoInterpretado,

            horarioIdInterpretado:
                validacion.horarioId
                ||
                horarioSeleccionado?.id
                ||
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

}

    


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

    inicioRefrigerioActual =
    null;

finRefrigerioActual =
    null;

configuracionRefrigerio =
    null;

modoEdicion =
    false;

marcacionEditando =
    null;

const fueEdicion =
    modoEdicion;

    Swal.fire({

    icon:"success",

    title:
        fueEdicion
        ?
        "Marcación modificada"
        :
        "Marcación registrada",

    text:
        fueEdicion
        ?
        `La marcación fue modificada correctamente a las ${hora}.`
        :
        `${
            obtenerTextoTipo(
                datosActualizacion.tipo
            )
        } registrada correctamente a las ${hora}.`,

    confirmButtonColor:
        "#2563eb"

});

    

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


function obtenerHoraMarcacionLocal(
    marcacion
){

    return String(
        marcacion?.hora ||
        ""
    )
    .slice(
        0,
        5
    );

}


function convertirHoraAMinutos(
    hora
){

    if(!hora){

        return 0;

    }


    const [
        horas,
        minutos
    ] =
        String(
            hora
        )
        .split(":")
        .map(Number);


    return (
        horas *
        60
    )
    +
    minutos;

}


function convertirMinutosAHora(
    minutosTotales
){

    const normalizados =
        (
            minutosTotales %
            1440
            +
            1440
        )
        %
        1440;


    const horas =
        Math.floor(
            normalizados /
            60
        );


    const minutos =
        normalizados %
        60;


    return `${
        String(
            horas
        )
        .padStart(
            2,
            "0"
        )
    }:${
        String(
            minutos
        )
        .padStart(
            2,
            "0"
        )
    }`;

}
