import {
    collection,
    query,
    where,
    getDocs
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


import {
    db
}
from "../firebase-config.js";


/*=====================================================
VARIABLES
=====================================================*/

let fechaResumenSeleccionada = "";

let registrosResumen = [];

let cuerpoResumen;

let buscarResumen;

let filtroSucursal;

let filtroArea;

let filtroSubarea;

let filtroEstado;

let btnLimpiarFiltros;


/*=====================================================
INICIAR RESUMEN
=====================================================*/

export function iniciarResumenAsistencia(){

    cuerpoResumen =
        document.getElementById(
            "cuerpoResumenAsistencia"
        );

    buscarResumen =
        document.getElementById(
            "buscarResumenAsistencia"
        );

    filtroSucursal =
        document.getElementById(
            "filtroSucursalAsistencia"
        );

    filtroArea =
        document.getElementById(
            "filtroAreaAsistencia"
        );

    filtroSubarea =
        document.getElementById(
            "filtroSubareaAsistencia"
        );

    filtroEstado =
        document.getElementById(
            "filtroEstadoAsistencia"
        );

    btnLimpiarFiltros =
        document.getElementById(
            "btnLimpiarFiltrosAsistencia"
        );


    if(!cuerpoResumen){

        console.warn(
            "No se encontró cuerpoResumenAsistencia."
        );

        return;

    }


    buscarResumen?.addEventListener(
        "input",
        renderizarResumenAsistencia
    );


    filtroSucursal?.addEventListener(
        "change",
        renderizarResumenAsistencia
    );


    filtroArea?.addEventListener(
        "change",
        renderizarResumenAsistencia
    );


    filtroSubarea?.addEventListener(
        "change",
        renderizarResumenAsistencia
    );


    filtroEstado?.addEventListener(
        "change",
        renderizarResumenAsistencia
    );


    btnLimpiarFiltros?.addEventListener(
        "click",
        limpiarFiltrosAsistencia
    );


    document.addEventListener(
        "asistencia:cambio-fecha",
        evento=>{

            fechaResumenSeleccionada =
                evento.detail.fecha;

            cargarResumenAsistencia(
                fechaResumenSeleccionada
            );

        }
    );

    document.addEventListener(
    "asistencia:horario-dia-actualizado",
    ()=>{

        if(fechaResumenSeleccionada){

            cargarResumenAsistencia(
                fechaResumenSeleccionada
            );

        }

    }
);

    document.addEventListener(
        "asistencia:marcaciones-importadas",
        ()=>{

            if(fechaResumenSeleccionada){

                cargarResumenAsistencia(
                    fechaResumenSeleccionada
                );

            }

        }
    );

    cuerpoResumen.addEventListener(
    "click",
    evento=>{

        const boton =
            evento.target.closest(
                '[data-accion="editar-horario-dia"]'
            );


        if(!boton){

            return;

        }


        const colaboradorId =
            boton.dataset.colaboradorId;


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:editar-horario-dia",
                {
                    detail:{

                        colaboradorId,

                        fecha:
                            fechaResumenSeleccionada

                    }
                }
            )
        );

    }
);

}


/*=====================================================
CARGAR RESUMEN
=====================================================*/

