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

import {
    clasificarMarcaciones
}
from "./clasificar-marcaciones.js";


import {
    calcularJornadaAsistencia
}
from "./calcular-jornada-asistencia.js";

import {
    calcularHorasExtraAsistencia
}
from "./calcular-horas-extra-asistencia.js";



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
    "asistencia:horas-extra-actualizadas",
    evento=>{

        if(
            evento.detail?.fecha ===
            fechaResumenSeleccionada
        ){

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
                '[data-accion="gestionar-ajuste-refrigerio"]'
            );


        if(!boton){

            return;

        }


        const colaboradorId =
            boton.dataset.colaboradorId;


        const registro =
            registrosResumen.find(
                item=>

                    item.colaboradorId ===
                    colaboradorId

            );


        if(!registro){

            return;

        }


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:gestionar-ajuste-refrigerio",
                {
                    detail:{

                        colaboradorId,

                        colaboradorNombre:
                            registro.nombre,

                        fecha:
                            fechaResumenSeleccionada,

                        horario:
                            registro.horarioPrincipal,

                        clasificacion:
                            registro.clasificacion,

                        calculoAsistencia:
                            registro.calculoAsistencia,

                        advertencias:
                            registro.advertencias,

                        ajusteAsistencia:
                            registro.ajusteAsistencia,

                        tratamientoRefrigerio:
                            registro.tratamientoRefrigerio,

                        tratamientoRefrigerioCorto:
                            registro.tratamientoRefrigerioCorto

                    }
                }
            )
        );

    }
);


document.addEventListener(
    "asistencia:ajuste-diario-actualizado",
    evento=>{

        const fechaActualizada =
            evento.detail?.fecha;


        if(
            fechaResumenSeleccionada
            &&
            fechaActualizada ===
            fechaResumenSeleccionada
        ){

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
                '[data-accion="editar-marcacion-existente"]'
            );


        if(!boton){

            return;

        }


        const colaboradorId =
            boton.dataset.colaboradorId;


        const marcacionId =
            boton.dataset.marcacionId;


        const tipo =
            boton.dataset.tipoMarcacion;


        const registro =
            registrosResumen.find(
                item=>

                    item.colaboradorId ===
                    colaboradorId

            );


        const marcacion =
            registro
            ?.clasificacion
            ?.todas
            ?.find(
                item=>

                    item.id ===
                    marcacionId

            );


        if(
            !registro
            ||
            !marcacion
            ||
            !marcacionId
        ){

            Swal.fire({

                icon:"warning",

                title:"Marcación no editable",

                text:
                    "No se encontró el registro original de esta marcación.",

                confirmButtonColor:
                    "#2563eb"

            });

            return;

        }


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:editar-marcacion-existente",
                {
                    detail:{

                        colaboradorId,

                        colaboradorNombre:
                            registro.nombre,

                        fecha:
                            fechaResumenSeleccionada,

                        tipo,

                        marcacion,

                        horarioId:
                            registro.horarioPrincipal
                            ?.id
                            ||
                            null,

                        horario:
                            registro.horarioPrincipal
                            ||
                            null,

                        entradaActual:
                            registro.entrada
                            ||
                            null,

                        salidaActual:
                            registro.salida
                            ||
                            null,

                        inicioRefrigerioActual:
                            registro.clasificacion
                            ?.inicioRefrigerio
                            ||
                            null,

                        finRefrigerioActual:
                            registro.clasificacion
                            ?.finRefrigerio
                            ||
                            null,

                        refrigerio:
                            registro.horarioPrincipal
                            ?.refrigerio
                            ||
                            null

                    }
                }
            )
        );

    }
);

cuerpoResumen.addEventListener(
    "click",
    evento=>{

        const boton =
            evento.target.closest(
                '[data-accion="gestionar-horas-extra"]'
            );


        if(!boton){

            return;

        }


        const colaboradorId =
            boton.dataset.colaboradorId;


        const registro =
            registrosResumen.find(
                item=>

                    item.colaboradorId ===
                    colaboradorId

            );


        if(!registro){

            return;

        }


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:gestionar-horas-extra",
                {
                    detail:{

                        colaboradorId,

                        colaboradorNombre:
                            registro.nombre,

                        fecha:
                            fechaResumenSeleccionada,

                        calculoHorasExtra:
                            registro.calculoHorasExtra,

                        aprobacionHorasExtra:
                            registro.aprobacionHorasExtra
                            ||
                            null

                    }
                }
            )
        );

    }
);

    

    cuerpoResumen.addEventListener(
    "click",
    evento=>{

        const boton =
            evento.target.closest(
                '[data-accion="agregar-marcacion-manual"]'
            );


        if(!boton){

            return;

        }


        const colaboradorId =
            boton.dataset.colaboradorId;


        const tipo =
            boton.dataset.tipoMarcacion;


        const registro =
            registrosResumen.find(
                item=>

                    item.colaboradorId ===
                    colaboradorId

            );


        document.dispatchEvent(
            new CustomEvent(
                "asistencia:agregar-marcacion-manual",
                {
                    detail:{

                        colaboradorId,

                        colaboradorNombre:
                            registro?.nombre ||
                            "Colaborador",

                        fecha:
                            fechaResumenSeleccionada,

                        tipo,

                        horarioId:
                            registro
                            ?.horarioPrincipal
                            ?.id
                            ||
                            null,

                        horario:
                            registro
                            ?.horarioPrincipal
                            ||
                            null,

                        entradaActual:
                            registro?.entrada
                            ||
                            null,

                        salidaActual:
                            registro?.salida
                            ||
                            null,

                        inicioRefrigerioActual:
    registro?.clasificacion
    ?.inicioRefrigerio
    ||
    null,

finRefrigerioActual:
    registro?.clasificacion
    ?.finRefrigerio
    ||
    null,

refrigerio:
    registro?.horarioPrincipal
    ?.refrigerio
    ||
    null,

                    }
                }
            )
        );

    }
);


document.addEventListener(
    "asistencia:marcacion-manual-registrada",
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
    subareas,
    ajustesAsistencia,
    aprobacionesHorasExtra,
    permisos
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
            ),

            consultarColeccionEmpresa(
                "ajustesAsistenciaDiaria",
                empresaId
            ),

consultarColeccionEmpresa(
    "aprobacionesHorasExtra",
    empresaId
),

