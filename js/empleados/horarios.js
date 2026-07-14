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
    doc,
    updateDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


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


    const modalHorario =
    document.getElementById(
        "modalHorario"
    );


    const formHorario =
    document.getElementById(
        "formHorario"
    );


    const cerrarHorario =
    document.getElementById(
        "cerrarHorario"
    );


    const cancelarHorario =
    document.getElementById(
        "cancelarHorario"
    );


    const guardarHorario =
    document.getElementById(
        "guardarHorario"
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


    const cruzaMedianocheHorario =
    document.getElementById(
        "cruzaMedianocheHorario"
    );


    const mensajeAmanecidaHorario =
    document.getElementById(
        "mensajeAmanecidaHorario"
    );


    const refrigerioHabilitado =
    document.getElementById(
        "refrigerioHabilitadoHorario"
    );


    const camposRefrigerio =
    document.getElementById(
        "camposRefrigerioHorario"
    );


    const btnLunesViernes =
    document.getElementById(
        "btnLunesViernes"
    );


    const btnTodosDias =
    document.getElementById(
        "btnTodosDias"
    );


    const btnLimpiarDias =
    document.getElementById(
        "btnLimpiarDias"
    );


    const diasInputs = {

        lunes:
        document.getElementById(
            "diaLunes"
        ),

        martes:
        document.getElementById(
            "diaMartes"
        ),

        miercoles:
        document.getElementById(
            "diaMiercoles"
        ),

        jueves:
        document.getElementById(
            "diaJueves"
        ),

        viernes:
        document.getElementById(
            "diaViernes"
        ),

        sabado:
        document.getElementById(
            "diaSabado"
        ),

        domingo:
        document.getElementById(
            "diaDomingo"
        )

    };


    let horarios = [];

    let horarioSeleccionadoId =
    null;

    let horarioEditandoId =
    null;



    //=================================================
    // LISTADO EN TIEMPO REAL
    //=================================================

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
                horarios.find(
                    horario=>
                    horario.id ===
                    horarioSeleccionadoId
                );


                if(horarioActual){

                    mostrarDetalleHorario(
                        horarioActual
                    );

                }
                else{

                    limpiarDetalleHorario();

                }

            }

        },

        error=>{

            console.error(
                "Error al listar horarios:",
                error
            );

        }

    );



    //=================================================
    // RENDER
    //=================================================

    function renderizarHorarios(){

        const texto =
        buscarHorario?.value
        .trim()
        .toLowerCase() || "";


        const estado =
        filtroEstadoHorario?.value ||
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
            nombre.includes(texto)
            ||
            descripcion.includes(texto);


            const coincideEstado =
            !estado
            ||
            horario.estado === estado;


            return (
                coincideTexto &&
                coincideEstado
            );

        });


        if(contadorHorarios){

            contadorHorarios.textContent =
            filtrados.length;

        }


        if(filtrados.length === 0){

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


        listaHorarios.innerHTML = "";


        filtrados.forEach(horario=>{

            const dias =
            obtenerDiasActivos(
                horario.diasSemana
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
                            horario.horaEntrada
                        )}

                        -

                        ${formatearHora(
                            horario.horaSalida
                        )}

                    </span>

                </div>


                <div class="horario-card-dias">

                    ${dias.map(dia=>`

                        <span class="horario-dia-mini">

                            ${dia.corto}

                        </span>

                    `).join("")}

                </div>

            `;


            tarjeta.onclick = ()=>{

                horarioSeleccionadoId =
                horario.id;


                renderizarHorarios();


                mostrarDetalleHorario(
                    horario
                );

            };


            listaHorarios.appendChild(
                tarjeta
            );

        });

    }



    //=================================================
    // DETALLE
    //=================================================

    function mostrarDetalleHorario(
        horario
    ){

        horarioSeleccionadoId =
        horario.id;


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
                horario.horaEntrada
            )
        );


        asignarTexto(
            "detalleHoraSalida",
            formatearHora(
                horario.horaSalida
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
            "detalleFrecuencia",
            horario.recurrencia
            ?.intervaloSemanas === 2
            ?
            "Cada 2 semanas"
            :
            "Semanal"
        );


        asignarTexto(
            "detalleEntradaDesde",
            formatearHora(
                horario.permitirEntradaDesde
            )
        );


        asignarTexto(
            "detalleEntradaProgramada",
            formatearHora(
                horario.horaEntrada
            )
        );


        asignarTexto(
            "detalleSalidaProgramada",
            formatearHora(
                horario.horaSalida
            )
        );


        asignarTexto(
            "detalleHorasExtra",
            formatearHora(
                horario.horasExtraDesde
            )
        );


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


        const contenedorDias =
        document.getElementById(
            "detalleDiasHorario"
        );


        if(contenedorDias){

            const dias =
            obtenerDiasActivos(
                horario.diasSemana
            );


            contenedorDias.innerHTML =
            dias.length > 0
            ?
            dias.map(dia=>`

                <span class="detalle-dia">

                    ${dia.nombre}

                </span>

            `).join("")
            :
            `

                <span class="refrigerio-no-configurado">

                    No hay días configurados.

                </span>

            `;

        }


        const detalleRefrigerio =
        document.getElementById(
            "detalleRefrigerioHorario"
        );


        if(detalleRefrigerio){

            if(
                horario.refrigerio
                ?.habilitado
            ){

                detalleRefrigerio.innerHTML = `

                    <div class="refrigerio-configurado">

                        <i class="bi bi-cup-hot"></i>

                        <strong>

                            ${formatearHora(
                                horario.refrigerio.inicio
                            )}

                            -

                            ${formatearHora(
                                horario.refrigerio.fin
                            )}

                        </strong>

                    </div>

                `;

            }
            else{

                detalleRefrigerio.innerHTML = `

                    <span class="refrigerio-no-configurado">

                        Este horario no tiene refrigerio configurado.

                    </span>

                `;

            }

        }


        if(btnCambiarEstadoHorario){

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

        }

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



    //=================================================
    // ABRIR NUEVO
    //=================================================

    function abrirNuevoHorario(){

        horarioEditandoId =
        null;


        formHorario?.reset();


        document.getElementById(
            "tituloModalHorario"
        ).textContent =
        "Nuevo horario";


        guardarHorario.innerHTML = `

            <i class="bi bi-floppy"></i>

            Guardar horario

        `;


        Object.values(
            diasInputs
        )
        .forEach(input=>{

            if(input){

                input.checked =
                false;

            }

        });


        marcarLunesViernes();


        cruzaMedianocheHorario.checked =
        false;


        refrigerioHabilitado.checked =
        false;


        actualizarMensajeAmanecida();

        actualizarCamposRefrigerio();


        const fechaInicio =
        document.getElementById(
            "fechaInicioHorario"
        );


        if(fechaInicio){

            fechaInicio.value =
            obtenerFechaActual();

        }


        modalHorario.style.display =
        "flex";

    }



    //=================================================
    // ABRIR EDICIÓN
    //=================================================

    function abrirEditarHorario(
        horario
    ){

        horarioEditandoId =
        horario.id;

        
        document.getElementById(
            "tituloModalHorario"
        ).textContent =
        "Editar horario";


        guardarHorario.innerHTML = `

            <i class="bi bi-floppy"></i>

            Guardar cambios

        `;


        document.getElementById(
    "permitirEntradaHastaHorario"
).value =
horario.entrada?.permitirHasta || "";


document.getElementById(
    "toleranciaEntradaHorario"
).value =
horario.entrada?.toleranciaMinutos ?? 5;


document.getElementById(
    "permitirSalidaDesdeHorario"
).value =
horario.salida?.permitirDesde || "";


document.getElementById(
    "permitirSalidaHastaHorario"
).value =
horario.salida?.permitirHasta || "";
        
        document.getElementById(
            "nombreHorario"
        ).value =
        horario.nombre || "";


        document.getElementById(
            "descripcionHorario"
        ).value =
        horario.descripcion || "";


        document.getElementById(
            "estadoHorario"
        ).value =
        horario.estado || "ACTIVO";


        document.getElementById(
            "permitirEntradaDesdeHorario"
        ).value =
        horario.permitirEntradaDesde || "";


        document.getElementById(
            "horaEntradaHorario"
        ).value =
        horario.horaEntrada || "";


        document.getElementById(
            "horaSalidaHorario"
        ).value =
        horario.horaSalida || "";


        document.getElementById(
            "horasExtraDesdeHorario"
        ).value =
        horario.horasExtraDesde || "";


        cruzaMedianocheHorario.checked =
        Boolean(
            horario.cruzaMedianoche
        );


        document.getElementById(
            "fechaInicioHorario"
        ).value =
        horario.recurrencia
        ?.fechaInicio || "";


        document.getElementById(
            "intervaloSemanasHorario"
        ).value =
        String(
            horario.recurrencia
            ?.intervaloSemanas || 1
        );


        Object.entries(
            diasInputs
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
                    Boolean(
                        horario.diasSemana
                        ?.[dia]
                    );

                }

            }
        );


        refrigerioHabilitado.checked =
        Boolean(
            horario.refrigerio
            ?.habilitado
        );


document.getElementById(
    "inicioRefrigerioHorario"
).value =
horario.refrigerio
?.permitirInicioDesde || "";


document.getElementById(
    "finRefrigerioHorario"
).value =
horario.refrigerio
?.permitirInicioHasta || "";


document.getElementById(
    "duracionRefrigerioHorario"
).value =
horario.refrigerio
?.duracionMinutos ?? 60;


        actualizarMensajeAmanecida();

        actualizarCamposRefrigerio();


        modalHorario.style.display =
        "flex";

    }



    //=================================================
    // CERRAR MODAL
    //=================================================

    function cerrarModalHorario(){

        modalHorario.style.display =
        "none";


        horarioEditandoId =
        null;


        formHorario?.reset();

    }



    //=================================================
    // GUARDAR
    //=================================================

    if(formHorario){

        formHorario.addEventListener(
            "submit",
            async evento=>{

                evento.preventDefault();


                const permitirEntradaHasta =
document.getElementById(
    "permitirEntradaHastaHorario"
).value;


const toleranciaEntradaMinutos =
Number(
    document.getElementById(
        "toleranciaEntradaHorario"
    ).value
);
                
                const nombre =
                document.getElementById(
                    "nombreHorario"
                )
                .value
                .trim();


                const descripcion =
                document.getElementById(
                    "descripcionHorario"
                )
                .value
                .trim();


                const estado =
                document.getElementById(
                    "estadoHorario"
                )
                .value;


                const permitirEntradaDesde =
                document.getElementById(
                    "permitirEntradaDesdeHorario"
                )
                .value;


                const horaEntrada =
                document.getElementById(
                    "horaEntradaHorario"
                )
                .value;


                const horaSalida =
                document.getElementById(
                    "horaSalidaHorario"
                )
                .value;

                const permitirSalidaDesde =
document.getElementById(
    "permitirSalidaDesdeHorario"
).value;


const permitirSalidaHasta =
document.getElementById(
    "permitirSalidaHastaHorario"
).value;


                const horasExtraDesde =
                document.getElementById(
                    "horasExtraDesdeHorario"
                )
                .value;


                const cruzaMedianoche =
                cruzaMedianocheHorario
                .checked;


                const fechaInicio =
                document.getElementById(
                    "fechaInicioHorario"
                )
                .value;


                const intervaloSemanas =
                Number(
                    document.getElementById(
                        "intervaloSemanasHorario"
                    )
                    .value
                );


                const diasSemana = {

                    lunes:
                    diasInputs.lunes
                    ?.checked || false,

                    martes:
                    diasInputs.martes
                    ?.checked || false,

                    miercoles:
                    diasInputs.miercoles
                    ?.checked || false,

                    jueves:
                    diasInputs.jueves
                    ?.checked || false,

                    viernes:
                    diasInputs.viernes
                    ?.checked || false,

                    sabado:
                    diasInputs.sabado
                    ?.checked || false,

                    domingo:
                    diasInputs.domingo
                    ?.checked || false

                };


                const incluirRefrigerio =
                refrigerioHabilitado
                .checked;


                const inicioRefrigerio =
                document.getElementById(
                    "inicioRefrigerioHorario"
                )
                .value;


                const finRefrigerio =
                document.getElementById(
                    "finRefrigerioHorario"
                )
                .value;

                const duracionRefrigerioMinutos =
Number(
    document.getElementById(
        "duracionRefrigerioHorario"
    ).value
);


if(
    !nombre ||
    !permitirEntradaDesde ||
    !horaEntrada ||
    !permitirEntradaHasta ||
    !permitirSalidaDesde ||
    !horaSalida ||
    !permitirSalidaHasta ||
    !horasExtraDesde ||
    !fechaInicio
){

                    await Swal.fire({

                        icon:"warning",

                        title:"Campos incompletos",

                        text:
                        "Completa los campos obligatorios del horario."

                    });

                    return;

                }


                const tieneDias =
                Object.values(
                    diasSemana
                )
                .some(Boolean);


                if(!tieneDias){

                    await Swal.fire({

                        icon:"warning",

                        title:"Selecciona los días",

                        text:
                        "El horario debe aplicarse al menos a un día de la semana."

                    });

                    return;

                }


                if(
                    permitirEntradaDesde >
                    horaEntrada
                ){

                    await Swal.fire({

                        icon:"warning",

                        title:"Hora de entrada incorrecta",

                        text:
                        "La hora permitida de entrada debe ser anterior o igual a la entrada programada."

                    });

                    return;

                }

                if(
    permitirEntradaHasta <
    horaEntrada
){

    await Swal.fire({

        icon:"warning",

        title:"Rango de entrada incorrecto",

        text:
        "La hora límite de entrada no puede ser anterior a la entrada programada."

    });

    return;

}


if(
    toleranciaEntradaMinutos < 0
){

    await Swal.fire({

        icon:"warning",

        title:"Tolerancia incorrecta",

        text:
        "La tolerancia de entrada no puede ser negativa."

    });

    return;

}


                if(!cruzaMedianoche){

                    if(
    permitirSalidaDesde >
    horaSalida
){

    await Swal.fire({

        icon:"warning",

        title:"Rango de salida incorrecto",

        text:
        "La hora permitida de salida debe ser anterior o igual a la salida programada."

    });

    return;

}


if(
    permitirSalidaHasta <
    horaSalida
){

    await Swal.fire({

        icon:"warning",

        title:"Rango de salida incorrecto",

        text:
        "La hora límite de salida debe ser posterior o igual a la salida programada."

    });

    return;

}

                    if(
                        horaSalida <=
                        horaEntrada
                    ){

                        await Swal.fire({

                            icon:"warning",

                            title:"Jornada incorrecta",

                            text:
                            "La salida debe ser posterior a la entrada. Activa horario de amanecida si la salida corresponde al día siguiente."

                        });

                        return;

                    }


                    if(
                        horasExtraDesde <
                        horaSalida
                    ){

                        await Swal.fire({

                            icon:"warning",

                            title:"Horas extra incorrectas",

                            text:
                            "Las horas extra no pueden comenzar antes de la salida programada."

                        });

                        return;

                    }

                }
                else{

                    if(
                        horasExtraDesde <
                        horaSalida
                    ){

                        await Swal.fire({

                            icon:"warning",

                            title:"Horas extra incorrectas",

                            text:
                            "En un horario de amanecida, las horas extra deben comenzar desde la salida programada o después."

                        });

                        return;

                    }

                }


                if(incluirRefrigerio){

                    if(
                        !inicioRefrigerio ||
                        !finRefrigerio
                    ){

                        await Swal.fire({

                            icon:"warning",

                            title:"Refrigerio incompleto",

                            text:
                            "Completa la hora de inicio y fin del refrigerio."

                        });

                        return;

                    }


if(
    finRefrigerio <
    inicioRefrigerio
){

    await Swal.fire({

        icon:"warning",

        title:"Rango de refrigerio incorrecto",

        text:
        "La hora final del rango debe ser posterior a la hora inicial."

    });

    return;

}


if(
    !duracionRefrigerioMinutos ||
    duracionRefrigerioMinutos <= 0
){

    await Swal.fire({

        icon:"warning",

        title:"Duración incorrecta",

        text:
        "Indica cuántos minutos puede durar el refrigerio."

    });

    return;

}

                    const minutosInicioRefrigerio =
convertirHoraAMinutos(
    inicioRefrigerio
);


const minutosFinRefrigerio =
convertirHoraAMinutos(
    finRefrigerio
);


const amplitudRangoRefrigerio =
minutosFinRefrigerio -
minutosInicioRefrigerio;


if(
    duracionRefrigerioMinutos >
    amplitudRangoRefrigerio
){

    await Swal.fire({

        icon:"warning",

        title:"Duración fuera del rango",

        text:
        "La duración del refrigerio no puede ser mayor que el rango permitido."

    });

    return;

}

                }


                const nombreDuplicado =
                horarios.some(horario=>{

                    return (

                        horario.id !==
                        horarioEditandoId

                        &&

                        String(
                            horario.nombre || ""
                        )
                        .trim()
                        .toLowerCase()
                        ===
                        nombre.toLowerCase()

                    );

                });


                if(nombreDuplicado){

                    await Swal.fire({

                        icon:"warning",

                        title:"Horario existente",

                        text:
                        "Ya existe un horario con ese nombre."

                    });

                    return;

                }


                const datosHorario = {

    empresaId,

    nombre,

    descripcion,

    estado,

    tipoJornada:"FIJO",

    cruzaMedianoche,

    permitirEntradaDesde,

    horaEntrada,

    horaSalida,

    horasExtraDesde,

    entrada:{

        permitirDesde:
        permitirEntradaDesde,

        programada:
        horaEntrada,

        permitirHasta:
        permitirEntradaHasta,

        toleranciaMinutos:
        toleranciaEntradaMinutos

    },

    salida:{

        permitirDesde:
        permitirSalidaDesde,

        programada:
        horaSalida,

        permitirHasta:
        permitirSalidaHasta,

        horasExtraDesde

    },

    diasSemana,

    recurrencia:{

        tipo:"SEMANAL",

        intervaloSemanas,

        fechaInicio

    },

    refrigerio:{

        habilitado:
        incluirRefrigerio,

        permitirInicioDesde:
        incluirRefrigerio
        ?
        inicioRefrigerio
        :
        null,

        permitirInicioHasta:
        incluirRefrigerio
        ?
        finRefrigerio
        :
        null,

        duracionMinutos:
        incluirRefrigerio
        ?
        duracionRefrigerioMinutos
        :
        null

    }

};


                try{

                    guardarHorario.disabled =
                    true;


                    guardarHorario.innerHTML = `

                        <span class="spinner-boton"></span>

                        Guardando...

                    `;


                    if(horarioEditandoId){

                        await updateDoc(

                            doc(
                                db,
                                "horarios",
                                horarioEditandoId
                            ),

                            {

                                ...datosHorario,

                                fechaModificacion:
                                serverTimestamp()

                            }

                        );


                        horarioSeleccionadoId =
                        horarioEditandoId;


                        cerrarModalHorario();


                        await Swal.fire({

                            icon:"success",

                            title:"Horario actualizado",

                            text:
                            "El horario fue actualizado correctamente."

                        });

                    }
                    else{

                        const referencia =
                        await addDoc(

                            collection(
                                db,
                                "horarios"
                            ),

                            {

                                ...datosHorario,

                                fechaRegistro:
                                serverTimestamp(),

                                fechaModificacion:
                                serverTimestamp()

                            }

                        );


                        horarioSeleccionadoId =
                        referencia.id;


                        cerrarModalHorario();


                        await Swal.fire({

                            icon:"success",

                            title:"Horario registrado",

                            text:
                            "El horario fue creado correctamente."

                        });

                    }

                }
                catch(error){

                    console.error(
                        "Error al guardar horario:",
                        error
                    );


                    await Swal.fire({

                        icon:"error",

                        title:"No se pudo guardar",

                        text:
                        "Ocurrió un error al guardar el horario."

                    });

                }
                finally{

                    guardarHorario.disabled =
                    false;


                    guardarHorario.innerHTML =
                    horarioEditandoId
                    ?
                    `

                        <i class="bi bi-floppy"></i>

                        Guardar cambios

                    `
                    :
                    `

                        <i class="bi bi-floppy"></i>

                        Guardar horario

                    `;

                }

            }
        );

    }



    //=================================================
    // CAMBIAR ESTADO
    //=================================================

    if(btnCambiarEstadoHorario){

        btnCambiarEstadoHorario.onclick =
        async()=>{

            const horario =
            horarios.find(
                item=>
                item.id ===
                horarioSeleccionadoId
            );


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
                "El horario volverá a estar disponible para asignaciones."
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


            if(!respuesta.isConfirmed){

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


                Swal.fire({

                    icon:"error",

                    title:"No se pudo actualizar",

                    text:
                    "Ocurrió un error al cambiar el estado del horario."

                });

            }

        };

    }



    //=================================================
    // EVENTOS
    //=================================================

    if(btnNuevoHorario){

        btnNuevoHorario.onclick =
        abrirNuevoHorario;

    }


    if(cerrarHorario){

        cerrarHorario.onclick =
        cerrarModalHorario;

    }


    if(cancelarHorario){

        cancelarHorario.onclick =
        cerrarModalHorario;

    }


    if(modalHorario){

        modalHorario.onclick =
        evento=>{

            if(
                evento.target ===
                modalHorario
            ){

                cerrarModalHorario();

            }

        };

    }


    if(buscarHorario){

        buscarHorario.oninput =
        renderizarHorarios;

    }


    if(filtroEstadoHorario){

        filtroEstadoHorario.onchange =
        renderizarHorarios;

    }


    if(btnEditarHorario){

        btnEditarHorario.onclick =
        ()=>{

            const horario =
            horarios.find(
                item=>
                item.id ===
                horarioSeleccionadoId
            );


            if(horario){

                abrirEditarHorario(
                    horario
                );

            }

        };

    }


    if(cruzaMedianocheHorario){

        cruzaMedianocheHorario.onchange =
        actualizarMensajeAmanecida;

    }


    if(refrigerioHabilitado){

        refrigerioHabilitado.onchange =
        actualizarCamposRefrigerio;

    }


    if(btnLunesViernes){

        btnLunesViernes.onclick =
        marcarLunesViernes;

    }


    if(btnTodosDias){

        btnTodosDias.onclick =
        ()=>{

            Object.values(
                diasInputs
            )
            .forEach(input=>{

                if(input){

                    input.checked =
                    true;

                }

            });

        };

    }


    if(btnLimpiarDias){

        btnLimpiarDias.onclick =
        ()=>{

            Object.values(
                diasInputs
            )
            .forEach(input=>{

                if(input){

                    input.checked =
                    false;

                }

            });

        };

    }



    //=================================================
    // FUNCIONES DE INTERFAZ
    //=================================================

    function marcarLunesViernes(){

        diasInputs.lunes.checked =
        true;

        diasInputs.martes.checked =
        true;

        diasInputs.miercoles.checked =
        true;

        diasInputs.jueves.checked =
        true;

        diasInputs.viernes.checked =
        true;

        diasInputs.sabado.checked =
        false;

        diasInputs.domingo.checked =
        false;

    }


    function actualizarMensajeAmanecida(){

        if(!mensajeAmanecidaHorario){

            return;

        }


        mensajeAmanecidaHorario.innerHTML =
        cruzaMedianocheHorario.checked
        ?
        `

            <i class="bi bi-moon-stars"></i>

            <span>

                La salida corresponde al día siguiente.

            </span>

        `
        :
        `

            <i class="bi bi-info-circle"></i>

            <span>

                La entrada y salida corresponden al mismo día.

            </span>

        `;

    }


    function actualizarCamposRefrigerio(){

        if(!camposRefrigerio){

            return;

        }


        const habilitado =
        refrigerioHabilitado.checked;


        camposRefrigerio.hidden =
        !habilitado;


        const inicio =
        document.getElementById(
            "inicioRefrigerioHorario"
        );


        const fin =
        document.getElementById(
            "finRefrigerioHorario"
        );


        if(!habilitado){

            inicio.value = "";

            fin.value = "";

        }

    }

}



//=====================================================
// FUNCIONES AUXILIARES
//=====================================================

function obtenerDiasActivos(
    diasSemana = {}
){

    const dias = [

        {
            clave:"lunes",
            nombre:"Lunes",
            corto:"Lun"
        },

        {
            clave:"martes",
            nombre:"Martes",
            corto:"Mar"
        },

        {
            clave:"miercoles",
            nombre:"Miércoles",
            corto:"Mié"
        },

        {
            clave:"jueves",
            nombre:"Jueves",
            corto:"Jue"
        },

        {
            clave:"viernes",
            nombre:"Viernes",
            corto:"Vie"
        },

        {
            clave:"sabado",
            nombre:"Sábado",
            corto:"Sáb"
        },

        {
            clave:"domingo",
            nombre:"Domingo",
            corto:"Dom"
        }

    ];


    return dias.filter(dia=>
        Boolean(
            diasSemana?.[
                dia.clave
            ]
        )
    );

}


function formatearHora(
    hora
){

    if(!hora){

        return "--:--";

    }


    const [
        horas,
        minutos
    ] =
    hora.split(":");


    const fecha =
    new Date();


    fecha.setHours(
        Number(horas),
        Number(minutos),
        0,
        0
    );


    return fecha.toLocaleTimeString(
        "es-PE",
        {
            hour:"2-digit",
            minute:"2-digit",
            hour12:true
        }
    );

}


function asignarTexto(
    id,
    valor
){

    const elemento =
    document.getElementById(
        id
    );


    if(elemento){

        elemento.textContent =
        valor;

    }

}


function obtenerFechaActual(){

    const fecha =
    new Date();


    const año =
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


    return `${año}-${mes}-${dia}`;

}


function escaparHTML(
    valor
){

    return String(
        valor ?? ""
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
    hora.split(":")
    .map(Number);


    return (
        horas * 60
        +
        minutos
    );

}