async function cargarResumenAsistencia(
    fecha
){

    const empresaId =
        sessionStorage.getItem(
            "empresaId"
        );


    if(!empresaId){

        mostrarMensajeTabla(
            "No se encontró la empresa activa."
        );

        return;

    }


    mostrarMensajeTabla(
        "Cargando resumen de asistencia..."
    );


    try{

        const [
            colaboradores,
            marcaciones,
            asignaciones,
            horarios,
            excepciones,
            sucursales,
            areas,
            subareas
        ] = await Promise.all([

            consultarColeccionEmpresa(
                "colaboradores",
                empresaId
            ),

            consultarColeccionEmpresa(
                "marcaciones",
                empresaId
            ),

            consultarColeccionEmpresa(
                "asignacionesHorarios",
                empresaId
            ),

            consultarColeccionEmpresa(
                "horarios",
                empresaId
            ),

            consultarColeccionEmpresa(
                "excepcionesHorarios",
                empresaId
            ),

            consultarColeccionEmpresa(
                "sucursales",
                empresaId
            ),

            consultarColeccionEmpresa(
                "areas",
                empresaId
            ),

            consultarColeccionEmpresa(
                "subareas",
                empresaId
            )

        ]);


        cargarOpcionesFiltro(
            filtroSucursal,
            sucursales,
            "Todas las sucursales"
        );


        cargarOpcionesFiltro(
            filtroArea,
            areas,
            "Todas las áreas"
        );


        cargarOpcionesFiltro(
            filtroSubarea,
            subareas,
            "Todas las subáreas"
        );


        registrosResumen =
            construirRegistrosResumen({

                fecha,

                colaboradores,

                marcaciones,

                asignaciones,

                horarios,

                excepciones

            });


        renderizarResumenAsistencia();

    }
    catch(error){

        console.error(
            "Error cargando resumen:",
            error
        );


        mostrarMensajeTabla(
            "No se pudo cargar el resumen de asistencia."
        );

    }

}


/*=====================================================
CONSULTAR COLECCIÓN
=====================================================*/

async function consultarColeccionEmpresa(
    nombreColeccion,
    empresaId
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
CONSTRUIR REGISTROS
=====================================================*/

function construirRegistrosResumen({

    fecha,
    colaboradores,
    marcaciones,
    asignaciones,
    horarios,
    excepciones

}){

    const horariosPorId =
        new Map(
            horarios.map(
                horario=>[
                    horario.id,
                    horario
                ]
            )
        );


    const marcacionesPorColaborador =
        agruparMarcaciones(
            marcaciones,
            fecha
        );


    return colaboradores
    .filter(colaborador=>

        String(
            colaborador.estado ||
            "ACTIVO"
        )
        .toUpperCase() !==
        "INACTIVO"

    )
    .map(colaborador=>{

        const horarioIds =
            obtenerHorariosEfectivos({

                colaboradorId:
                    colaborador.id,

                fecha,

                asignaciones,

                excepciones

            });


        const horariosDia =
            horarioIds
            .map(id=>
                horariosPorId.get(id)
            )
            .filter(Boolean);


        const marcacionesDia =
            marcacionesPorColaborador.get(
                colaborador.id
            )
            ||
            [];


        return construirRegistroColaborador(

            colaborador,

            horariosDia,

            marcacionesDia

        );

    })
    .sort(
        (
            primero,
            segundo
        )=>

            primero.nombre.localeCompare(
                segundo.nombre,
                "es"
            )

    );

}


/*=====================================================
AGRUPAR MARCACIONES
=====================================================*/

function agruparMarcaciones(
    marcaciones,
    fecha
){

    const resultado =
        new Map();


    marcaciones
    .filter(marcacion=>

        marcacion.fecha === fecha

        &&

        String(
            marcacion.estado ||
            "VALIDA"
        )
        .toUpperCase() ===
        "VALIDA"

    )
    .forEach(marcacion=>{

        if(
            !resultado.has(
                marcacion.colaboradorId
            )
        ){

            resultado.set(
                marcacion.colaboradorId,
                []
            );

        }


        resultado
        .get(
            marcacion.colaboradorId
        )
        .push(
            marcacion
        );

    });


    resultado.forEach(lista=>{

        lista.sort(
            (
                primero,
                segundo
            )=>

                obtenerMilisegundosMarcacion(
                    primero
                )
                -
                obtenerMilisegundosMarcacion(
                    segundo
                )

        );

    });


    return resultado;

}


/*=====================================================
HORARIOS EFECTIVOS
=====================================================*/

function obtenerHorariosEfectivos({

    colaboradorId,
    fecha,
    asignaciones,
    excepciones

}){

    let horarioIds = [];


    asignaciones
    .filter(asignacion=>

        asignacion.estado !==
        "INACTIVO"

        &&

        Array.isArray(
            asignacion.colaboradorIds
        )

        &&

        asignacion.colaboradorIds.includes(
            colaboradorId
        )

    )
    .forEach(asignacion=>{

        horarioIds.push(
            ...obtenerHorariosAsignacionFecha(
                asignacion,
                fecha
            )
        );

    });


    horarioIds =
        [
            ...new Set(
                horarioIds
            )
        ];


    const excepcion =
        excepciones.find(item=>

            item.colaboradorId ===
            colaboradorId

            &&

            item.fecha ===
            fecha

            &&

            item.estado !==
            "INACTIVO"

        );


    if(!excepcion){

        return horarioIds;

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

                ...horarioIds,

                ...(
                    excepcion.horarioIds ||
                    []
                )

            ])
        ];

    }


    return horarioIds;

}