consultarColeccionEmpresa(
    "permisos",
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

                excepciones,

                ajustesAsistencia,

                aprobacionesHorasExtra,

                permisos

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
    excepciones,
    ajustesAsistencia,
    aprobacionesHorasExtra,
    permisos

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

        const ajusteAsistencia =
    ajustesAsistencia.find(
        ajuste=>

            ajuste.colaboradorId ===
            colaborador.id

            &&

            ajuste.fecha ===
            fecha

            &&

            String(
                ajuste.estado ||
                "ACTIVO"
            )
            .toUpperCase() !==
            "INACTIVO"

    )
    ||
    null;


        const aprobacionHorasExtra =
    aprobacionesHorasExtra.find(
        aprobacion=>

            aprobacion.colaboradorId ===
            colaborador.id

            &&

            aprobacion.fecha ===
            fecha

            &&

            String(
                aprobacion.estado ||
                "ACTIVO"
            )
            .toUpperCase() !==
            "INACTIVO"

    )
    ||
    null;


        const permisoDia =
    permisos.find(
        permiso=>

            permiso.colaboradorId ===
            colaborador.id

            &&

            String(
                permiso.estado ||
                ""
            )
            .toUpperCase() ===
            "APROBADO"

            &&

            permiso.fechaInicio <=
            fecha

            &&

            permiso.fechaFin >=
            fecha

    )
    ||
    null;

return construirRegistroColaborador(

    colaborador,

    horariosDia,

    marcacionesDia,

    ajusteAsistencia,

    aprobacionHorasExtra,

    permisoDia

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
    marcaciones,
    ajusteAsistencia,
    aprobacionHorasExtra,
    permisoDia
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


    /*
        Seleccionamos el primer horario del día
        como horario principal para el resumen.
    */

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


    /*
        Clasificamos las marcas según las ventanas
        del horario.
    */

    const clasificacion =
        clasificarMarcaciones({

            marcaciones,

            horarios,

            fecha:
                fechaResumenSeleccionada

        });

    aplicarLimiteVirtualPermisoParcial({

    permiso:
        permisoDia,

    horario:
        horarioPrincipal,

    clasificacion

});

    aplicarLimiteVirtualPermisoHoras({

    permiso:
        permisoDia,

    horario:
        horarioPrincipal,

    clasificacion

});

    


    const entrada =
        clasificacion.entrada;


    const salida =
        clasificacion.salida;


    /*
        Calculamos horas trabajadas, refrigerio,
        tardanza y cumplimiento de jornada.
    */

const tratamientoRefrigerio =
    ajusteAsistencia
    ?.tratamientoRefrigerio
    ||
    "LABORADO";


const tratamientoRefrigerioCorto =
    ajusteAsistencia
    ?.tratamientoRefrigerioCorto
    ||
    "NO_CONSIDERAR_EXTRA";


const calculoAsistencia =
    calcularJornadaAsistencia({

        horario:
            horarioPrincipal,

        clasificacion,

        tratamientoRefrigerio,

        tratamientoRefrigerioCorto

    });


    /*
    Cuando un extremo de la jornada está cubierto
    por un permiso parcial, no representa tardanza
    ni salida anticipada.
*/

const tieneLimiteVirtualPermiso =
    Boolean(
        clasificacion.entrada
        ?.esCubiertaPorPermiso
        ||
        clasificacion.salida
        ?.esCubiertaPorPermiso
    );


if(tieneLimiteVirtualPermiso){

    calculoAsistencia
    .minutosLlegadaPosterior = 0;

    calculoAsistencia
    .minutosTardanza = 0;

    calculoAsistencia
    .minutosSalidaAnticipada = 0;


    /*
        La parte efectivamente cumplida se toma
        de las horas reales trabajadas.
    */

    calculoAsistencia
    .minutosJornadaCumplida =
        Math.min(

            calculoAsistencia
            .minutosJornadaProgramada,

            calculoAsistencia
            .minutosTrabajados

        );

}


    /*
    Permiso por horas situado dentro de la jornada.

    Si no fue necesario crear entrada o salida virtual,
    descontamos el intervalo del permiso de las horas
    realmente trabajadas.
*/

let minutosPermisoDentroTrabajo = 0;


if(
    permisoDia
    &&
    permisoDia.tipoDuracion ===
    "HORAS"
    &&
    !tieneLimiteVirtualPermiso
    &&
    calculoAsistencia.calculable
){

    minutosPermisoDentroTrabajo =
        calcularMinutosPermisoDentroTrabajo({

            permiso:
                permisoDia,

            horario:
                horarioPrincipal,

            clasificacion

        });


    calculoAsistencia.minutosTrabajados =
        Math.max(

            0,

            calculoAsistencia
            .minutosTrabajados
            -
            minutosPermisoDentroTrabajo

        );


    calculoAsistencia.minutosJornadaCumplida =
        Math.max(

            0,

            calculoAsistencia
            .minutosJornadaCumplida
            -
            minutosPermisoDentroTrabajo

        );


    calculoAsistencia.jornadaCompleta =
        false;

}


    const calculoHorasExtra =
    calcularHorasExtraAsistencia({

        horario:
            horarioPrincipal,

        clasificacion,

        calculoAsistencia,

        tratamientoRefrigerioCorto

    });


    let estado =
        "SIN_HORARIO";


let tardanzaMinutos =
    clasificacion.entrada
    ?.esCubiertaPorPermiso
    ?
    0
    :
    calculoAsistencia
    .minutosTardanza;


    /*
        Determinar estado general.
    */

    if(
        horarios.length > 0
        &&
        !entrada
        &&
        !salida
    ){

        estado =
            "AUSENTE";

    }
    else if(
        entrada
        &&
        !salida
    ){

        estado =
            "INCOMPLETO";

    }
    else if(
        !entrada
        &&
        salida
    ){

        estado =
            "INCOMPLETO";

    }
    else if(
        entrada
        &&
        salida
    ){

        if(horarioPrincipal){

            estado =
                tardanzaMinutos > 0
                ?
                "TARDANZA"
                :
                "PRESENTE";

        }
        else{

            /*
                Tiene entrada y salida, pero todavía
                no tiene horario asignado.
            */

            estado =
                "PRESENTE";

        }

    }
    else if(
        marcaciones.length > 0
    ){

        /*
            Existen marcas, pero ninguna coincide con
            las ventanas configuradas.
        */

        estado =
            "INCOMPLETO";

    }


    /*
    Aplicar permiso aprobado de día completo.

    El permiso reemplaza el estado AUSENTE únicamente
    cuando no existen marcaciones reales.
*/

/*
    Aplicar permiso aprobado según su duración.
*/

const tipoDuracionPermiso =
    permisoDia?.tipoDuracion
    ||
    "DIA_COMPLETO";


const noTieneMarcaciones =
    marcaciones.length === 0;


const jornadaProgramada =
    calculoAsistencia
    .minutosJornadaProgramada
    ||
    0;


let minutosJustificadosPermiso = 0;

let minutosComputablesPermiso = 0;


/*
    Calcular la duración cubierta por el permiso.
*/

if(permisoDia){

    if(
        tipoDuracionPermiso ===
        "DIA_COMPLETO"
    ){

        minutosJustificadosPermiso =
            jornadaProgramada;

    }
    else if(
        tipoDuracionPermiso ===
        "MEDIO_DIA"
    ){

minutosJustificadosPermiso =
    calcularMinutosPermisoMedioDia({

        horario:
            horarioPrincipal,

        clasificacion,

        mitadDia:
            permisoDia.mitadDia,

        jornadaProgramada

    });

    }
    else if(
        tipoDuracionPermiso ===
        "HORAS"
    ){

minutosJustificadosPermiso =
    calcularMinutosPermisoPorHoras({

        permiso:
            permisoDia,

        horario:
            horarioPrincipal,

        clasificacion,

        jornadaProgramada

    });

    }


    if(
        permisoDia.computaComoLaborado ===
        true
    ){

        minutosComputablesPermiso =
            minutosJustificadosPermiso;

    }

}


/*
    Si no existen marcaciones, el permiso aprobado
    reemplaza el estado AUSENTE.
*/

/*
    Un permiso aprobado de día completo tiene prioridad
    aunque existan marcaciones accidentales.
*/

if(permisoDia){

    if(
        tipoDuracionPermiso ===
        "DIA_COMPLETO"
    ){

        tardanzaMinutos = 0;


        estado =
            permisoDia.computaComoLaborado ===
            true
            ?
            "PERMISO_COMPUTABLE"
            :
            "AUSENCIA_JUSTIFICADA";

    }
    else if(noTieneMarcaciones){

        tardanzaMinutos = 0;


        estado =
            permisoDia.computaComoLaborado ===
            true
            ?
            "PERMISO_PARCIAL_COMPUTABLE"
            :
            "AUSENCIA_PARCIAL_JUSTIFICADA";

    }

}



    const tieneLimiteCubiertoPorPermiso =
    Boolean(
        entrada?.esCubiertaPorPermiso
        ||
        salida?.esCubiertaPorPermiso
    );


if(tieneLimiteCubiertoPorPermiso){

    estado =
        "PRESENTE_CON_PERMISO";

    tardanzaMinutos = 0;

}


    const tieneLimiteCubiertoPorPermiso =
    Boolean(
        entrada?.esCubiertaPorPermiso
        ||
        salida?.esCubiertaPorPermiso
    );


if(tieneLimiteCubiertoPorPermiso){

    estado =
        "PRESENTE_CON_PERMISO";

    tardanzaMinutos = 0;

}


/*
    Permiso por horas con entrada y salida.

    Si está ubicado dentro de la jornada, conserva
    una tardanza real que haya ocurrido antes del permiso.
*/

if(
    permisoDia
    &&
    tipoDuracionPermiso ===
    "HORAS"
    &&
    entrada
    &&
    salida
){

    if(tardanzaMinutos > 0){

        estado =
            "TARDANZA_CON_PERMISO";

    }
    else{

        estado =
            "PRESENTE_CON_PERMISO";

    }

}


return {

    colaboradorId:
        colaborador.id,

    // Continúa aquí todo lo que ya tienes.

    

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

        clasificacion,

        entrada,

        salida,

        cantidadMarcaciones:
            marcaciones.length,

        estado,

        tardanzaMinutos,

        /*
            Resultado centralizado del cálculo.
        */

calculoAsistencia,

calculoHorasExtra,

minutosExtra:
    calculoHorasExtra
    .minutosExtraTotal,

ajusteAsistencia,

        tratamientoRefrigerio,

        tratamientoRefrigerioCorto,

        toleranciaMinutos:
            calculoAsistencia
            .toleranciaMinutos,

        minutosJornadaProgramada:
            calculoAsistencia
            .minutosJornadaProgramada,

        minutosJornadaCumplida:
            calculoAsistencia
            .minutosJornadaCumplida,

        advertencias:
            calculoAsistencia
            .advertencias,

        minutosTrabajados:
            calculoAsistencia
            .minutosTrabajados,
        
tipoDuracionPermiso,

minutosJustificadosPermiso,

minutosComputablesPermiso,

minutosPermisoDentroTrabajo,

aprobacionHorasExtra,

        permisoDia,


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
    ${crearInicioRefrigerioHTML(registro)}
</td>


<td>
    ${crearFinRefrigerioHTML(registro)}
</td>


<td>
    ${crearSalidaHTML(registro)}
</td>


            <td>

                <span class="estado-asistencia ${obtenerClaseEstado(registro.estado)}">

                    ${obtenerTextoEstado(
                    registro.estado,
                    registro
                    )}

                </span>

            </td>



<!-- TARDANZA -->

<td>

    ${crearTardanzaHTML(registro)}

</td>


<!-- TOLERANCIA -->

<td>

    ${crearToleranciaHTML(registro)}

</td>


<!-- HORAS TRABAJADAS -->

<td>

    <strong class="horas-trabajadas">

        ${formatearMinutosTrabajados(registro)}

    </strong>

</td>


<!-- JORNADA -->

<td>

    ${crearJornadaHTML(registro)}

</td>

<!-- HORAS EXTRA -->

<td>

    ${crearHorasExtraHTML(registro)}

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
HORAS EXTRA
=====================================================*/

function crearHorasExtraHTML(
    registro
){

    const calculo =
        registro.calculoHorasExtra;


    const aprobacion =
        registro.aprobacionHorasExtra
        ||
        null;


    if(
        !calculo
        ||
        !calculo.calculable
    ){

        return `
            <div class="horas-extra-resumen sin-dato">

                <strong>
                    —
                </strong>

                <span>
                    Sin cálculo
                </span>

            </div>
        `;

    }


    if(
        calculo.minutosExtraTotal <=
        0
    ){

        return `
            <div class="horas-extra-resumen sin-extra">

                <strong>
                    0 min
                </strong>

                <span>
                    Sin horas extra
                </span>

            </div>
        `;

    }


    /*
        Si el cálculo cambió después de la decisión,
        debe revisarse nuevamente.
    */

    const calculoCambio =
        aprobacion
        &&
        Number(
            aprobacion.minutosCalculados
            ||
            0
        )
        !==
        Number(
            calculo.minutosExtraTotal
            ||
            0
        );


    if(calculoCambio){

        return `
            <button
                type="button"
                class="horas-extra-resumen revision editable"
                data-accion="gestionar-horas-extra"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="El cálculo de horas extra cambió"
            >

                <strong>
                    ${formatearDuracionCorta(
                        calculo.minutosExtraTotal
                    )}
                </strong>

                <span>
                    Revisión requerida
                </span>

                <small>

                    El cálculo anterior fue de ${
                        formatearDuracionCorta(
                            aprobacion.minutosCalculados
                            ||
                            0
                        )
                    }.

                </small>

                <em>
                    Revisar nuevamente
                </em>

            </button>
        `;

    }


    /*
        HORAS EXTRA RECHAZADAS
    */

    if(
        aprobacion?.decision ===
        "RECHAZADO"
    ){

        return `
            <button
                type="button"
                class="horas-extra-resumen rechazada editable"
                data-accion="gestionar-horas-extra"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="${escaparHTML(
                    aprobacion.motivo ||
                    "Horas extra rechazadas"
                )}"
            >

                <strong>
                    0 min aprobados
                </strong>

                <span>
                    Horas extra rechazadas
                </span>

                <small>

                    ${
                        formatearDuracionCorta(
                            calculo.minutosExtraTotal
                        )
                    }

                    trabajados, no aprobados

                </small>

                <em>
                    Cambiar decisión
                </em>

            </button>
        `;

    }


    /*
        APROBACIÓN PARCIAL
    */

    if(
        aprobacion
        &&
        Number(
            aprobacion.minutosAprobados
            ||
            0
        )
        <
        calculo.minutosExtraTotal
    ){

        return `
            <button
                type="button"
                class="horas-extra-resumen parcial editable"
                data-accion="gestionar-horas-extra"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="${escaparHTML(
                    aprobacion.motivo ||
                    "Aprobación parcial"
                )}"
            >

                <strong>

                    ${
                        formatearDuracionCorta(
                            aprobacion.minutosAprobados
                            ||
                            0
                        )
                    }

                    de

                    ${
                        formatearDuracionCorta(
                            calculo.minutosExtraTotal
                        )
                    }

                </strong>

                <span>
                    Aprobación parcial
                </span>

                <small>

                    ${
                        calculo.minutosExtraTotal
                        -
                        (
                            aprobacion.minutosAprobados
                            ||
                            0
                        )
                    }

                    min no aprobados

                </small>

                <em>
                    Cambiar decisión
                </em>

            </button>
        `;

    }


    /*
        APROBACIÓN COMPLETA
    */

    if(
        aprobacion?.decision ===
        "APROBADO"
    ){

        return `
            <button
                type="button"
                class="horas-extra-resumen aprobada editable"
                data-accion="gestionar-horas-extra"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="${escaparHTML(
                    aprobacion.motivo ||
                    "Horas extra aprobadas"
                )}"
            >

                <strong>
                    ${formatearDuracionCorta(
                        aprobacion.minutosAprobados
                        ||
                        calculo.minutosExtraTotal
                    )}
                </strong>

                <span>
                    Horas extra aprobadas
                </span>

                <small>
                    Tiempo reconocido oficialmente
                </small>

                <em>
                    Cambiar decisión
                </em>

            </button>
        `;

    }


    /*
        PENDIENTE
    */

    return `
        <button
            type="button"
            class="horas-extra-resumen pendiente editable"
            data-accion="gestionar-horas-extra"
            data-colaborador-id="${escaparHTML(
                registro.colaboradorId
            )}"
            title="Revisar horas extra"
        >

            <strong>
                ${formatearDuracionCorta(
                    calculo.minutosExtraTotal
                )}
            </strong>

            <span>
                Pendiente de aprobación
            </span>

            ${calculo.detalles
            .map(
                detalle=>
                `
                    <small>
                        ${escaparHTML(
                            detalle.mensaje
                        )}
                    </small>
                `
            )
            .join("")}

            <em>
                Revisar
            </em>

        </button>
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


const tienePermisoCompleto =
    registro.permisoDia
    &&
    (
        registro.permisoDia.tipoDuracion ||
        "DIA_COMPLETO"
    ) ===
    "DIA_COMPLETO";


if(
    tienePermisoCompleto
    &&
    !registro.entrada
){

    return `
        <div class="marcacion-no-requerida">

            <i class="bi bi-calendar-check"></i>

            <div>

                <strong>
                    No requerida
                </strong>

                <span>
                    ${escaparHTML(
                        registro.permisoDia
                        .tipoPermisoNombre
                        ||
                        "Permiso aprobado"
                    )}
                </span>

            </div>

        </div>
    `;

}

    /*
        Si no existe entrada mostramos el botón
        para agregarla manualmente.
    */

    if(!registro.entrada){

        return `
            <button
                type="button"
                class="btn-marcacion-faltante entrada"
                data-accion="agregar-marcacion-manual"
                data-tipo-marcacion="ENTRADA"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="Registrar entrada manualmente"
            >

                <i class="bi bi-plus-circle"></i>

                <span>

                    <strong>
                        Sin entrada
                    </strong>

                    <small>
                        Agregar entrada
                    </small>

                </span>

            </button>
        `;

    }


if(
    registro.entrada
    ?.esCubiertaPorPermiso
){

    const entradaVirtual =
        registro.entrada;


    const nombrePermiso =
        entradaVirtual.permisoNombre
        ||
        registro.permisoDia
        ?.tipoPermisoNombre
        ||
        "Permiso aprobado";


    const esPermisoPorHoras =
        entradaVirtual.tipoDuracionPermiso ===
        "HORAS";


    const rangoPermiso =
        esPermisoPorHoras
        ?
        `${
            formatearHora(
                entradaVirtual.horaInicioPermiso
            )
        }–${
            formatearHora(
                entradaVirtual.horaFinPermiso
            )
        }`
        :
        "";


    return `
        <div class="marcacion-permiso-virtual">

            <i class="bi bi-briefcase"></i>

            <div>

                <strong>
                    ${formatearHora(
                        obtenerHoraMarcacion(
                            entradaVirtual
                        )
                    )}
                </strong>

                <span>
                    Fin de ${escaparHTML(
                        nombrePermiso
                    )}
                </span>

                <small>

                    ${
                        esPermisoPorHoras
                        ?
                        `Permiso ${escaparHTML(
                            rangoPermiso
                        )}`
                        :
                        "Inicia refrigerio"
                    }

                </small>

            </div>

        </div>
    `;

}

    

    /*
        La clase debe definirse antes de construir
        el HTML que la utiliza.
    */

    const clase =
        registro.estado ===
        "TARDANZA"
        ?
        "tardanza"
        :
        "correcta";


    return `
        <button
            type="button"
            class="btn-horario-resumen ${clase} editable"
            data-accion="editar-marcacion-existente"
            data-marcacion-id="${escaparHTML(
                registro.entrada.id ||
                ""
            )}"
            data-tipo-marcacion="ENTRADA"
            data-colaborador-id="${escaparHTML(
                registro.colaboradorId
            )}"
            title="Editar entrada"
        >

            <i class="bi bi-box-arrow-in-right"></i>

            <div>

                <strong>
                    ${formatearHora(
                        obtenerHoraMarcacion(
                            registro.entrada
                        )
                    )}
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

                <small class="marcacion-editar-ayuda">
                    Editar entrada
                </small>

            </div>

        </button>
    `;

}

/*=====================================================
INICIO DEL REFRIGERIO
=====================================================*/

function crearInicioRefrigerioHTML(
    registro
){

    const refrigerio =
        registro.horarioPrincipal
        ?.refrigerio;


    if(
        !refrigerio
        ?.habilitado
    ){

        return crearRefrigerioNoAplica();

    }


    const marcacion =
        registro.clasificacion
        ?.inicioRefrigerio;


    const tienePermisoCompleto =
    registro.permisoDia
    &&
    (
        registro.permisoDia.tipoDuracion ||
        "DIA_COMPLETO"
    ) ===
    "DIA_COMPLETO";


if(
    tienePermisoCompleto
    &&
    !marcacion
){

    return `
        <div class="marcacion-no-requerida">

            <i class="bi bi-calendar-check"></i>

            <div>

                <strong>
                    No requerido
                </strong>

                <span>
                    Permiso completo
                </span>

            </div>

        </div>
    `;

}

    

    if(!marcacion){

        return crearBotonRefrigerioFaltante(
            registro,
            "INICIO_REFRIGERIO",
            "Sin inicio",
            "Agregar inicio"
        );

    }


    return crearMarcacionRefrigerioHTML(
        registro,
        marcacion,
        "INICIO_REFRIGERIO"
    );

}


/*=====================================================
FIN DEL REFRIGERIO
=====================================================*/

function crearFinRefrigerioHTML(
    registro
){

    const refrigerio =
        registro.horarioPrincipal
        ?.refrigerio;


    if(
        !refrigerio
        ?.habilitado
    ){

        return crearRefrigerioNoAplica();

    }


    const marcacion =
        registro.clasificacion
        ?.finRefrigerio;


    const tienePermisoCompleto =
    registro.permisoDia
    &&
    (
        registro.permisoDia.tipoDuracion ||
        "DIA_COMPLETO"
    ) ===
    "DIA_COMPLETO";


if(
    tienePermisoCompleto
    &&
    !marcacion
){

    return `
        <div class="marcacion-no-requerida">

            <i class="bi bi-calendar-check"></i>

            <div>

                <strong>
                    No requerido
                </strong>

                <span>
                    Permiso completo
                </span>

            </div>

        </div>
    `;

}

    

    if(!marcacion){

        return crearBotonRefrigerioFaltante(
            registro,
            "FIN_REFRIGERIO",
            "Sin término",
            "Agregar término"
        );

    }


    return crearMarcacionRefrigerioHTML(
        registro,
        marcacion,
        "FIN_REFRIGERIO"
    );

}


/*=====================================================
MARCACIÓN DE REFRIGERIO
=====================================================*/

function crearMarcacionRefrigerioHTML(
    registro,
    marcacion,
    tipo
){

    const esAutomatica =
        Boolean(
            marcacion.esAutomatica
        );


    if(esAutomatica){

        return `
            <div class="marcacion-refrigerio automatica">

                <i class="bi bi-cpu"></i>

                <div>

                    <strong>
                        ${formatearHora(
                            obtenerHoraMarcacion(
                                marcacion
                            )
                        )}
                    </strong>

                    <span>
                        Automático
                    </span>

                </div>

            </div>
        `;

    }


    /*
        Las marcaciones reales se dejan preparadas
        como botones para su posterior edición.
    */

    return `
        <button
            type="button"
            class="marcacion-refrigerio real"
            data-accion="editar-marcacion-existente"
            data-marcacion-id="${escaparHTML(
                marcacion.id ||
                ""
            )}"
            data-tipo-marcacion="${tipo}"
            data-colaborador-id="${escaparHTML(
                registro.colaboradorId
            )}"
            title="Editar marcación"
        >

            <i class="bi bi-cup-hot"></i>

            <div>

                <strong>
                    ${formatearHora(
                        obtenerHoraMarcacion(
                            marcacion
                        )
                    )}
                </strong>

                <span>
                    Marcación real
                </span>

            </div>

        </button>
    `;

}


/*=====================================================
REFRIGERIO FALTANTE
=====================================================*/

function crearBotonRefrigerioFaltante(
    registro,
    tipo,
    titulo,
    subtitulo
){

    return `
        <button
            type="button"
            class="btn-marcacion-faltante refrigerio"
            data-accion="agregar-marcacion-manual"
            data-tipo-marcacion="${tipo}"
            data-colaborador-id="${escaparHTML(
                registro.colaboradorId
            )}"
            title="${escaparHTML(subtitulo)}"
        >

            <i class="bi bi-plus-circle"></i>

            <span>

                <strong>
                    ${escaparHTML(titulo)}
                </strong>

                <small>
                    ${escaparHTML(subtitulo)}
                </small>

            </span>

        </button>
    `;

}


/*=====================================================
REFRIGERIO NO APLICA
=====================================================*/

function crearRefrigerioNoAplica(){

    return `
        <div class="marcacion-refrigerio no-aplica">

            <i class="bi bi-dash-circle"></i>

            <div>

                <strong>
                    No aplica
                </strong>

                <span>
                    Sin refrigerio
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

