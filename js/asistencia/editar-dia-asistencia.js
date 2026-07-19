import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


import {
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

let buscarHorario;

let listaHorarios;

let seccionHorarios;

let colaboradorIdSeleccionado = null;

let fechaSeleccionada = null;

let empresaId = null;

let horarios = [];

let asignaciones = [];

let excepciones = [];

let horariosSeleccionados =
    new Set();

let moduloIniciado = false;


/*=====================================================
INICIAR EDITOR
=====================================================*/

export function iniciarEditarDiaAsistencia(){

    if(moduloIniciado){

        return;

    }


    modal =
        document.getElementById(
            "modalEditarDiaColaborador"
        );

    btnCerrar =
        document.getElementById(
            "cerrarEditarDiaColaborador"
        );

    btnCancelar =
        document.getElementById(
            "cancelarEditarDiaColaborador"
        );

    btnGuardar =
        document.getElementById(
            "guardarEditarDiaColaborador"
        );

    buscarHorario =
        document.getElementById(
            "buscarHorarioEditarDia"
        );

    listaHorarios =
        document.getElementById(
            "listaHorariosEditarDia"
        );

    seccionHorarios =
        document.getElementById(
            "seccionHorariosEditarDia"
        );


    if(!modal){

        console.warn(
            "No se encontró modalEditarDiaColaborador."
        );

        return;

    }


    empresaId =
        sessionStorage.getItem(
            "empresaId"
        );


    if(!empresaId){

        console.warn(
            "No se encontró la empresa activa."
        );

        return;

    }


    moduloIniciado =
        true;


    document.addEventListener(
        "asistencia:editar-horario-dia",
        evento=>{

            abrirEditorDiaAsistencia(
                evento.detail
            );

        }
    );


    btnCerrar?.addEventListener(
        "click",
        cerrarModal
    );


    btnCancelar?.addEventListener(
        "click",
        cerrarModal
    );


    btnGuardar?.addEventListener(
        "click",
        guardarCambioDia
    );


    buscarHorario?.addEventListener(
        "input",
        renderizarHorariosDisponibles
    );


    document
    .querySelectorAll(
        'input[name="accionEditarDia"]'
    )
    .forEach(input=>{

        input.addEventListener(
            "change",
            actualizarAccionSeleccionada
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

        }
    );

}


/*=====================================================
ABRIR EDITOR
=====================================================*/

async function abrirEditorDiaAsistencia(
    datos
){

    colaboradorIdSeleccionado =
        datos?.colaboradorId ||
        null;

    fechaSeleccionada =
        datos?.fecha ||
        null;


    if(
        !colaboradorIdSeleccionado
        ||
        !fechaSeleccionada
    ){

        return;

    }


    horariosSeleccionados.clear();


    if(buscarHorario){

        buscarHorario.value =
            "";

    }


    modal.style.display =
        "flex";


    mostrarCargandoModal();


    try{

        const [
            colaboradorDocumento,
            horariosEmpresa,
            asignacionesEmpresa,
            excepcionesEmpresa
        ] = await Promise.all([

            getDoc(
                doc(
                    db,
                    "colaboradores",
                    colaboradorIdSeleccionado
                )
            ),

            consultarColeccionEmpresa(
                "horarios"
            ),

            consultarColeccionEmpresa(
                "asignacionesHorarios"
            ),

            consultarColeccionEmpresa(
                "excepcionesHorarios"
            )

        ]);


        if(!colaboradorDocumento.exists()){

            throw new Error(
                "No se encontró el colaborador."
            );

        }


        horarios =
            horariosEmpresa.filter(
                horario=>

                    String(
                        horario.estado ||
                        "ACTIVO"
                    )
                    .toUpperCase() !==
                    "INACTIVO"

            );


        asignaciones =
            asignacionesEmpresa;


        excepciones =
            excepcionesEmpresa;


        const colaborador = {

            id:
                colaboradorDocumento.id,

            ...colaboradorDocumento.data()

        };


        mostrarInformacionColaborador(
            colaborador
        );


        prepararAccionInicial();


        renderizarHorariosActuales();

        renderizarHorariosDisponibles();

        actualizarAccionSeleccionada();

    }
    catch(error){

        console.error(
            "Error abriendo editor del día:",
            error
        );


        cerrarModal();


        Swal.fire({

            icon:"error",

            title:"No se pudo abrir",

            text:
                error.message ||
                "No se pudo cargar la programación.",

            confirmButtonColor:
                "#2563eb"

        });

    }

}


/*=====================================================
CONSULTAR COLECCIÓN
=====================================================*/

async function consultarColeccionEmpresa(
    nombreColeccion
){

    const consulta =
        query(
            collection(
                db,
                nombreColeccion
            ),
            where(
                "empresaId",
                "==",
                empresaId
            )
        );


    const resultado =
        await getDocs(
            consulta
        );


    return resultado.docs.map(
        documento=>({

            id:
                documento.id,

            ...documento.data()

        })
    );

}


/*=====================================================
INFORMACIÓN DEL COLABORADOR
=====================================================*/

function mostrarInformacionColaborador(
    colaborador
){

    const nombres =
        colaborador.datosPersonales
        ?.nombres
        ||
        colaborador.nombres
        ||
        "";


    const apellidos =
        colaborador.datosPersonales
        ?.apellidos
        ||
        colaborador.apellidos
        ||
        "";


    const nombreCompleto =
        [
            nombres,
            apellidos
        ]
        .filter(Boolean)
        .join(" ")
        .trim()
        ||
        colaborador.nombreCompleto
        ||
        "Colaborador";


    asignarTexto(
        "fechaEditarDiaColaborador",
        formatearFechaVisible(
            fechaSeleccionada
        )
    );


    asignarTexto(
        "nombreEditarDiaColaborador",
        nombreCompleto
    );

}


/*=====================================================
PREPARAR ACCIÓN INICIAL
=====================================================*/

function prepararAccionInicial(){

    const excepcion =
        obtenerExcepcionActual();


    let accion =
        "REEMPLAZAR";


    if(excepcion){

        accion =
            excepcion.tipo ||
            "REEMPLAZAR";


        (
            excepcion.horarioIds ||
            []
        )
        .forEach(horarioId=>{

            horariosSeleccionados.add(
                horarioId
            );

        });

    }


    const input =
        document.querySelector(
            `input[name="accionEditarDia"][value="${accion}"]`
        );


    if(input){

        input.checked =
            true;

    }

}


/*=====================================================
OBTENER EXCEPCIÓN ACTUAL
=====================================================*/

function obtenerExcepcionActual(){

    return excepciones.find(
        excepcion=>

            excepcion.colaboradorId ===
            colaboradorIdSeleccionado

            &&

            excepcion.fecha ===
            fechaSeleccionada

            &&

            String(
                excepcion.estado ||
                "ACTIVO"
            )
            .toUpperCase() !==
            "INACTIVO"

    )
    ||
    null;

}


/*=====================================================
HORARIOS BASE
=====================================================*/

function obtenerHorariosBase(){

    const horarioIds = [];


    asignaciones
    .filter(asignacion=>

        String(
            asignacion.estado ||
            "ACTIVO"
        )
        .toUpperCase() !==
        "INACTIVO"

        &&

        Array.isArray(
            asignacion.colaboradorIds
        )

        &&

        asignacion.colaboradorIds.includes(
            colaboradorIdSeleccionado
        )

    )
    .forEach(asignacion=>{

        horarioIds.push(
            ...obtenerHorariosAsignacionFecha(
                asignacion,
                fechaSeleccionada
            )
        );

    });


    return [
        ...new Set(
            horarioIds
        )
    ];

}


/*=====================================================
HORARIOS EFECTIVOS
=====================================================*/

function obtenerHorariosEfectivos(){

    const horariosBase =
        obtenerHorariosBase();


    const excepcion =
        obtenerExcepcionActual();


    if(!excepcion){

        return horariosBase;

    }


    if(
        excepcion.tipo ===
        "SIN_HORARIO"
    ){

        return [];

    }


    if(
        excepcion.tipo ===
        "REEMPLAZAR"
    ){

        return [
            ...new Set(
                excepcion.horarioIds ||
                []
            )
        ];

    }


    if(
        excepcion.tipo ===
        "AGREGAR"
    ){

        return [
            ...new Set([

                ...horariosBase,

                ...(
                    excepcion.horarioIds ||
                    []
                )

            ])
        ];

    }


    return horariosBase;

}


/*=====================================================
HORARIOS DE ASIGNACIÓN POR FECHA
=====================================================*/

function obtenerHorariosAsignacionFecha(
    asignacion,
    fecha
){

    if(
        asignacion.tipoAsignacion ===
        "DIARIA"
    ){

        return asignacion.fechaInicio ===
        fecha
        ?
        [
            asignacion.horarioId
        ]
        :
        [];

    }


    if(
        asignacion.tipoAsignacion ===
        "MENSUAL"
    ){

        return (
            asignacion.programacion ||
            []
        )
        .filter(item=>

            item.fecha ===
            fecha

        )
        .map(item=>

            item.horarioId

        );

    }


    if(
        asignacion.tipoAsignacion ===
        "SEMANAL"
    ){

        return obtenerHorariosSemanales(
            asignacion,
            fecha
        );

    }


    return [];

}


/*=====================================================
HORARIOS SEMANALES
=====================================================*/

function obtenerHorariosSemanales(
    asignacion,
    fecha
){

    if(
        !asignacion.fechaInicio
        ||
        !asignacion.fechaFin
        ||
        fecha < asignacion.fechaInicio
        ||
        fecha > asignacion.fechaFin
    ){

        return [];

    }


    const inicio =
        crearFechaLocal(
            asignacion.fechaInicio
        );


    const fechaActual =
        crearFechaLocal(
            fecha
        );


    const diferenciaDias =
        Math.floor(
            (
                fechaActual -
                inicio
            )
            /
            86400000
        );


    const numeroSemana =
        Math.floor(
            diferenciaDias /
            7
        );


    const intervalo =
        Math.max(
            1,
            Number(
                asignacion.intervaloSemanas ||
                1
            )
        );


    if(
        numeroSemana %
        intervalo !==
        0
    ){

        return [];

    }


    const nombresDias = [

        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado"

    ];


    const nombreDia =
        nombresDias[
            fechaActual.getDay()
        ];


    const horarioIds =
        asignacion.programacionSemanal
        ?.[nombreDia];


    return Array.isArray(
        horarioIds
    )
    ?
    horarioIds
    :
    [];

}


/*=====================================================
RENDERIZAR HORARIOS ACTUALES
=====================================================*/

function renderizarHorariosActuales(){

    const contenedor =
        document.getElementById(
            "horariosActualesEditarDia"
        );


    if(!contenedor){

        return;

    }


    const horarioIds =
        obtenerHorariosEfectivos();


    if(horarioIds.length === 0){

        contenedor.innerHTML = `
            <div class="sin-horarios-actuales">
                El colaborador no tiene horarios en esta fecha.
            </div>
        `;

        return;

    }


    contenedor.innerHTML =
        horarioIds
        .map(horarioId=>{

            const horario =
                horarios.find(
                    item=>
                        item.id ===
                        horarioId
                );


            if(!horario){

                return "";

            }


            return `
                <div class="horario-actual-editar-dia">

                    <div>

                        <strong>
                            ${escaparHTML(
                                horario.nombre ||
                                "Horario"
                            )}
                        </strong>

                        <span>

                            ${formatearHora(
                                horario.entrada
                                ?.programada
                            )}

                            -

                            ${formatearHora(
                                horario.salida
                                ?.programada
                            )}

                        </span>

                    </div>

                </div>
            `;

        })
        .join("");

}


/*=====================================================
RENDERIZAR HORARIOS DISPONIBLES
=====================================================*/

function renderizarHorariosDisponibles(){

    if(!listaHorarios){

        return;

    }


    const texto =
        String(
            buscarHorario?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filtrados =
        horarios.filter(horario=>

            String(
                horario.nombre ||
                ""
            )
            .toLowerCase()
            .includes(
                texto
            )

            ||

            String(
                horario.descripcion ||
                ""
            )
            .toLowerCase()
            .includes(
                texto
            )

        );


    if(filtrados.length === 0){

        listaHorarios.innerHTML = `
            <div class="sin-horarios-actuales">
                No se encontraron horarios disponibles.
            </div>
        `;

        return;

    }


    listaHorarios.innerHTML =
        filtrados.map(horario=>{

            const seleccionado =
                horariosSeleccionados.has(
                    horario.id
                );


            return `
                <label
                    class="horario-editar-dia-item ${
                        seleccionado
                        ?
                        "seleccionado"
                        :
                        ""
                    }"
                >

                    <input
                        type="checkbox"
                        class="check-horario-editar-dia"
                        value="${escaparHTML(horario.id)}"
                        ${
                            seleccionado
                            ?
                            "checked"
                            :
                            ""
                        }
                    >

                    <div class="horario-editar-dia-datos">

                        <strong>
                            ${escaparHTML(
                                horario.nombre ||
                                "Horario"
                            )}
                        </strong>

                        <span>

                            ${formatearHora(
                                horario.entrada
                                ?.programada
                            )}

                            -

                            ${formatearHora(
                                horario.salida
                                ?.programada
                            )}

                        </span>

                    </div>

                </label>
            `;

        })
        .join("");


    listaHorarios
    .querySelectorAll(
        ".check-horario-editar-dia"
    )
    .forEach(check=>{

        check.addEventListener(
            "change",
            ()=>{

                if(check.checked){

                    horariosSeleccionados.add(
                        check.value
                    );

                }
                else{

                    horariosSeleccionados.delete(
                        check.value
                    );

                }


                check
                .closest(
                    ".horario-editar-dia-item"
                )
                ?.classList.toggle(
                    "seleccionado",
                    check.checked
                );

            }
        );

    });

}


/*=====================================================
ACCIÓN SELECCIONADA
=====================================================*/

function obtenerAccionSeleccionada(){

    return document.querySelector(
        'input[name="accionEditarDia"]:checked'
    )
    ?.value
    ||
    "REEMPLAZAR";

}


function actualizarAccionSeleccionada(){

    const accion =
        obtenerAccionSeleccionada();


    if(seccionHorarios){

        seccionHorarios.hidden =
            accion ===
            "SIN_HORARIO"

            ||

            accion ===
            "RESTAURAR";

    }

}


/*=====================================================
GUARDAR CAMBIO
=====================================================*/

async function guardarCambioDia(){

    if(
        !colaboradorIdSeleccionado
        ||
        !fechaSeleccionada
    ){

        return;

    }


    const accion =
        obtenerAccionSeleccionada();


    const horarioIds =
        [
            ...horariosSeleccionados
        ];


    if(
        (
            accion ===
            "REEMPLAZAR"

            ||

            accion ===
            "AGREGAR"
        )

        &&

        horarioIds.length === 0
    ){

        Swal.fire({

            icon:"warning",

            title:"Selecciona un horario",

            text:
                "Debes seleccionar al menos un horario para aplicar este cambio.",

            confirmButtonColor:
                "#2563eb"

        });

        return;

    }


    let horariosFinales =
        horarioIds;


    if(
        accion ===
        "AGREGAR"
    ){

        horariosFinales =
            [
                ...new Set([

                    ...obtenerHorariosBase(),

                    ...horarioIds

                ])
            ];

    }


    if(
        accion ===
        "REEMPLAZAR"
    ){

        horariosFinales =
            horarioIds;

    }


    if(
        (
            accion ===
            "REEMPLAZAR"

            ||

            accion ===
            "AGREGAR"
        )

        &&

        !validarHorariosSinCruce(
            horariosFinales
        )
    ){

        Swal.fire({

            icon:"warning",

            title:"Horarios superpuestos",

            text:
                "Los horarios seleccionados se cruzan entre sí. Selecciona horarios que no se superpongan.",

            confirmButtonColor:
                "#2563eb"

        });

        return;

    }


    const excepcionId =
        construirIdExcepcion();


    try{

        btnGuardar.disabled =
            true;


        btnGuardar.innerHTML = `
            <span class="spinner-boton"></span>
            Guardando...
        `;


        if(
            accion ===
            "RESTAURAR"
        ){

            await deleteDoc(
                doc(
                    db,
                    "excepcionesHorarios",
                    excepcionId
                )
            );

        }
        else{

            await setDoc(
                doc(
                    db,
                    "excepcionesHorarios",
                    excepcionId
                ),
                {

                    empresaId,

                    colaboradorId:
                        colaboradorIdSeleccionado,

                    fecha:
                        fechaSeleccionada,

                    tipo:
                        accion,

                    horarioIds:
                        accion ===
                        "SIN_HORARIO"
                        ?
                        []
                        :
                        horarioIds,

                    estado:
                        "ACTIVO",

                    fechaModificacion:
                        serverTimestamp(),

                    fechaRegistro:
                        serverTimestamp()

                },
                {
                    merge:true
                }
            );

        }


        cerrarModal();


        await Swal.fire({

            icon:"success",

            title:"Programación actualizada",

            text:
                "El horario del colaborador fue actualizado para la fecha seleccionada.",

            confirmButtonColor:
                "#2563eb"

        });


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:horario-dia-actualizado",
                {
                    detail:{

                        colaboradorId:
                            colaboradorIdSeleccionado,

                        fecha:
                            fechaSeleccionada

                    }
                }
            )
        );

    }
    catch(error){

        console.error(
            "Error guardando programación:",
            error
        );


        Swal.fire({

            icon:"error",

            title:"No se pudo guardar",

            text:
                error.message ||
                "Ocurrió un error al modificar el horario.",

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
                Aplicar cambio
            `;

        }

    }

}


/*=====================================================
VALIDAR SUPERPOSICIÓN
=====================================================*/

function validarHorariosSinCruce(
    horarioIds
){

    for(
        let primero = 0;
        primero < horarioIds.length;
        primero++
    ){

        for(
            let segundo = primero + 1;
            segundo < horarioIds.length;
            segundo++
        ){

            const horarioA =
                horarios.find(
                    horario=>
                        horario.id ===
                        horarioIds[primero]
                );


            const horarioB =
                horarios.find(
                    horario=>
                        horario.id ===
                        horarioIds[segundo]
                );


            if(
                horarioA
                &&
                horarioB
                &&
                horariosSeSuperponen(
                    horarioA,
                    horarioB
                )
            ){

                return false;

            }

        }

    }


    return true;

}


function horariosSeSuperponen(
    horarioA,
    horarioB
){

    const rangoA =
        obtenerRangoHorario(
            horarioA
        );


    const rangoB =
        obtenerRangoHorario(
            horarioB
        );


    return (
        rangoA.inicio <
        rangoB.fin

        &&

        rangoB.inicio <
        rangoA.fin
    );

}


function obtenerRangoHorario(
    horario
){

    const inicio =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    let fin =
        convertirHoraAMinutos(
            horario.salida
            ?.programada
        );


    if(
        horario.cruzaMedianoche
        ||
        fin <= inicio
    ){

        fin +=
            1440;

    }


    return {
        inicio,
        fin
    };

}


/*=====================================================
CARGANDO
=====================================================*/

function mostrarCargandoModal(){

    asignarTexto(
        "fechaEditarDiaColaborador",
        formatearFechaVisible(
            fechaSeleccionada
        )
    );


    asignarTexto(
        "nombreEditarDiaColaborador",
        "Cargando colaborador..."
    );


    const actuales =
        document.getElementById(
            "horariosActualesEditarDia"
        );


    if(actuales){

        actuales.innerHTML = `
            <div class="sin-horarios-actuales">
                Cargando programación...
            </div>
        `;

    }


    if(listaHorarios){

        listaHorarios.innerHTML = `
            <div class="sin-horarios-actuales">
                Cargando horarios...
            </div>
        `;

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


    colaboradorIdSeleccionado =
        null;

    fechaSeleccionada =
        null;

    horariosSeleccionados.clear();


    if(buscarHorario){

        buscarHorario.value =
            "";

    }

}


/*=====================================================
UTILIDADES
=====================================================*/

function construirIdExcepcion(){

    return `${empresaId}_${colaboradorIdSeleccionado}_${fechaSeleccionada}`;

}


function crearFechaLocal(
    fechaISO
){

    return new Date(
        `${fechaISO}T00:00:00`
    );

}


function formatearFechaVisible(
    fechaISO
){

    const fecha =
        crearFechaLocal(
            fechaISO
        );


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
        fecha
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