/*=====================================================
HORARIOS SEGÚN TIPO DE ASIGNACIÓN
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
HORARIO SEMANAL
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


    const seleccionada =
        crearFechaLocal(
            fecha
        );


    const diferenciaDias =
        Math.floor(
            (
                seleccionada -
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
        Number(
            asignacion.intervaloSemanas ||
            1
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
            seleccionada.getDay()
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
CONSTRUIR REGISTRO DEL COLABORADOR
=====================================================*/

function construirRegistroColaborador(
    colaborador,
    horarios,
    marcaciones
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


    const nombre =
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


    const documento =
        colaborador.documento
        ?.numero
        ||
        colaborador.numeroDocumento
        ||
        colaborador.dni
        ||
        "";


    const entrada =
        marcaciones[0]
        ||
        null;


    const salida =
        marcaciones.length >= 2
        ?
        marcaciones[
            marcaciones.length - 1
        ]
        :
        null;


    const horarioPrincipal =
        [...horarios]
        .sort(
            (
                primero,
                segundo
            )=>

                convertirHoraAMinutos(
                    primero.entrada?.programada
                )
                -
                convertirHoraAMinutos(
                    segundo.entrada?.programada
                )

        )[0]
        ||
        null;


    let estado = "SIN_HORARIO";

    let tardanzaMinutos = 0;


    if(
        horarios.length > 0
        &&
        marcaciones.length === 0
    ){

        estado =
            "AUSENTE";

    }
    else if(
        marcaciones.length === 1
    ){

        estado =
            "INCOMPLETO";

    }
    else if(
        marcaciones.length >= 2
    ){

        if(horarioPrincipal){

            const entradaProgramada =
                convertirHoraAMinutos(
                    horarioPrincipal.entrada
                    ?.programada
                );


            const tolerancia =
                Number(
                    horarioPrincipal.entrada
                    ?.toleranciaMinutos
                    ||
                    0
                );


            const entradaReal =
                convertirHoraAMinutos(
                    obtenerHoraMarcacion(
                        entrada
                    )
                );


            tardanzaMinutos =
                Math.max(
                    0,
                    entradaReal -
                    (
                        entradaProgramada +
                        tolerancia
                    )
                );


            estado =
                tardanzaMinutos > 0
                ?
                "TARDANZA"
                :
                "PRESENTE";

        }
        else{

            estado =
                "PRESENTE";

        }

    }


    return {

        colaboradorId:
            colaborador.id,

        nombre,

        documento,

        iniciales:
            obtenerIniciales(
                nombre
            ),

        sucursalId:
            colaborador.organizacion
            ?.sucursalId
            ||
            colaborador.sucursalId
            ||
            "",

        areaId:
            colaborador.organizacion
            ?.areaId
            ||
            colaborador.areaId
            ||
            "",

        subareaId:
            colaborador.organizacion
            ?.subareaId
            ||
            colaborador.subareaId
            ||
            "",

        horarios,

        horarioPrincipal,

        entrada,

        salida,

        cantidadMarcaciones:
            marcaciones.length,

        estado,

        tardanzaMinutos,

        minutosTrabajados:
            calcularMinutosTrabajados(
                entrada,
                salida
            )

    };

}


/*=====================================================
RENDERIZAR
=====================================================*/