const tienePermisoCompleto =
    registro.permisoDia
    &&
    (
        registro.permisoDia.tipoDuracion ||
        "DIA_COMPLETO"
    ) ===
    "DIA_COMPLETO";


if(
    tienePermisoCompleto
    &&
    !registro.salida
){

    return `
        <div class="marcacion-no-requerida">

            <i class="bi bi-calendar-check"></i>

            <div>

                <strong>
                    No requerida
                </strong>

                <span>
                    ${escaparHTML(
                        registro.permisoDia
                        .tipoPermisoNombre
                        ||
                        "Permiso aprobado"
                    )}
                </span>

            </div>

        </div>
    `;

}
    
    /*
        Si no existe una salida, mostramos
        el botón para agregarla.
    */

    if(!registro.salida){

        return `
            <button
                type="button"
                class="btn-marcacion-faltante salida"
                data-accion="agregar-marcacion-manual"
                data-tipo-marcacion="SALIDA"
                data-colaborador-id="${escaparHTML(
                    registro.colaboradorId
                )}"
                title="Registrar salida manualmente"
            >

                <i class="bi bi-plus-circle"></i>

                <span>

                    <strong>
                        Sin salida
                    </strong>

                    <small>
                        Agregar salida
                    </small>

                </span>

            </button>
        `;

    }



