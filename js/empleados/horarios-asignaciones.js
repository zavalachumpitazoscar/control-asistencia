import {
    db
}
from "../firebase-config.js";


import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


import {
    NOMBRES_MESES,
    formatearHora,
    formatearFechaISO,
    formatearFechaVisible,
    obtenerFechaActual,
    obtenerUltimoDiaMes,
    obtenerDatosEntrada,
    obtenerDatosSalida,
    escaparHTML
}
from "./horarios-utilidades.js";



export function iniciarAsignacionesHorarios({

    empresaId,

    obtenerHorarios,

    obtenerHorarioSeleccionado,

    alActualizar

}){

    const modal =
    document.getElementById(
        "modalAsignarHorario"
    );


    const form =
    document.getElementById(
        "formAsignarHorario"
    );


    const cerrarAsignarHorario =
    document.getElementById(
        "cerrarAsignarHorario"
    );


    const cancelarAsignarHorario =
    document.getElementById(
        "cancelarAsignarHorario"
    );


    const guardarAsignacionHorario =
    document.getElementById(
        "guardarAsignacionHorario"
    );


    const tiposAsignacion =
    document.querySelectorAll(
        'input[name="tipoAsignacionHorario"]'
    );


    const opcionesInicioMensual =
    document.querySelectorAll(
        'input[name="inicioPlanificacionMensual"]'
    );


    const diasSemanal = {

        lunes:
        document.getElementById(
            "asignacionDiaLunes"
        ),

        martes:
        document.getElementById(
            "asignacionDiaMartes"
        ),

        miercoles:
        document.getElementById(
            "asignacionDiaMiercoles"
        ),

        jueves:
        document.getElementById(
            "asignacionDiaJueves"
        ),

        viernes:
        document.getElementById(
            "asignacionDiaViernes"
        ),

        sabado:
        document.getElementById(
            "asignacionDiaSabado"
        ),

        domingo:
        document.getElementById(
            "asignacionDiaDomingo"
        )

    };


    let asignaciones = [];


    let añoCalendario =
    new Date()
    .getFullYear();


    let mesCalendario =
    new Date()
    .getMonth();


    let programacionMensual = {};


    const consulta =
    query(

        collection(
            db,
            "asignacionesHorarios"
        ),

        where(
            "empresaId",
            "==",
            empresaId
        )

    );


    onSnapshot(

        consulta,

        snapshot=>{

            asignaciones = [];


            snapshot.forEach(documento=>{

                asignaciones.push({

                    id:
                    documento.id,

                    ...documento.data()

                });

            });


            actualizarDetalle();

        },

        error=>{

            console.error(
                "Error al listar asignaciones:",
                error
            );

        }

    );



    function abrir(){

        const horario =
        obtenerHorarioSeleccionado();


        if(!horario){

            Swal.fire({

                icon:"warning",

                title:"Selecciona un horario",

                text:
                "Primero debes seleccionar el horario que deseas asignar."

            });

            return;

        }


        if(
            horario.estado !==
            "ACTIVO"
        ){

            Swal.fire({

                icon:"warning",

                title:"Horario inactivo",

                text:
                "Debes activar el horario antes de crear una nueva asignación."

            });

            return;

        }


        reiniciarFormulario();


        const entrada =
        obtenerDatosEntrada(
            horario
        );


        const salida =
        obtenerDatosSalida(
            horario
        );


        document.getElementById(
            "asignacionNombreHorario"
        ).textContent =
        horario.nombre ||
        "Horario";


        document.getElementById(
            "asignacionResumenHorario"
        ).textContent =
        `${formatearHora(
            entrada.programada
        )} - ${formatearHora(
            salida.programada
        )}`;


        llenarSelectorHorarios(
            horario.id
        );


        actualizarTextosPeriodo();

        actualizarSeccionTipo();

        renderizarCalendario();


        modal.style.display =
        "flex";

    }



    function cerrar(){

        modal.style.display =
        "none";


        reiniciarFormulario();

    }



    function reiniciarFormulario(){

        form?.reset();


        programacionMensual = {};


        const fechaActual =
        obtenerFechaActual();


        asignarValor(
            "fechaAsignacionDiaria",
            fechaActual
        );


        asignarValor(
            "fechaInicioAsignacionSemanal",
            fechaActual
        );


        asignarValor(
            "fechaFinAsignacionSemanal",
            ""
        );


        marcarLunesViernes();


        añoCalendario =
        new Date()
        .getFullYear();


        mesCalendario =
        new Date()
        .getMonth();


        actualizarSeccionTipo();

        renderizarResumenMeses();

    }



    function obtenerTipoAsignacion(){

        return document.querySelector(

            'input[name="tipoAsignacionHorario"]:checked'

        )
        ?.value
        ??
        "DIARIA";

    }



    function actualizarSeccionTipo(){

        const tipo =
        obtenerTipoAsignacion();


        const diaria =
        document.getElementById(
            "seccionAsignacionDiaria"
        );


        const semanal =
        document.getElementById(
            "seccionAsignacionSemanal"
        );


        const mensual =
        document.getElementById(
            "seccionAsignacionMensual"
        );


        diaria.hidden =
        tipo !==
        "DIARIA";


        semanal.hidden =
        tipo !==
        "SEMANAL";


        mensual.hidden =
        tipo !==
        "MENSUAL";


        if(
            tipo ===
            "MENSUAL"
        ){

            configurarInicioPlanificacion();

            llenarSelectorHorarios(

                obtenerHorarioSeleccionado()
                ?.id

            );

            renderizarCalendario();

        }

    }



    function llenarSelectorHorarios(
        horarioPreferidoId
    ){

        const select =
        document.getElementById(
            "horarioCalendarioMensual"
        );


        if(!select){

            return;

        }


        const horariosActivos =
        obtenerHorarios()
        .filter(horario=>

            horario.estado ===
            "ACTIVO"

        );


        select.innerHTML = `

            <option value="">
                Selecciona un horario
            </option>

        `;


        horariosActivos.forEach(horario=>{

            const option =
            document.createElement(
                "option"
            );


            option.value =
            horario.id;


            option.textContent =
            horario.nombre ||
            "Horario";


            select.appendChild(
                option
            );

        });


        if(
            horarioPreferidoId
            &&
            horariosActivos.some(
                horario=>
                horario.id ===
                horarioPreferidoId
            )
        ){

            select.value =
            horarioPreferidoId;

        }

    }



    function marcarLunesViernes(){

        Object.entries(
            diasSemanal
        )
        .forEach(
            (
                [
                    dia,
                    input
                ]
            )=>{

                if(input){

                    input.checked =
                    [
                        "lunes",
                        "martes",
                        "miercoles",
                        "jueves",
                        "viernes"
                    ]
                    .includes(
                        dia
                    );

                }

            }
        );

    }



    function configurarInicioPlanificacion(){

        const opcion =
        document.querySelector(

            'input[name="inicioPlanificacionMensual"]:checked'

        )
        ?.value
        ??
        "MES_ACTUAL";


        const fecha =
        new Date();


        añoCalendario =
        fecha.getFullYear();


        mesCalendario =
        opcion ===
        "INICIO_ANIO"
        ?
        0
        :
        fecha.getMonth();


        renderizarCalendario();

    }



    function actualizarTextosPeriodo(){

        const fecha =
        new Date();


        const año =
        fecha.getFullYear();


        const mes =
        fecha.getMonth();


        const textoMes =
        document.getElementById(
            "textoMesActualAsignacion"
        );


        const textoAnio =
        document.getElementById(
            "textoAnioActualAsignacion"
        );


        if(textoMes){

            textoMes.textContent =
            `Planificar desde ${NOMBRES_MESES[mes]} de ${año}.`;

        }


        if(textoAnio){

            textoAnio.textContent =
            `Planificar desde enero hasta diciembre de ${año}.`;

        }

    }



    function renderizarCalendario(){

        const contenedor =
        document.getElementById(
            "calendarioDiasAsignacion"
        );


        if(!contenedor){

            return;

        }


        const titulo =
        document.getElementById(
            "tituloMesAsignacion"
        );


        titulo.textContent =
        `${NOMBRES_MESES[mesCalendario]} ${añoCalendario}`;


        const primerDia =
        new Date(
            añoCalendario,
            mesCalendario,
            1
        );


        let desplazamiento =
        primerDia.getDay();


        desplazamiento =
        desplazamiento === 0
        ?
        6
        :
        desplazamiento - 1;


        const ultimoDia =
        obtenerUltimoDiaMes(
            añoCalendario,
            mesCalendario
        );


        contenedor.innerHTML =
        "";


        for(
            let i = 0;
            i < desplazamiento;
            i++
        ){

            const vacio =
            document.createElement(
                "div"
            );


            vacio.className =
            "calendario-dia calendario-dia-vacio";


            contenedor.appendChild(
                vacio
            );

        }


        for(
            let dia = 1;
            dia <= ultimoDia;
            dia++
        ){

            const fecha =
            new Date(
                añoCalendario,
                mesCalendario,
                dia
            );


            const fechaISO =
            formatearFechaISO(
                fecha
            );


            const horarioId =
            programacionMensual[
                fechaISO
            ];


            const horario =
            obtenerHorarios()
            .find(item=>

                item.id ===
                horarioId

            );


            const boton =
            document.createElement(
                "button"
            );


            boton.type =
            "button";


            boton.className =
            `calendario-dia ${
                horarioId
                ?
                "programado"
                :
                ""
            }`;


            boton.dataset.fecha =
            fechaISO;


            boton.innerHTML = `

                <span class="numero-dia">

                    ${dia}

                </span>

                ${
                    horario
                    ?
                    `

                        <small class="horario-dia-calendario">

                            ${escaparHTML(
                                horario.nombre
                            )}

                        </small>

                    `
                    :
                    ""
                }

            `;


            boton.onclick =
            ()=>{

                seleccionarDiaCalendario(
                    fechaISO
                );

            };


            contenedor.appendChild(
                boton
            );

        }


        actualizarResumenMesActual();

        actualizarPreguntaSiguienteMes();

    }



    function seleccionarDiaCalendario(
        fechaISO
    ){

        const horarioId =
        obtenerValor(
            "horarioCalendarioMensual"
        );


        if(!horarioId){

            Swal.fire({

                icon:"warning",

                title:"Selecciona un horario",

                text:
                "Primero selecciona el horario que deseas colocar en el calendario."

            });

            return;

        }


        if(
            programacionMensual[
                fechaISO
            ] ===
            horarioId
        ){

            delete programacionMensual[
                fechaISO
            ];

        }
        else{

            programacionMensual[
                fechaISO
            ] =
            horarioId;

        }


        renderizarCalendario();

        renderizarResumenMeses();

    }



    function actualizarResumenMesActual(){

        const prefijo =
        `${añoCalendario}-${String(
            mesCalendario + 1
        )
        .padStart(
            2,
            "0"
        )}-`;


        const cantidad =
        Object.keys(
            programacionMensual
        )
        .filter(fecha=>

            fecha.startsWith(
                prefijo
            )

        )
        .length;


        document.getElementById(
            "cantidadDiasProgramadosMes"
        ).textContent =
        cantidad;


        document.getElementById(
            "resumenMesAsignacion"
        ).textContent =
        cantidad === 0
        ?
        "Selecciona los días que utilizarán el horario."
        :
        `${cantidad} día${cantidad === 1 ? "" : "s"} programado${cantidad === 1 ? "" : "s"}.`;

    }



    function actualizarPreguntaSiguienteMes(){

        const contenedor =
        document.getElementById(
            "preguntaAgregarSiguienteMes"
        );


        const prefijo =
        `${añoCalendario}-${String(
            mesCalendario + 1
        )
        .padStart(
            2,
            "0"
        )}-`;


        const tieneProgramacion =
        Object.keys(
            programacionMensual
        )
        .some(fecha=>

            fecha.startsWith(
                prefijo
            )

        );


        contenedor.hidden =
        !tieneProgramacion;


        const siguiente =
        new Date(
            añoCalendario,
            mesCalendario + 1,
            1
        );


        document.getElementById(
            "tituloPreguntaSiguienteMes"
        ).textContent =
        `¿Deseas agregar ${NOMBRES_MESES[
            siguiente.getMonth()
        ]} de ${siguiente.getFullYear()}?`;

    }



    function renderizarResumenMeses(){

        const contenedor =
        document.getElementById(
            "listaMesesProgramados"
        );


        if(!contenedor){

            return;

        }


        const resumen = {};


        Object.keys(
            programacionMensual
        )
        .forEach(fecha=>{

            const [
                año,
                mes
            ] =
            fecha
            .split("-")
            .map(Number);


            const clave =
            `${año}-${mes}`;


            if(!resumen[clave]){

                resumen[clave] = {

                    año,

                    mes,

                    cantidad:0

                };

            }


            resumen[clave].cantidad++;

        });


        const meses =
        Object.values(
            resumen
        )
        .sort(
            (
                primero,
                segundo
            )=>

                primero.año -
                segundo.año

                ||

                primero.mes -
                segundo.mes

        );


        if(
            meses.length === 0
        ){

            contenedor.innerHTML = `

                <div class="meses-programados-vacio">

                    Todavía no existen meses programados.

                </div>

            `;

            return;

        }


        contenedor.innerHTML =
        meses.map(item=>`

            <div class="mes-programado-item">

                <div>

                    <strong>

                        ${NOMBRES_MESES[
                            item.mes - 1
                        ]} ${item.año}

                    </strong>

                    <span>

                        ${item.cantidad}
                        día${item.cantidad === 1 ? "" : "s"}
                        programado${item.cantidad === 1 ? "" : "s"}

                    </span>

                </div>

            </div>

        `)
        .join("");

    }



    function moverMes(
        cantidad
    ){

        const nuevaFecha =
        new Date(
            añoCalendario,
            mesCalendario + cantidad,
            1
        );


        const opcion =
        document.querySelector(

            'input[name="inicioPlanificacionMensual"]:checked'

        )
        ?.value;


        const actual =
        new Date();


        const limite =
        opcion ===
        "INICIO_ANIO"
        ?
        new Date(
            actual.getFullYear(),
            0,
            1
        )
        :
        new Date(
            actual.getFullYear(),
            actual.getMonth(),
            1
        );


        if(
            nuevaFecha <
            limite
        ){

            return;

        }


        añoCalendario =
        nuevaFecha.getFullYear();


        mesCalendario =
        nuevaFecha.getMonth();


        renderizarCalendario();

    }



    function limpiarMesActual(){

        const prefijo =
        `${añoCalendario}-${String(
            mesCalendario + 1
        )
        .padStart(
            2,
            "0"
        )}-`;


        Object.keys(
            programacionMensual
        )
        .forEach(fecha=>{

            if(
                fecha.startsWith(
                    prefijo
                )
            ){

                delete programacionMensual[
                    fecha
                ];

            }

        });


        renderizarCalendario();

        renderizarResumenMeses();

    }



    if(form){

        form.addEventListener(
            "submit",
            async evento=>{

                evento.preventDefault();


                const horario =
                obtenerHorarioSeleccionado();


                if(!horario){

                    return;

                }


                const tipo =
                obtenerTipoAsignacion();


                const resultado =
                construirAsignacion(
                    tipo,
                    horario
                );


                if(!resultado){

                    return;

                }


                try{

                    guardarAsignacionHorario.disabled =
                    true;


                    guardarAsignacionHorario.innerHTML = `

                        <span class="spinner-boton"></span>

                        Guardando...

                    `;


                    await addDoc(

                        collection(
                            db,
                            "asignacionesHorarios"
                        ),

                        {

                            ...resultado,

                            empresaId,

                            estado:"ACTIVO",

                            fechaRegistro:
                            serverTimestamp(),

                            fechaModificacion:
                            serverTimestamp()

                        }

                    );


                    cerrar();


                    await Swal.fire({

                        icon:"success",

                        title:"Asignación registrada",

                        text:
                        "El horario fue asignado correctamente."

                    });

                }
                catch(error){

                    console.error(
                        "Error al guardar asignación:",
                        error
                    );


                    await Swal.fire({

                        icon:"error",

                        title:"No se pudo guardar",

                        text:
                        "Ocurrió un error al registrar la asignación."

                    });

                }
                finally{

                    guardarAsignacionHorario.disabled =
                    false;


                    guardarAsignacionHorario.innerHTML = `

                        <i class="bi bi-calendar-check"></i>

                        Guardar asignación

                    `;

                }

            }
        );

    }



    function construirAsignacion(
        tipo,
        horario
    ){

        if(
            tipo ===
            "DIARIA"
        ){

            const fecha =
            obtenerValor(
                "fechaAsignacionDiaria"
            );


            if(!fecha){

                mostrarCamposIncompletos(
                    "Selecciona la fecha de la asignación."
                );

                return null;

            }


            return {

                horarioId:
                horario.id,

                tipoAsignacion:
                "DIARIA",

                fechaInicio:
                fecha,

                fechaFin:
                fecha,

                fechas:[
                    fecha
                ]

            };

        }


        if(
            tipo ===
            "SEMANAL"
        ){

            const fechaInicio =
            obtenerValor(
                "fechaInicioAsignacionSemanal"
            );


            const fechaFin =
            obtenerValor(
                "fechaFinAsignacionSemanal"
            );


            if(
                !fechaInicio
                ||
                !fechaFin
            ){

                mostrarCamposIncompletos(
                    "Selecciona la fecha inicial y final."
                );

                return null;

            }


            if(
                fechaFin <
                fechaInicio
            ){

                Swal.fire({

                    icon:"warning",

                    title:"Periodo incorrecto",

                    text:
                    "La fecha final no puede ser anterior a la fecha inicial."

                });

                return null;

            }


            const diasSemana = {};


            Object.entries(
                diasSemanal
            )
            .forEach(
                (
                    [
                        dia,
                        input
                    ]
                )=>{

                    diasSemana[dia] =
                    Boolean(
                        input?.checked
                    );

                }
            );


            const tieneDias =
            Object.values(
                diasSemana
            )
            .some(Boolean);


            if(!tieneDias){

                Swal.fire({

                    icon:"warning",

                    title:"Selecciona los días",

                    text:
                    "Selecciona al menos un día de la semana."

                });

                return null;

            }


            return {

                horarioId:
                horario.id,

                tipoAsignacion:
                "SEMANAL",

                fechaInicio,

                fechaFin,

                intervaloSemanas:
                Number(
                    obtenerValor(
                        "intervaloAsignacionSemanal"
                    )
                ),

                diasSemana

            };

        }


        const programacion =
        Object.entries(
            programacionMensual
        )
        .map(
            (
                [
                    fecha,
                    horarioId
                ]
            )=>({

                fecha,

                horarioId

            })
        )
        .sort(
            (
                primero,
                segundo
            )=>

                primero.fecha
                .localeCompare(
                    segundo.fecha
                )

        );


        if(
            programacion.length === 0
        ){

            Swal.fire({

                icon:"warning",

                title:"Calendario vacío",

                text:
                "Selecciona al menos un día en el calendario mensual."

            });

            return null;

        }


        const horarioIds =
        [
            ...new Set(
                programacion.map(
                    item=>
                    item.horarioId
                )
            )
        ];


        return {

            tipoAsignacion:
            "MENSUAL",

            horarioIdPrincipal:
            horario.id,

            horarioIds,

            fechaInicio:
            programacion[0]
            .fecha,

            fechaFin:
            programacion[
                programacion.length - 1
            ]
            .fecha,

            programacion

        };

    }



    function actualizarDetalle(){

        const horario =
        obtenerHorarioSeleccionado();


        const contenedor =
        document.getElementById(
            "listaAsignacionesHorario"
        );


        const contador =
        document.getElementById(
            "detalleCantidadAsignaciones"
        );


        if(
            !horario
            ||
            !contenedor
        ){

            return;

        }


        const asignacionesHorario =
        asignaciones.filter(
            asignacion=>{

                if(
                    asignacion.horarioId ===
                    horario.id
                ){

                    return true;

                }


                if(
                    asignacion.horarioIdPrincipal ===
                    horario.id
                ){

                    return true;

                }


                return Array.isArray(
                    asignacion.horarioIds
                )
                &&
                asignacion.horarioIds
                .includes(
                    horario.id
                );

            }
        );


        if(contador){

            contador.textContent =
            asignacionesHorario.length;

        }


        if(
            asignacionesHorario.length === 0
        ){

            contenedor.innerHTML = `

                <div class="sin-asignaciones-horario">

                    <i class="bi bi-calendar-x"></i>

                    <h4>
                        No hay asignaciones
                    </h4>

                    <p>
                        Este horario todavía no ha sido asignado
                        a ninguna fecha o periodo.
                    </p>

                    <button
                    id="btnAsignarHorarioVacio"
                    type="button"
                    class="btn-principal">

                        <i class="bi bi-calendar-plus"></i>

                        Asignar horario

                    </button>

                </div>

            `;


            document.getElementById(
                "btnAsignarHorarioVacio"
            )
            ?.addEventListener(
                "click",
                abrir
            );


            alActualizar?.(
                0
            );

            return;

        }


        contenedor.innerHTML =
        asignacionesHorario
        .map(asignacion=>

            crearHTMLAsignacion(
                asignacion,
                horario.id
            )

        )
        .join("");


        alActualizar?.(
            asignacionesHorario.length
        );

    }



    function crearHTMLAsignacion(
        asignacion,
        horarioId
    ){

        if(
            asignacion.tipoAsignacion ===
            "DIARIA"
        ){

            return `

                <div class="asignacion-horario-card">

                    <div class="asignacion-horario-icono">

                        <i class="bi bi-calendar-day"></i>

                    </div>

                    <div>

                        <strong>
                            Asignación diaria
                        </strong>

                        <p>
                            ${formatearFechaVisible(
                                asignacion.fechaInicio
                            )}
                        </p>

                    </div>

                </div>

            `;

        }


        if(
            asignacion.tipoAsignacion ===
            "SEMANAL"
        ){

            const dias =
            Object.entries(
                asignacion.diasSemana ||
                {}
            )
            .filter(
                (
                    [
                        ,
                        activo
                    ]
                )=>
                activo
            )
            .map(
                (
                    [
                        dia
                    ]
                )=>

                    dia.charAt(0)
                    .toUpperCase()
                    +
                    dia.slice(1)

            )
            .join(", ");


            return `

                <div class="asignacion-horario-card">

                    <div class="asignacion-horario-icono">

                        <i class="bi bi-calendar-week"></i>

                    </div>

                    <div>

                        <strong>
                            Asignación semanal
                        </strong>

                        <p>
                            ${escaparHTML(
                                dias
                            )}
                        </p>

                        <small>

                            ${formatearFechaVisible(
                                asignacion.fechaInicio
                            )}

                            hasta

                            ${formatearFechaVisible(
                                asignacion.fechaFin
                            )}

                        </small>

                    </div>

                </div>

            `;

        }


        const diasHorario =
        Array.isArray(
            asignacion.programacion
        )
        ?
        asignacion.programacion
        .filter(item=>

            item.horarioId ===
            horarioId

        )
        .length
        :
        0;


        return `

            <div class="asignacion-horario-card">

                <div class="asignacion-horario-icono">

                    <i class="bi bi-calendar3"></i>

                </div>

                <div>

                    <strong>
                        Planificación mensual
                    </strong>

                    <p>
                        ${diasHorario}
                        día${diasHorario === 1 ? "" : "s"}
                        con este horario
                    </p>

                    <small>

                        ${formatearFechaVisible(
                            asignacion.fechaInicio
                        )}

                        hasta

                        ${formatearFechaVisible(
                            asignacion.fechaFin
                        )}

                    </small>

                </div>

            </div>

        `;

    }



    tiposAsignacion.forEach(input=>{

        input.addEventListener(
            "change",
            actualizarSeccionTipo
        );

    });


    opcionesInicioMensual.forEach(input=>{

        input.addEventListener(
            "change",
            configurarInicioPlanificacion
        );

    });


    document.getElementById(
        "btnAsignacionLunesViernes"
    )
    ?.addEventListener(
        "click",
        marcarLunesViernes
    );


    document.getElementById(
        "btnAsignacionTodosDias"
    )
    ?.addEventListener(
        "click",
        ()=>{

            Object.values(
                diasSemanal
            )
            .forEach(input=>{

                if(input){

                    input.checked =
                    true;

                }

            });

        }
    );


    document.getElementById(
        "btnAsignacionLimpiarDias"
    )
    ?.addEventListener(
        "click",
        ()=>{

            Object.values(
                diasSemanal
            )
            .forEach(input=>{

                if(input){

                    input.checked =
                    false;

                }

            });

        }
    );


    document.getElementById(
        "btnMesAnteriorAsignacion"
    )
    ?.addEventListener(
        "click",
        ()=>{

            moverMes(
                -1
            );

        }
    );


    document.getElementById(
        "btnMesSiguienteAsignacion"
    )
    ?.addEventListener(
        "click",
        ()=>{

            moverMes(
                1
            );

        }
    );


    document.getElementById(
        "btnAgregarSiguienteMes"
    )
    ?.addEventListener(
        "click",
        ()=>{

            moverMes(
                1
            );

        }
    );


    document.getElementById(
        "btnLimpiarMesAsignacion"
    )
    ?.addEventListener(
        "click",
        limpiarMesActual
    );


    cerrarAsignarHorario
    ?.addEventListener(
        "click",
        cerrar
    );


    cancelarAsignarHorario
    ?.addEventListener(
        "click",
        cerrar
    );


    modal
    ?.addEventListener(
        "click",
        evento=>{

            if(
                evento.target ===
                modal
            ){

                cerrar();

            }

        }
    );


    return {

        abrir,

        cerrar,

        actualizarDetalle

    };

}



function obtenerValor(
    id
){

    return document.getElementById(
        id
    )
    ?.value
    ??
    "";

}



function asignarValor(
    id,
    valor
){

    const elemento =
    document.getElementById(
        id
    );


    if(elemento){

        elemento.value =
        valor ?? "";

    }

}



function mostrarCamposIncompletos(
    texto
){

    Swal.fire({

        icon:"warning",

        title:"Campos incompletos",

        text

    });

}