function renderizarResumenAsistencia(){

    if(!cuerpoResumen){

        return;

    }


    const texto =
        String(
            buscarResumen?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const sucursalId =
        filtroSucursal?.value ||
        "";


    const areaId =
        filtroArea?.value ||
        "";


    const subareaId =
        filtroSubarea?.value ||
        "";


    const estado =
        filtroEstado?.value ||
        "";


    const filtrados =
        registrosResumen.filter(
            registro=>{

                const coincideTexto =
                    !texto
                    ||
                    registro.nombre
                    .toLowerCase()
                    .includes(texto)
                    ||
                    String(
                        registro.documento
                    )
                    .includes(texto);


                const coincideSucursal =
                    !sucursalId
                    ||
                    registro.sucursalId ===
                    sucursalId;


                const coincideArea =
                    !areaId
                    ||
                    registro.areaId ===
                    areaId;


                const coincideSubarea =
                    !subareaId
                    ||
                    registro.subareaId ===
                    subareaId;


                const coincideEstado =
                    !estado
                    ||
                    registro.estado ===
                    estado;


                return (
                    coincideTexto
                    &&
                    coincideSucursal
                    &&
                    coincideArea
                    &&
                    coincideSubarea
                    &&
                    coincideEstado
                );

            }
        );


    actualizarContadores(
        registrosResumen
    );


    actualizarInformacionPaginacion(
        filtrados.length
    );


    if(filtrados.length === 0){

        mostrarMensajeTabla(
            "No existen colaboradores para los filtros seleccionados."
        );

        return;

    }


    cuerpoResumen.innerHTML =
        filtrados
        .map(
            crearFilaResumen
        )
        .join("");

}


/*=====================================================
CREAR FILA
=====================================================*/

function crearFilaResumen(
    registro
){

    return `
        <tr>

            <td>

                <div class="asistencia-colaborador">

                    <div class="asistencia-avatar">
                        ${escaparHTML(registro.iniciales)}
                    </div>

                    <div>

                        <strong>
                            ${escaparHTML(registro.nombre)}
                        </strong>

                        <span>
                            DNI ${escaparHTML(registro.documento || "—")}
                        </span>

                    </div>

                </div>

            </td>


            <td>
                ${crearHorarioHTML(registro)}
            </td>


            <td>
                ${crearEntradaHTML(registro)}
            </td>


            <td>
                ${crearSalidaHTML(registro)}
            </td>


            <td>

                <span class="estado-asistencia ${obtenerClaseEstado(registro.estado)}">

                    ${obtenerTextoEstado(registro.estado)}

                </span>

            </td>


            <td>

                <span class="valor-asistencia ${
                    registro.tardanzaMinutos > 0
                    ?
                    "negativo"
                    :
                    "neutro"
                }">

                    ${
                        registro.tardanzaMinutos > 0
                        ?
                        `${registro.tardanzaMinutos} min`
                        :
                        registro.estado === "PRESENTE"
                        ?
                        "0 min"
                        :
                        "—"
                    }

                </span>

            </td>


            <td>

                <strong class="horas-trabajadas">

                    ${formatearMinutosTrabajados(registro)}

                </strong>

            </td>


            <td class="columna-acciones-asistencia">

                <button
                    type="button"
                    class="btn-ver-asistencia"
                    data-colaborador-id="${escaparHTML(registro.colaboradorId)}"
                >

                    <i class="bi bi-eye"></i>

                    Ver

                </button>

            </td>

        </tr>
    `;

}


/*=====================================================
HTML HORARIO
=====================================================*/

function crearHorarioHTML(
    registro
){

    const horario =
        registro.horarioPrincipal;


    if(!horario){

        return `
            <button
                type="button"
                class="btn-asignar-horario-resumen"
                data-accion="editar-horario-dia"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="Asignar horario para esta fecha"
            >

                <i class="bi bi-calendar-plus"></i>

                <span>

                    <strong>
                        Sin horario
                    </strong>

                    <small>
                        Agregar horario
                    </small>

                </span>

            </button>
        `;

    }


    return `
        <button
            type="button"
            class="btn-horario-resumen"
            data-accion="editar-horario-dia"
            data-colaborador-id="${escaparHTML(
                registro.colaboradorId
            )}"
            title="Editar horario de esta fecha"
        >

            <i class="bi bi-clock"></i>

            <span>

                <strong>

                    ${formatearHora(
                        horario.entrada?.programada
                    )}

                    -

                    ${formatearHora(
                        horario.salida?.programada
                    )}

                </strong>

                <small>
                    ${escaparHTML(
                        horario.nombre ||
                        "Horario"
                    )}
                </small>

            </span>

        </button>
    `;

}


/*=====================================================
HTML ENTRADA
=====================================================*/

function crearEntradaHTML(
    registro
){

    if(!registro.entrada){

        return `
            <div class="asistencia-marcacion faltante">

                <i class="bi bi-x-circle"></i>

                <div>

                    <strong>
                        Sin entrada
                    </strong>

                    <span>
                        Sin marcación
                    </span>

                </div>

            </div>
        `;

    }


    const clase =
        registro.estado ===
        "TARDANZA"
        ?
        "tardanza"
        :
        "correcta";


    return `
        <div class="asistencia-marcacion ${clase}">

            <i class="bi bi-box-arrow-in-right"></i>

            <div>

                <strong>
                    ${formatearHora(obtenerHoraMarcacion(registro.entrada))}
                </strong>

                <span>

                    ${
                        registro.horarioPrincipal
                        ?
                        `Programado ${
                            formatearHora(
                                registro.horarioPrincipal
                                .entrada?.programada
                            )
                        }`
                        :
                        "Sin horario programado"
                    }

                </span>

            </div>

        </div>
    `;

}


/*=====================================================
HTML SALIDA
=====================================================*/

function crearSalidaHTML(
    registro
){

    if(!registro.salida){

        return `
            <div class="asistencia-marcacion pendiente">

                <i class="bi bi-hourglass-split"></i>

                <div>

                    <strong>
                        Sin salida
                    </strong>

                    <span>
                        Falta marcación
                    </span>

                </div>

            </div>
        `;

    }


    return `
        <div class="asistencia-marcacion correcta">

            <i class="bi bi-box-arrow-right"></i>

            <div>

                <strong>
                    ${formatearHora(obtenerHoraMarcacion(registro.salida))}
                </strong>

                <span>

                    ${
                        registro.horarioPrincipal
                        ?
                        `Programado ${
                            formatearHora(
                                registro.horarioPrincipal
                                .salida?.programada
                            )
                        }`
                        :
                        "Sin horario programado"
                    }

                </span>

            </div>

        </div>
    `;

}


/*=====================================================
CONTADORES
=====================================================*/

function actualizarContadores(
    registros
){

    asignarContador(
        "totalProgramadosAsistencia",
        registros.filter(
            registro=>
                registro.horarios.length > 0
        ).length
    );


    asignarContador(
        "totalPresentesAsistencia",
        registros.filter(
            registro=>
                registro.estado === "PRESENTE"
        ).length
    );


    asignarContador(
        "totalTardanzasAsistencia",
        registros.filter(
            registro=>
                registro.estado === "TARDANZA"
        ).length
    );


    asignarContador(
        "totalAusentesAsistencia",
        registros.filter(
            registro=>
                registro.estado === "AUSENTE"
        ).length
    );


    /*
        Los permisos se integrarán cuando crucemos
        la colección de permisos aprobados.
    */

    asignarContador(
        "totalPermisosAsistencia",
        0
    );


    asignarContador(
        "totalIncompletosAsistencia",
        registros.filter(
            registro=>
                registro.estado === "INCOMPLETO"
        ).length
    );

}


/*=====================================================
FILTROS
=====================================================*/

function cargarOpcionesFiltro(
    select,
    elementos,
    textoInicial
){

    if(!select){

        return;

    }


    const valorActual =
        select.value;


    select.innerHTML =
        `
            <option value="">
                ${textoInicial}
            </option>
        `
        +
        elementos
        .filter(item=>

            item.estado !==
            "INACTIVO"

        )
        .sort(
            (
                primero,
                segundo
            )=>

                String(
                    primero.nombre ||
                    ""
                )
                .localeCompare(
                    String(
                        segundo.nombre ||
                        ""
                    ),
                    "es"
                )

        )
        .map(item=>
            `
                <option value="${escaparHTML(item.id)}">
                    ${escaparHTML(item.nombre || "Sin nombre")}
                </option>
            `
        )
        .join("");


    select.value =
        valorActual;

}


function limpiarFiltrosAsistencia(){

    if(buscarResumen){

        buscarResumen.value =
            "";

    }


    [
        filtroSucursal,
        filtroArea,
        filtroSubarea,
        filtroEstado
    ]
    .forEach(select=>{

        if(select){

            select.value =
                "";

        }

    });


    renderizarResumenAsistencia();

}


/*=====================================================
UTILIDADES
=====================================================*/

function obtenerMilisegundosMarcacion(
    marcacion
){

    if(
        marcacion.fechaHora
        ?.toMillis
    ){

        return marcacion.fechaHora.toMillis();

    }


    return new Date(
        marcacion.fechaHoraISO ||
        `${marcacion.fecha}T${marcacion.hora}`
    )
    .getTime();

}


function obtenerHoraMarcacion(
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


function calcularMinutosTrabajados(
    entrada,
    salida
){

    if(
        !entrada
        ||
        !salida
    ){

        return 0;

    }


    return Math.max(
        0,
        Math.floor(
            (
                obtenerMilisegundosMarcacion(
                    salida
                )
                -
                obtenerMilisegundosMarcacion(
                    entrada
                )
            )
            /
            60000
        )
    );

}


function formatearMinutosTrabajados(
    registro
){

    if(
        registro.cantidadMarcaciones ===
        1
    ){

        return "Incompleto";

    }


    if(
        registro.minutosTrabajados <=
        0
    ){

        return "0 h";

    }


    const horas =
        Math.floor(
            registro.minutosTrabajados /
            60
        );


    const minutos =
        registro.minutosTrabajados %
        60;


    return `${horas} h ${minutos} min`;

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


function crearFechaLocal(
    fechaISO
){

    return new Date(
        `${fechaISO}T00:00:00`
    );

}


function obtenerIniciales(
    nombre
){

    return String(
        nombre
    )
    .trim()
    .split(/\s+/)
    .slice(
        0,
        2
    )
    .map(parte=>

        parte.charAt(0)
        .toUpperCase()

    )
    .join("");

}


function obtenerClaseEstado(
    estado
){

    const clases = {

        PRESENTE:
            "presente",

        TARDANZA:
            "tardanza",

        AUSENTE:
            "ausente",

        INCOMPLETO:
            "tardanza",

        SIN_HORARIO:
            "permiso"

    };


    return clases[estado] ||
    "permiso";

}


function obtenerTextoEstado(
    estado
){

    const textos = {

        PRESENTE:
            "Presente",

        TARDANZA:
            "Tardanza",

        AUSENTE:
            "Ausente",

        INCOMPLETO:
            "Incompleto",

        SIN_HORARIO:
            "Sin horario"

    };


    return textos[estado] ||
    estado;

}


function asignarContador(
    id,
    cantidad
){

    const elemento =
        document.getElementById(
            id
        );


    if(elemento){

        elemento.textContent =
            cantidad;

    }

}


function actualizarInformacionPaginacion(
    cantidad
){

    const elemento =
        document.getElementById(
            "informacionPaginacionAsistencia"
        );


    if(!elemento){

        return;

    }


    elemento.textContent =
        cantidad === 0
        ?
        "Mostrando 0 - 0 de 0 colaboradores"
        :
        `Mostrando 1 - ${cantidad} de ${cantidad} colaboradores`;

}


function mostrarMensajeTabla(
    mensaje
){

    if(!cuerpoResumen){

        return;

    }


    cuerpoResumen.innerHTML = `
        <tr>

            <td
                colspan="8"
                class="asistencia-tabla-vacia"
            >
                ${escaparHTML(mensaje)}
            </td>

        </tr>
    `;

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