if(
    registro.salida
    ?.esCubiertaPorPermiso
){

    const salidaVirtual =
        registro.salida;


    const nombrePermiso =
        salidaVirtual.permisoNombre
        ||
        registro.permisoDia
        ?.tipoPermisoNombre
        ||
        "Permiso aprobado";


    const esPermisoPorHoras =
        salidaVirtual.tipoDuracionPermiso ===
        "HORAS";


    const rangoPermiso =
        esPermisoPorHoras
        ?
        `${
            formatearHora(
                salidaVirtual.horaInicioPermiso
            )
        }–${
            formatearHora(
                salidaVirtual.horaFinPermiso
            )
        }`
        :
        "";


    return `
        <div class="marcacion-permiso-virtual">

            <i class="bi bi-briefcase"></i>

            <div>

                <strong>
                    ${formatearHora(
                        obtenerHoraMarcacion(
                            salidaVirtual
                        )
                    )}
                </strong>

                <span>
                    Inicio de ${escaparHTML(
                        nombrePermiso
                    )}
                </span>

                <small>

                    ${
                        esPermisoPorHoras
                        ?
                        `Permiso ${escaparHTML(
                            rangoPermiso
                        )}`
                        :
                        "Después del refrigerio"
                    }

                </small>

            </div>

        </div>
    `;

}


    
    /*
        Si la salida sí existe, mostramos
        la hora como botón editable.
    */

    return `
        <button
            type="button"
            class="btn-horario-resumen"
            data-accion="editar-marcacion-existente"
            data-marcacion-id="${escaparHTML(
                registro.salida.id ||
                ""
            )}"
            data-tipo-marcacion="SALIDA"
            data-colaborador-id="${escaparHTML(
                registro.colaboradorId
            )}"
            title="Editar salida"
        >

            <i class="bi bi-box-arrow-right"></i>

            <div>

                <strong>
                    ${formatearHora(
                        obtenerHoraMarcacion(
                            registro.salida
                        )
                    )}
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

                <small class="marcacion-editar-ayuda">
                    Editar salida
                </small>

            </div>

        </button>
    `;

}



