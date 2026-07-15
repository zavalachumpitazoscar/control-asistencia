import {
    db
}
from "../firebase-config.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


import {
    iniciarFormularioHorarios
}
from "./horarios-formulario.js";


import {
    iniciarAsignacionesHorarios
}
from "./horarios-asignaciones.js";


import {
    formatearHora,
    asignarTexto,
    escaparHTML,
    obtenerDatosEntrada,
    obtenerDatosSalida
}
from "./horarios-utilidades.js";

let detenerEscuchaHorarios = null;

export function iniciarHorarios(){

    const empresaId =
    sessionStorage.getItem(
        "empresaId"
    );


    if(!empresaId){

        console.error(
            "No se encontró empresaId para horarios."
        );

        return;

    }


    const listaHorarios =
    document.getElementById(
        "listaHorarios"
    );


    if(!listaHorarios){

        console.error(
            "No se encontró listaHorarios."
        );

        return;

    }


    const btnNuevoHorario =
    document.getElementById(
        "btnNuevoHorario"
    );


    const buscarHorario =
    document.getElementById(
        "buscarHorario"
    );


    const filtroEstadoHorario =
    document.getElementById(
        "filtroEstadoHorario"
    );


    const contadorHorarios =
    document.getElementById(
        "contadorHorarios"
    );


    const detalleVacio =
    document.getElementById(
        "detalleHorarioVacio"
    );


    const detalleHorario =
    document.getElementById(
        "detalleHorario"
    );


    const btnEditarHorario =
    document.getElementById(
        "btnEditarHorario"
    );


    const btnCambiarEstadoHorario =
    document.getElementById(
        "btnCambiarEstadoHorario"
    );


    const btnAsignarHorario =
    document.getElementById(
        "btnAsignarHorario"
    );


    let horarios = [];


    let horarioSeleccionadoId =
    null;



    const formulario =
    iniciarFormularioHorarios({

        empresaId,

        obtenerHorarios:()=>{

            return horarios;

        },

        alGuardar:horarioId=>{

            horarioSeleccionadoId =
            horarioId;


            renderizarHorarios();

        }

    });



    const asignaciones =
    iniciarAsignacionesHorarios({

        empresaId,

        obtenerHorarios:()=>{

            return horarios;

        },

        obtenerHorarioSeleccionado:()=>{

            return obtenerHorarioSeleccionado();

        },

        alActualizar:cantidad=>{

            asignarTexto(
                "detalleCantidadAsignaciones",
                cantidad
            );

        }

    });



    const consultaHorarios =
    query(

        collection(
            db,
            "horarios"
        ),

        where(
            "empresaId",
            "==",
            empresaId
        )

    );


if(detenerEscuchaHorarios){

    detenerEscuchaHorarios();

}


detenerEscuchaHorarios =
onSnapshot(

    consultaHorarios,

    snapshot=>{

        horarios = [];


        snapshot.forEach(documento=>{

            horarios.push({

                id:
                documento.id,

                ...documento.data()

            });

        });


        horarios.sort(
            (
                primero,
                segundo
            )=>

                String(
                    primero.nombre || ""
                )
                .localeCompare(

                    String(
                        segundo.nombre || ""
                    ),

                    "es",

                    {
                        sensitivity:"base"
                    }

                )
        );


        renderizarHorarios();


        if(horarioSeleccionadoId){

            const horarioActual =
            obtenerHorarioSeleccionado();


            if(horarioActual){

                mostrarDetalleHorario(
                    horarioActual
                );

            }
            else{

                horarioSeleccionadoId =
                null;

                limpiarDetalleHorario();

            }

        }
        else{

            limpiarDetalleHorario();

        }

    },

    error=>{

        console.error(
            "Error al listar horarios:",
            error
        );

    }

);



    function renderizarHorarios(){

        const texto =
        buscarHorario
        ?.value
        .trim()
        .toLowerCase()
        ??
        "";


        const estado =
        filtroEstadoHorario
        ?.value
        ??
        "";


        const filtrados =
        horarios.filter(horario=>{

            const nombre =
            String(
                horario.nombre || ""
            )
            .toLowerCase();


            const descripcion =
            String(
                horario.descripcion || ""
            )
            .toLowerCase();


            const coincideTexto =
            nombre.includes(
                texto
            )
            ||
            descripcion.includes(
                texto
            );


            const coincideEstado =
            !estado
            ||
            horario.estado ===
            estado;


            return (
                coincideTexto
                &&
                coincideEstado
            );

        });


        if(contadorHorarios){

            contadorHorarios.textContent =
            filtrados.length;

        }


        if(
            filtrados.length === 0
        ){

            listaHorarios.innerHTML = `

                <div class="estado-vacio-horarios">

                    <i class="bi bi-clock-history"></i>

                    <h3>
                        No existen horarios
                    </h3>

                    <p>
                        No se encontraron horarios con los filtros aplicados.
                    </p>

                </div>

            `;

            return;

        }


        listaHorarios.innerHTML =
        "";


        filtrados.forEach(horario=>{

            const entrada =
            obtenerDatosEntrada(
                horario
            );


            const salida =
            obtenerDatosSalida(
                horario
            );


            const tarjeta =
            document.createElement(
                "div"
            );


            tarjeta.className =
            `horario-card ${
                horario.id ===
                horarioSeleccionadoId
                ?
                "activo"
                :
                ""
            }`;


            tarjeta.dataset.id =
            horario.id;


            tarjeta.innerHTML = `

                <div class="horario-card-header">

                    <div>

                        <h4>

                            ${escaparHTML(
                                horario.nombre ||
                                "Horario sin nombre"
                            )}

                        </h4>

                        <p class="horario-card-descripcion">

                            ${escaparHTML(
                                horario.descripcion ||
                                "Sin descripción"
                            )}

                        </p>

                    </div>


                    <span class="badge-horario ${
                        horario.estado ===
                        "ACTIVO"
                        ?
                        "activo"
                        :
                        "inactivo"
                    }">

                        ${
                            horario.estado ||
                            "ACTIVO"
                        }

                    </span>

                </div>


                <div class="horario-card-horas">

                    <i class="bi bi-clock"></i>

                    <span>

                        ${formatearHora(
                            entrada.programada
                        )}

                        -

                        ${formatearHora(
                            salida.programada
                        )}

                    </span>

                </div>


                <div class="horario-card-info">

                    <span>

                        <i class="bi ${
                            horario.cruzaMedianoche
                            ?
                            "bi-moon-stars"
                            :
                            "bi-sun"
                        }"></i>

                        ${
                            horario.cruzaMedianoche
                            ?
                            "Amanecida"
                            :
                            "Mismo día"
                        }

                    </span>

                    <span>

                        <i class="bi bi-cup-hot"></i>

                        ${
                            horario.refrigerio
                            ?.habilitado
                            ?
                            `${horario.refrigerio.duracionMinutos} min`
                            :
                            "Sin refrigerio"
                        }

                    </span>

                </div>

            `;


tarjeta.onclick =
()=>{

    console.log(
        "Horario seleccionado:",
        horario
    );


    horarioSeleccionadoId =
    horario.id;


    try{

        mostrarDetalleHorario(
            horario
        );


        renderizarHorarios();

    }
    catch(error){

        console.error(
            "Error mostrando detalle del horario:",
            error
        );

    }

};

            listaHorarios.appendChild(
                tarjeta
            );

        });

    }



function mostrarDetalleHorario(
    horario
){

    console.log(
        "Ejecutando mostrarDetalleHorario:",
        horario
    );


    horarioSeleccionadoId =
    horario.id;


        const entrada =
        obtenerDatosEntrada(
            horario
        );


        const salida =
        obtenerDatosSalida(
            horario
        );


if(detalleVacio){

    detalleVacio.hidden =
    true;

}


if(detalleHorario){

    detalleHorario.hidden =
    false;

}


        asignarTexto(
            "detalleNombreHorario",
            horario.nombre ||
            "Horario"
        );


        asignarTexto(
            "detalleDescripcionHorario",
            horario.descripcion ||
            "Sin descripción"
        );


        asignarTexto(
            "detalleHoraEntrada",
            formatearHora(
                entrada.programada
            )
        );


        asignarTexto(
            "detalleHoraSalida",
            formatearHora(
                salida.programada
            )
        );


        asignarTexto(
            "detalleTipoJornada",
            horario.cruzaMedianoche
            ?
            "Amanecida"
            :
            "Diurno"
        );


        asignarTexto(
            "detalleEntradaDesde",
            formatearHora(
                entrada.permitirDesde
            )
        );


        asignarTexto(
            "detalleEntradaProgramada",
            formatearHora(
                entrada.programada
            )
        );


        asignarTexto(
            "detalleEntradaHasta",
            formatearHora(
                entrada.permitirHasta
            )
        );


        asignarTexto(
            "detalleToleranciaEntrada",
            `${entrada.toleranciaMinutos} minutos`
        );


        asignarTexto(
            "detalleSalidaDesde",
            formatearHora(
                salida.permitirDesde
            )
        );


        asignarTexto(
            "detalleSalidaProgramada",
            formatearHora(
                salida.programada
            )
        );


        asignarTexto(
            "detalleSalidaHasta",
            formatearHora(
                salida.permitirHasta
            )
        );


        asignarTexto(
            "detalleHorasExtra",
            formatearHora(
                salida.horasExtraDesde
            )
        );


        actualizarEstadoDetalle(
            horario
        );


        mostrarRefrigerio(
            horario
        );


        try{

    asignaciones
    ?.actualizarDetalle
    ?.();

}
catch(error){

    console.error(
        "Error actualizando asignaciones:",
        error
    );

}

    }



    function actualizarEstadoDetalle(
        horario
    ){

        const estadoDetalle =
        document.getElementById(
            "detalleEstadoHorario"
        );


        if(estadoDetalle){

            estadoDetalle.textContent =
            horario.estado ||
            "ACTIVO";


            estadoDetalle.className =
            `badge-estado-horario ${
                horario.estado ===
                "ACTIVO"
                ?
                "activo"
                :
                "inactivo"
            }`;

        }


        const activo =
        horario.estado ===
        "ACTIVO";


        btnCambiarEstadoHorario.innerHTML =
        activo
        ?
        `

            <i class="bi bi-lock"></i>

            Desactivar

        `
        :
        `

            <i class="bi bi-unlock"></i>

            Activar

        `;


        if(btnAsignarHorario){

            btnAsignarHorario.disabled =
            !activo;


            btnAsignarHorario.title =
            activo
            ?
            "Asignar este horario"
            :
            "Activa el horario para poder asignarlo";

        }

    }



    function mostrarRefrigerio(
        horario
    ){

        const contenedor =
        document.getElementById(
            "detalleRefrigerioHorario"
        );


        if(!contenedor){

            return;

        }


        if(
            !horario.refrigerio
            ?.habilitado
        ){

            contenedor.innerHTML = `

                <span class="refrigerio-no-configurado">

                    Este horario no tiene refrigerio configurado.

                </span>

            `;

            return;

        }


        contenedor.innerHTML = `

            <div class="refrigerio-configurado">

                <i class="bi bi-cup-hot"></i>

                <div>

                    <strong>

                        Puede iniciar entre

                        ${formatearHora(
                            horario.refrigerio
                            .permitirInicioDesde
                        )}

                        y

                        ${formatearHora(
                            horario.refrigerio
                            .permitirInicioHasta
                        )}

                    </strong>

                    <span>

                        Duración permitida:

                        ${horario.refrigerio
                        .duracionMinutos}

                        minutos

                    </span>

                </div>

            </div>

        `;

    }



function limpiarDetalleHorario(){

    horarioSeleccionadoId =
    null;


    if(detalleVacio){

        detalleVacio.hidden =
        false;

    }


    if(detalleHorario){

        detalleHorario.hidden =
        true;

    }

}



    function obtenerHorarioSeleccionado(){

        return horarios.find(
            horario=>

                horario.id ===
                horarioSeleccionadoId

        )
        ??
        null;

    }



    if(btnNuevoHorario){

        btnNuevoHorario.onclick =
        formulario.abrirNuevo;

    }


    if(btnEditarHorario){

        btnEditarHorario.onclick =
        ()=>{

            const horario =
            obtenerHorarioSeleccionado();


            if(horario){

                formulario.abrirEditar(
                    horario
                );

            }

        };

    }


    if(btnAsignarHorario){

        btnAsignarHorario.onclick =
        asignaciones.abrir;

    }


    document.getElementById(
        "btnAsignarHorarioVacio"
    )
    ?.addEventListener(
        "click",
        asignaciones.abrir
    );


    if(buscarHorario){

        buscarHorario.oninput =
        renderizarHorarios;

    }


    if(filtroEstadoHorario){

        filtroEstadoHorario.onchange =
        renderizarHorarios;

    }



    if(btnCambiarEstadoHorario){

        btnCambiarEstadoHorario.onclick =
        async()=>{

            const horario =
            obtenerHorarioSeleccionado();


            if(!horario){

                return;

            }


            const nuevoEstado =
            horario.estado ===
            "ACTIVO"
            ?
            "INACTIVO"
            :
            "ACTIVO";


            const respuesta =
            await Swal.fire({

                icon:
                nuevoEstado ===
                "ACTIVO"
                ?
                "question"
                :
                "warning",

                title:
                nuevoEstado ===
                "ACTIVO"
                ?
                "Activar horario"
                :
                "Desactivar horario",

                text:
                nuevoEstado ===
                "ACTIVO"
                ?
                "El horario volverá a estar disponible para nuevas asignaciones."
                :
                "El horario dejará de estar disponible para nuevas asignaciones.",

                showCancelButton:true,

                confirmButtonText:
                nuevoEstado ===
                "ACTIVO"
                ?
                "Sí, activar"
                :
                "Sí, desactivar",

                cancelButtonText:
                "Cancelar"

            });


            if(
                !respuesta.isConfirmed
            ){

                return;

            }


            try{

                await updateDoc(

                    doc(
                        db,
                        "horarios",
                        horario.id
                    ),

                    {

                        estado:
                        nuevoEstado,

                        fechaModificacion:
                        serverTimestamp()

                    }

                );


                await Swal.fire({

                    icon:"success",

                    title:
                    nuevoEstado ===
                    "ACTIVO"
                    ?
                    "Horario activado"
                    :
                    "Horario desactivado",

                    timer:1500,

                    showConfirmButton:false

                });

            }
            catch(error){

                console.error(
                    "Error al cambiar estado:",
                    error
                );


                await Swal.fire({

                    icon:"error",

                    title:"No se pudo actualizar",

                    text:
                    "Ocurrió un error al cambiar el estado del horario."

                });

            }

        };

    }

}