/*=====================================================
TOLERANCIA
=====================================================*/

function crearToleranciaHTML(
    registro
){

    if(!registro.horarioPrincipal){

        return `
            <span class="tolerancia-asistencia sin-dato">
                —
            </span>
        `;

    }


    const tolerancia =
        Number(
            registro.toleranciaMinutos
            ||
            0
        );


    if(tolerancia === 0){

        return `
            <span class="tolerancia-asistencia sin-tolerancia">

                <i class="bi bi-clock"></i>

                Sin tolerancia

            </span>
        `;

    }


    return `
        <span class="tolerancia-asistencia">

            <i class="bi bi-clock-history"></i>

            ${tolerancia} min

        </span>
    `;

}


/*=====================================================
JORNADA
=====================================================*/

function crearJornadaHTML(
    registro
){

const permiso =
    registro.permisoDia;


const tipoDuracionPermiso =
    permiso?.tipoDuracion
    ||
    "DIA_COMPLETO";


const sinMarcaciones =
    registro.cantidadMarcaciones ===
    0;


if(
    permiso
    &&
    (
        tipoDuracionPermiso ===
        "DIA_COMPLETO"
        ||
        sinMarcaciones
    )
){

    const nombrePermiso =
        permiso.tipoPermisoNombre
        ||
        "Permiso aprobado";


    const minutosJustificados =
        registro.minutosJustificadosPermiso
        ||
        0;


    const minutosComputables =
        registro.minutosComputablesPermiso
        ||
        0;


    const esDiaCompleto =
        tipoDuracionPermiso ===
        "DIA_COMPLETO";


    /*
        Permiso que sí computa para la jornada:
        vacaciones, permiso con goce, comisión, etc.
    */

    if(
        permiso.computaComoLaborado ===
        true
    ){

        return `
            <div class="jornada-asistencia ${
                esDiaCompleto
                ?
                "completa"
                :
                "incompleta"
            }">

                <strong>
                    ${formatearDuracionCorta(
                        minutosComputables
                    )}
                    computables
                </strong>

                <span>
                    0 h trabajadas · ${escaparHTML(
                        nombrePermiso
                    )}
                </span>

            </div>
        `;

    }


    /*
        Permiso que justifica la ausencia,
        pero no representa horas trabajadas.
    */

    if(
        permiso.justificaAusencia ===
        true
    ){

       const jornadaProgramada =
    registro.minutosJornadaProgramada
    ||
    0;


const minutosCubiertos =
    Math.min(
        jornadaProgramada,
        minutosJustificados
    );


        
return `
    <div class="jornada-asistencia permiso-justificado">

        <strong>
            ${formatearDuracionCorta(
                minutosCubiertos
            )}
            de
            ${formatearDuracionCorta(
                jornadaProgramada
            )}
            cubiertas
        </strong>

        <span>
            ${formatearDuracionCorta(
                minutosJustificados
            )}
            justificadas
        </span>

        <small>
            0 h trabajadas · ${escaparHTML(
                nombrePermiso
            )}
        </small>

        ${
            tipoDuracionPermiso ===
            "DIA_COMPLETO"
            &&
            registro.cantidadMarcaciones > 0
            ?
            `
                <small class="permiso-marcacion-advertencia">

                    <i class="bi bi-exclamation-triangle"></i>

                    ${registro.cantidadMarcaciones}

                    marcación${
                        registro.cantidadMarcaciones === 1
                        ?
                        ""
                        :
                        "es"
                    }

                    registrada${
                        registro.cantidadMarcaciones === 1
                        ?
                        ""
                        :
                        "s"
                    }

                    durante el permiso

                </small>
            `
            :
            ""
        }

    </div>
`;
    }

}

    if(!registro.horarioPrincipal){

        return `
            <div class="jornada-asistencia sin-horario">

                <strong>
                    —
                </strong>

                <span>
                    Sin horario
                </span>

            </div>
        `;

    }


    const calculo =
        registro.calculoAsistencia;


    const programada =
        registro.minutosJornadaProgramada
        ||
        0;


const cumplidaReal =
    registro.minutosJornadaCumplida
    ||
    0;


const minutosCubiertosPermiso =
    registro.minutosJustificadosPermiso
    ||
    0;


const cumplida =
    Math.min(

        programada,

        cumplidaReal
        +
        minutosCubiertosPermiso

    );


    const advertenciasRefrigerio =
        obtenerAdvertenciasRefrigerioRegistro(
            registro
        );


    /*
        Si falta entrada o salida no puede calcularse
        completamente la jornada.
    */

    if(!calculo?.calculable){

        const noTieneMarcaciones =
            !registro.entrada
            &&
            !registro.salida;


        return `
            <div class="jornada-asistencia incompleta">

                <strong>

                    ${
                        noTieneMarcaciones
                        ?
                        `0 h de ${
                            formatearDuracionCorta(
                                programada
                            )
                        }`
                        :
                        "Por calcular"
                    }

                </strong>

                <span>

                    ${
                        noTieneMarcaciones
                        ?
                        "Jornada no cumplida"
                        :
                        "Marcación incompleta"
                    }

                </span>

            </div>
        `;

    }


const completa =
    cumplida >=
    programada;


    return `
        <div class="jornada-asistencia ${
            completa
            ?
            "completa"
            :
            "incompleta"
        }">

            <strong>

                ${formatearDuracionCorta(cumplida)}

                de

                ${formatearDuracionCorta(programada)}

            </strong>


            <span>

                ${
completa
?
(
    registro.permisoDia
    ?
    "Jornada cubierta"
    :
    "Jornada cumplida"
)
:
"Jornada incompleta"
                }

            </span>

            ${
    registro.permisoDia
    ?
    `
        <small class="detalle-permiso-jornada">

            ${formatearDuracionCorta(
                registro.minutosJustificadosPermiso
                ||
                0
            )}

            ${
                registro.permisoDia
                .computaComoLaborado ===
                true
                ?
                "computables"
                :
                "justificadas"
            }

            ·

            ${escaparHTML(
                registro.permisoDia
                .tipoPermisoNombre
                ||
                "Permiso"
            )}

        </small>
    `
    :
    ""
}


            ${crearDetalleDescuentoJornada(registro)}


            ${crearEstadoRefrigerioHTML(registro)}
            
            ${
                advertenciasRefrigerio.length > 0
                ?
                `
                    <button
                        type="button"
                        class="contador-advertencias-jornada ${
    registro.ajusteAsistencia
    ?
    "resuelta"
    :
    ""
}"
                        data-accion="gestionar-ajuste-refrigerio"
                        data-colaborador-id="${escaparHTML(
                            registro.colaboradorId
                        )}"
                        title="${escaparHTML(
                            advertenciasRefrigerio
                            .map(
                                advertencia=>
                                    advertencia.mensaje
                            )
                            .join(" | ")
                        )}"
                    >

                        <i class="bi bi-exclamation-triangle"></i>

                        ${advertenciasRefrigerio.length}

<span>

    ${
        registro.ajusteAsistencia
        ?
        "Cambiar"
        :
        registro.calculoAsistencia
        ?.minutosExcesoRefrigerio > 0
        ?
        "Ver"
        :
        "Revisar"
    }

</span>

                    </button>
                `
                :
                ""
            }

        </div>
    `;

}



/*=====================================================
DETALLE DE TARDANZA
=====================================================*/

function crearTardanzaHTML(
    registro
){

    if(
        !registro.horarioPrincipal
        ||
        !registro.entrada
    ){

        return `
            <div class="detalle-tardanza sin-dato">

                <strong>
                    —
                </strong>

            </div>
        `;

    }

    /*
    Una entrada virtual cubierta por permiso
    no representa una llegada tardía.
*/

if(
    registro.entrada
    ?.esCubiertaPorPermiso
){

    return `
        <div class="detalle-tardanza sin-dato">

            <strong>
                —
            </strong>

            <span>
                Cubierta por permiso
            </span>

        </div>
    `;

}


    const calculo =
        registro.calculoAsistencia
        ||
        {};


    const llegadaPosterior =
        Number(
            calculo.minutosLlegadaPosterior
            ||
            0
        );


    const tardanza =
        Number(
            calculo.minutosTardanza
            ||
            0
        );


    const tolerancia =
        Number(
            calculo.toleranciaMinutos
            ||
            0
        );


    /*
        Llegó después, pero todavía se encuentra
        dentro de la tolerancia.
    */

    if(
        llegadaPosterior > 0
        &&
        tardanza === 0
    ){

        return `
            <div class="detalle-tardanza tolerada">

                <strong>
                    0 min
                </strong>

<span>
    Llegada: +${llegadaPosterior} min
</span>

<small>
    Dentro del margen
</small>

            </div>
        `;

    }


    /*
        Superó la tolerancia.
    */

    if(tardanza > 0){

return `
    <div class="detalle-tardanza tardanza-real">

        <strong>
            ${tardanza} min
        </strong>

        <span>
            Llegada: +${llegadaPosterior} min
        </span>

    </div>
`;

    }


    /*
        Llegó a la hora programada o antes.
    */

    return `
        <div class="detalle-tardanza puntual">

            <strong>
                0 min
            </strong>

            <span>
                Llegó a tiempo
            </span>

        </div>
    `;

}


/*=====================================================
MOTIVOS DE JORNADA INCOMPLETA
=====================================================*/

function crearDetalleDescuentoJornada(
    registro
){

    const calculo =
        registro.calculoAsistencia
        ||
        {};


    const motivos = [];


    const llegadaPosterior =
        Number(
            calculo.minutosLlegadaPosterior
            ||
            0
        );


    const salidaAnticipada =
        Number(
            calculo.minutosSalidaAnticipada
            ||
            0
        );


    const excesoRefrigerio =
        Number(
            calculo.minutosExcesoRefrigerio
            ||
            0
        );


    if(llegadaPosterior > 0){

        motivos.push({

            icono:
                "bi-box-arrow-in-right",

            texto:
                `${llegadaPosterior} min por llegada posterior`,

            clase:
                calculo.minutosTardanza > 0
                ?
                "negativo"
                :
                "informativo"

        });

    }


    if(salidaAnticipada > 0){

        motivos.push({

            icono:
                "bi-box-arrow-right",

            texto:
                `${salidaAnticipada} min por salida anticipada`,

            clase:
                "negativo"

        });

    }


    if(excesoRefrigerio > 0){

        motivos.push({

            icono:
                "bi-cup-hot",

            texto:
                `${excesoRefrigerio} min por exceso de refrigerio`,

            clase:
                "negativo"

        });

    }


    if(motivos.length === 0){

        return "";

    }


    return `
        <div class="detalle-descuento-jornada">

            ${motivos
            .map(
                motivo=>
                `
                    <small class="${motivo.clase}">

                        <i class="bi ${motivo.icono}"></i>

                        ${escaparHTML(
                            motivo.texto
                        )}

                    </small>
                `
            )
            .join("")}

        </div>
    `;

}


/*=====================================================
ESTADO DEL REFRIGERIO
=====================================================*/

function crearEstadoRefrigerioHTML(
    registro
){

    const refrigerio =
        registro.horarioPrincipal
        ?.refrigerio;


    if(
        !refrigerio
        ?.habilitado
    ){

        return "";

    }


    const calculo =
        registro.calculoAsistencia
        ||
        {};


    const ajuste =
        registro.ajusteAsistencia
        ||
        null;


    let clase =
        "normal";


    let titulo =
        "Refrigerio";


    let detalle =
        "";


    /*
        Refrigerio automático.
    */

    if(
        calculo.refrigerioAutomatico
    ){

        clase =
            "automatico";


        titulo =
            "Automático";


        detalle =
            `${
                calculo.minutosRefrigerioDescontados
                ||
                refrigerio.duracionMinutos
                ||
                0
            } min descontados`;

    }


    /*
        Decisión para refrigerio sin marcaciones.
    */

    else if(
        ajuste?.tratamientoRefrigerio ===
        "LABORADO"

        &&

        calculo.advertencias
        ?.some(
            advertencia=>

                advertencia.codigo ===
                "REFRIGERIO_SIN_MARCACIONES"

                ||

                advertencia.codigo ===
                "REFRIGERIO_INCOMPLETO"

        )
    ){

        clase =
            "trabajado";


        titulo =
            "Considerado trabajado";


        detalle =
            "0 min descontados";

    }


    else if(
        ajuste?.tratamientoRefrigerio ===
        "DESCONTAR_PROGRAMADO"

        &&

        calculo.advertencias
        ?.some(
            advertencia=>

                advertencia.codigo ===
                "REFRIGERIO_SIN_MARCACIONES"

                ||

                advertencia.codigo ===
                "REFRIGERIO_INCOMPLETO"

        )
    ){

        clase =
            "descontado";


        titulo =
            "Refrigerio descontado";


        detalle =
            `${
                calculo.minutosRefrigerioDescontados
                ||
                refrigerio.duracionMinutos
                ||
                0
            } min descontados`;

    }


    /*
        Refrigerio corto con decisión.
    */

    else if(
        calculo.minutosRefrigerioNoUsado > 0
    ){

        if(
            ajuste?.tratamientoRefrigerioCorto ===
            "CONSIDERAR_REAL"
        ){

            clase =
                "trabajado";


            titulo =
                "Tiempo real considerado";


            detalle =
                `${
                    calculo.minutosRefrigerioDescontados
                    ||
                    0
                } min descontados`;

        }
        else{

            clase =
                "descontado";


            titulo =
                "Duración completa descontada";


            detalle =
                `${
                    calculo.minutosRefrigerioDescontados
                    ||
                    refrigerio.duracionMinutos
                    ||
                    0
                } min descontados`;

        }

    }


    /*
        Refrigerio excedido.
    */

    else if(
        calculo.minutosExcesoRefrigerio > 0
    ){

        clase =
            "exceso";


        titulo =
            "Refrigerio excedido";


        detalle =
            `${
                calculo.minutosRefrigerioDescontados
                ||
                0
            } min descontados`;

    }


    /*
        Refrigerio completo y normal.
    */

    else if(
        calculo.refrigerioCompleto
    ){

        clase =
            "normal";


        titulo =
            "Refrigerio registrado";


        detalle =
            `${
                calculo.minutosRefrigerioDescontados
                ||
                0
            } min descontados`;

    }


    /*
        Sin marcaciones y todavía sin decisión.

        Se muestra el comportamiento predeterminado.
    */

    else{

        clase =
            "pendiente";


        titulo =
            "Sin decisión guardada";


        detalle =
            "Por defecto se considera trabajado";

    }


    return `
        <div class="estado-refrigerio-resumen ${clase}">

            <i class="bi ${
                obtenerIconoEstadoRefrigerio(
                    clase
                )
            }"></i>

            <div>

                <strong>
                    ${escaparHTML(titulo)}
                </strong>

                <span>
                    ${escaparHTML(detalle)}
                </span>

            </div>

        </div>
    `;

}


/*=====================================================
ICONO DEL ESTADO DEL REFRIGERIO
=====================================================*/

function obtenerIconoEstadoRefrigerio(
    clase
){

    const iconos = {

        automatico:
            "bi-cpu",

        trabajado:
            "bi-briefcase",

        descontado:
            "bi-dash-circle",

        exceso:
            "bi-exclamation-triangle",

        pendiente:
            "bi-question-circle",

        normal:
            "bi-cup-hot"

    };


    return iconos[clase]
    ||
    "bi-cup-hot";

}


/*=====================================================
OBTENER ADVERTENCIAS DE REFRIGERIO
=====================================================*/

function obtenerAdvertenciasRefrigerioRegistro(
    registro
){

    const codigosRefrigerio = [

        "REFRIGERIO_SIN_MARCACIONES",

        "REFRIGERIO_INCOMPLETO",

        "REFRIGERIO_CORTO",

        "REFRIGERIO_EXCESIVO"

    ];


    return (
        registro.advertencias ||
        []
    )
    .filter(
        advertencia=>

            codigosRefrigerio.includes(
                advertencia.codigo
            )

    );

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

function formatearDuracionCorta(
    minutosTotales
){

    const total =
        Math.max(
            0,
            Number(
                minutosTotales
                ||
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


    if(minutos === 0){

        return `${horas} h`;

    }


    return `${horas} h ${minutos} min`;

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




function formatearMinutosTrabajados(
    registro
){

const tieneLimiteVirtual =
    Boolean(
        registro.entrada
        ?.esCubiertaPorPermiso
        ||
        registro.salida
        ?.esCubiertaPorPermiso
    );


const tienePermisoCompleto =
    registro.permisoDia
    &&
    (
        registro.permisoDia.tipoDuracion ||
        "DIA_COMPLETO"
    ) ===
    "DIA_COMPLETO";


if(tienePermisoCompleto){

    return "0 h";

}

if(
    registro.cantidadMarcaciones ===
    1
    &&
    !tieneLimiteVirtual
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



/*=====================================================
APLICAR LÍMITE VIRTUAL POR PERMISO DE MEDIO DÍA
=====================================================*/

function aplicarLimiteVirtualPermisoParcial({

    permiso,
    horario,
    clasificacion

}){

if(
    !permiso
    ||
    !horario
    ||
    permiso.tipoDuracion !==
    "MEDIO_DIA"
    ||
    (
        permiso.computaComoLaborado !==
        true

        &&

        permiso.justificaAusencia !==
        true
    )
){

    return;

}


const limiteMitad =
    obtenerLimiteMitadJornada(

        horario,

        clasificacion,

        permiso.mitadDia

    );


    if(!Number.isFinite(limiteMitad)){

        return;

    }


    const marcadorVirtual = {

        id:null,

        hora:
            convertirMinutosAHoraResumen(
                limiteMitad
            ),

        minutosJornada:
            limiteMitad,

        origen:
            "PERMISO",

        estado:
            "VIRTUAL",

        esCubiertaPorPermiso:
            true,

        permisoId:
            permiso.id,

        permisoNombre:
            permiso.tipoPermisoNombre
            ||
            "Permiso aprobado"

    };


    /*
        Primera mitad cubierta:
        el límite virtual funciona como entrada
        para comenzar la segunda mitad trabajada.
    */

    if(
        permiso.mitadDia ===
        "PRIMERA_MITAD"
        &&
        !clasificacion.entrada
        &&
        clasificacion.salida
    ){

        clasificacion.entrada = {

            ...marcadorVirtual,

            tipo:
                "ENTRADA",

            tipoInterpretado:
                "ENTRADA"

        };

    }


    /*
        Segunda mitad cubierta:
        el límite virtual funciona como salida
        de la primera mitad trabajada.
    */

    if(
        permiso.mitadDia ===
        "SEGUNDA_MITAD"
        &&
        clasificacion.entrada
        &&
        !clasificacion.salida
    ){

        clasificacion.salida = {

            ...marcadorVirtual,

            tipo:
                "SALIDA",

            tipoInterpretado:
                "SALIDA"

        };

    }

}


/*=====================================================
APLICAR LÍMITE VIRTUAL POR PERMISO DE HORAS
=====================================================*/

function aplicarLimiteVirtualPermisoHoras({

    permiso,
    horario,
    clasificacion

}){

    if(
        !permiso
        ||
        !horario
        ||
        permiso.tipoDuracion !==
        "HORAS"
        ||
        (
            permiso.computaComoLaborado !==
            true

            &&

            permiso.justificaAusencia !==
            true
        )
    ){

        return;

    }


    const entradaProgramada =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    let salidaProgramada =
        convertirHoraAMinutos(
            horario.salida
            ?.programada
        );


    let inicioPermiso =
        convertirHoraAMinutos(
            permiso.horaInicio
        );


    let finPermiso =
        convertirHoraAMinutos(
            permiso.horaFin
        );


    if(
        horario.cruzaMedianoche
        ||
        salidaProgramada <=
        entradaProgramada
    ){

        salidaProgramada += 1440;


        if(
            inicioPermiso <
            entradaProgramada
        ){

            inicioPermiso += 1440;

        }


        if(
            finPermiso <=
            entradaProgramada
        ){

            finPermiso += 1440;

        }

    }


    const permisoEmpiezaConJornada =
        inicioPermiso <=
        entradaProgramada;


    const permisoTerminaConJornada =
        finPermiso >=
        salidaProgramada;


    const nombrePermiso =
        permiso.tipoPermisoNombre
        ||
        "Permiso aprobado";


    /*
        Permiso al inicio:
        su término funciona como entrada virtual.
    */

    if(
        permisoEmpiezaConJornada
        &&
        !clasificacion.entrada
        &&
        clasificacion.salida
    ){

        clasificacion.entrada = {

            id:null,

            tipo:
                "ENTRADA",

            tipoInterpretado:
                "ENTRADA",

            hora:
                convertirMinutosAHoraResumen(
                    finPermiso
                ),

            minutosJornada:
                finPermiso,

            origen:
                "PERMISO",

            estado:
                "VIRTUAL",

            esCubiertaPorPermiso:
                true,

            tipoDuracionPermiso:
                "HORAS",

            permisoId:
                permiso.id,

            permisoNombre:
                nombrePermiso,

            horaInicioPermiso:
                permiso.horaInicio,

            horaFinPermiso:
                permiso.horaFin

        };

    }


    /*
        Permiso al final:
        su inicio funciona como salida virtual.
    */

    if(
        permisoTerminaConJornada
        &&
        clasificacion.entrada
        &&
        !clasificacion.salida
    ){

        clasificacion.salida = {

            id:null,

            tipo:
                "SALIDA",

            tipoInterpretado:
                "SALIDA",

            hora:
                convertirMinutosAHoraResumen(
                    inicioPermiso
                ),

            minutosJornada:
                inicioPermiso,

            origen:
                "PERMISO",

            estado:
                "VIRTUAL",

            esCubiertaPorPermiso:
                true,

            tipoDuracionPermiso:
                "HORAS",

            permisoId:
                permiso.id,

            permisoNombre:
                nombrePermiso,

            horaInicioPermiso:
                permiso.horaInicio,

            horaFinPermiso:
                permiso.horaFin

        };

    }

}


/*=====================================================
OBTENER LÍMITE DEL PERMISO DE MEDIO DÍA
=====================================================*/

function obtenerLimiteMitadJornada(

    horario,
    clasificacion,
    mitadDia

){

    const entradaProgramada =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    let salidaProgramada =
        convertirHoraAMinutos(
            horario.salida
            ?.programada
        );


    if(
        horario.cruzaMedianoche
        ||
        salidaProgramada <=
        entradaProgramada
    ){

        salidaProgramada += 1440;

    }


    const inicioRefrigerio =
        clasificacion
        ?.inicioRefrigerio
        ?.minutosJornada;


    const finRefrigerio =
        clasificacion
        ?.finRefrigerio
        ?.minutosJornada;


    /*
        Si existe refrigerio, este divide naturalmente
        la primera y segunda mitad de la jornada.
    */

    if(
        Number.isFinite(
            inicioRefrigerio
        )
        &&
        Number.isFinite(
            finRefrigerio
        )
    ){

        if(
    mitadDia ===
    "PRIMERA_MITAD"
){

    /*
        El permiso de primera mitad termina
        cuando comienza el refrigerio.
    */

    return inicioRefrigerio;

}


/*
    El permiso de segunda mitad comienza
    cuando termina el refrigerio.
*/

return finRefrigerio;

    }


    /*
        Solo si no existe refrigerio utilizamos
        el punto medio matemático.
    */

    return Math.round(
        entradaProgramada
        +
        (
            salidaProgramada -
            entradaProgramada
        )
        /
        2
    );

}



/*=====================================================
MINUTOS CUBIERTOS POR PERMISO DE MEDIO DÍA
=====================================================*/

function calcularMinutosPermisoMedioDia({

    horario,
    clasificacion,
    mitadDia,
    jornadaProgramada

}){

    if(!horario){

        return 0;

    }


    const entradaProgramada =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    let salidaProgramada =
        convertirHoraAMinutos(
            horario.salida
            ?.programada
        );


    if(
        horario.cruzaMedianoche
        ||
        salidaProgramada <=
        entradaProgramada
    ){

        salidaProgramada += 1440;

    }


    const inicioRefrigerio =
        clasificacion
        ?.inicioRefrigerio
        ?.minutosJornada;


    const finRefrigerio =
        clasificacion
        ?.finRefrigerio
        ?.minutosJornada;


    if(
        Number.isFinite(
            inicioRefrigerio
        )
        &&
        Number.isFinite(
            finRefrigerio
        )
    ){

        if(
            mitadDia ===
            "PRIMERA_MITAD"
        ){

            return Math.max(
                0,
                inicioRefrigerio -
                entradaProgramada
            );

        }


        return Math.max(
            0,
            salidaProgramada -
            finRefrigerio
        );

    }


    return Math.round(
        jornadaProgramada /
        2
    );

}


/*=====================================================
MINUTOS CUBIERTOS POR PERMISO DE HORAS
=====================================================*/

function calcularMinutosPermisoPorHoras({

    permiso,
    horario,
    clasificacion,
    jornadaProgramada

}){

    if(
        !permiso
        ||
        !horario
    ){

        return 0;

    }


    const entradaProgramada =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    let salidaProgramada =
        convertirHoraAMinutos(
            horario.salida
            ?.programada
        );


    let inicioPermiso =
        convertirHoraAMinutos(
            permiso.horaInicio
        );


    let finPermiso =
        convertirHoraAMinutos(
            permiso.horaFin
        );


    if(
        horario.cruzaMedianoche
        ||
        salidaProgramada <=
        entradaProgramada
    ){

        salidaProgramada += 1440;


        if(
            inicioPermiso <
            entradaProgramada
        ){

            inicioPermiso += 1440;

        }


        if(
            finPermiso <=
            entradaProgramada
        ){

            finPermiso += 1440;

        }

    }


    /*
        Limitamos el permiso al horario programado.
    */

    const inicioAplicable =
        Math.max(
            entradaProgramada,
            inicioPermiso
        );


    const finAplicable =
        Math.min(
            salidaProgramada,
            finPermiso
        );


    let minutosCubiertos =
        Math.max(
            0,
            finAplicable -
            inicioAplicable
        );


    /*
        Si el permiso coincide con el refrigerio,
        ese tiempo no se contabiliza dos veces.
    */

    const inicioRefrigerio =
        clasificacion
        ?.inicioRefrigerio
        ?.minutosJornada;


    const finRefrigerio =
        clasificacion
        ?.finRefrigerio
        ?.minutosJornada;


    if(
        Number.isFinite(
            inicioRefrigerio
        )
        &&
        Number.isFinite(
            finRefrigerio
        )
    ){

        const solapamientoRefrigerio =
            Math.max(

                0,

                Math.min(
                    finAplicable,
                    finRefrigerio
                )
                -
                Math.max(
                    inicioAplicable,
                    inicioRefrigerio
                )

            );


        minutosCubiertos -=
            solapamientoRefrigerio;

    }


    return Math.min(

        jornadaProgramada,

        Math.max(
            0,
            minutosCubiertos
        )

    );

}



/*=====================================================
PERMISO POR HORAS DENTRO DEL TRAMO TRABAJADO
=====================================================*/

function calcularMinutosPermisoDentroTrabajo({

    permiso,
    horario,
    clasificacion

}){

    if(
        !permiso
        ||
        !horario
        ||
        !clasificacion?.entrada
        ||
        !clasificacion?.salida
    ){

        return 0;

    }


    let entradaReal =
        Number(
            clasificacion
            .entrada
            .minutosJornada
        );


    let salidaReal =
        Number(
            clasificacion
            .salida
            .minutosJornada
        );


    let inicioPermiso =
        convertirHoraAMinutos(
            permiso.horaInicio
        );


    let finPermiso =
        convertirHoraAMinutos(
            permiso.horaFin
        );


    const entradaProgramada =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    if(
        horario.cruzaMedianoche
    ){

        if(
            salidaReal <=
            entradaReal
        ){

            salidaReal += 1440;

        }


        if(
            inicioPermiso <
            entradaProgramada
        ){

            inicioPermiso += 1440;

        }


        if(
            finPermiso <=
            entradaProgramada
        ){

            finPermiso += 1440;

        }

    }


    const inicioAplicable =
        Math.max(
            entradaReal,
            inicioPermiso
        );


    const finAplicable =
        Math.min(
            salidaReal,
            finPermiso
        );


    let minutos =
        Math.max(
            0,
            finAplicable -
            inicioAplicable
        );


    /*
        Restamos el solapamiento con refrigerio,
        porque ese tiempo ya se descontó previamente.
    */

    const inicioRefrigerio =
        clasificacion
        ?.inicioRefrigerio
        ?.minutosJornada;


    const finRefrigerio =
        clasificacion
        ?.finRefrigerio
        ?.minutosJornada;


    if(
        Number.isFinite(
            inicioRefrigerio
        )
        &&
        Number.isFinite(
            finRefrigerio
        )
    ){

        const solapamientoRefrigerio =
            Math.max(

                0,

                Math.min(
                    finAplicable,
                    finRefrigerio
                )
                -
                Math.max(
                    inicioAplicable,
                    inicioRefrigerio
                )

            );


        minutos -=
            solapamientoRefrigerio;

    }


    return Math.max(
        0,
        minutos
    );

}


/*=====================================================
CONVERTIR MINUTOS A HORA
=====================================================*/

function convertirMinutosAHoraResumen(
    minutosTotales
){

    const minutosNormalizados =
        (
            Math.round(
                minutosTotales
            )
            %
            1440
            +
            1440
        )
        %
        1440;


    const horas =
        Math.floor(
            minutosNormalizados /
            60
        );


    const minutos =
        minutosNormalizados %
        60;


    return `${String(horas).padStart(2,"0")}:${String(
        minutos
    ).padStart(2,"0")}`;

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
            "permiso",

        PERMISO_COMPUTABLE:
            "permiso",

        AUSENCIA_JUSTIFICADA:
            "permiso",

        PERMISO_PARCIAL_COMPUTABLE:
            "permiso",

        AUSENCIA_PARCIAL_JUSTIFICADA:
            "permiso",

        PRESENTE_CON_PERMISO:
            "permiso",

        TARDANZA_CON_PERMISO:
            "tardanza",

    };


    return clases[estado] ||
    "permiso";

}


function obtenerTextoEstado(
    estado,
    registro = null
){

if(
    estado ===
    "PRESENTE_CON_PERMISO"
){

    const nombrePermiso =
        registro
        ?.permisoDia
        ?.tipoPermisoNombre
        ||
        "Permiso";


    return `Presente · ${nombrePermiso}`;

}

if(
    estado === "PERMISO_COMPUTABLE"
    ||
    estado === "AUSENCIA_JUSTIFICADA"
    ||
    estado === "PERMISO_PARCIAL_COMPUTABLE"
    ||
    estado === "AUSENCIA_PARCIAL_JUSTIFICADA"
){

    const nombrePermiso =
        registro
        ?.permisoDia
        ?.tipoPermisoNombre
        ||
        "Permiso aprobado";


    const esParcial =
        estado ===
        "PERMISO_PARCIAL_COMPUTABLE"
        ||
        estado ===
        "AUSENCIA_PARCIAL_JUSTIFICADA";


    return esParcial
        ?
        `${nombrePermiso} parcial`
        :
        nombrePermiso;

}


    if(
    estado ===
    "TARDANZA_CON_PERMISO"
){

    const nombrePermiso =
        registro
        ?.permisoDia
        ?.tipoPermisoNombre
        ||
        "Permiso";


    return `Tardanza · ${nombrePermiso}`;

}


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
            "Sin horario",

        PERMISO_COMPUTABLE:
            "Permiso computable",

        AUSENCIA_JUSTIFICADA:
            "Ausencia justificada",

        PRESENTE_CON_PERMISO:
            "Presente con permiso",

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
                colspan="13"
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
