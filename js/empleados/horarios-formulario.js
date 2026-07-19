import {
    db
}
from "../firebase-config.js";


import {
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


import {
    convertirHoraAMinutos,
    obtenerDatosEntrada,
    obtenerDatosSalida
}
from "./horarios-utilidades.js";



export function iniciarFormularioHorarios({

    empresaId,

    obtenerHorarios,

    alGuardar

}){

    const modalHorario =
    document.getElementById(
        "modalHorario"
    );


    const formHorario =
    document.getElementById(
        "formHorario"
    );


    const guardarHorario =
    document.getElementById(
        "guardarHorario"
    );


    const cerrarHorario =
    document.getElementById(
        "cerrarHorario"
    );


    const cancelarHorario =
    document.getElementById(
        "cancelarHorario"
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


    let horarioEditandoId =
    null;



    function abrirNuevo(){

        horarioEditandoId =
        null;


        formHorario?.reset();


        asignarValor(
            "estadoHorario",
            "ACTIVO"
        );

        asignarValor(
        "modoRefrigerioHorario",
        "MARCACION"
        );


        asignarValor(
            "toleranciaEntradaHorario",
            "5"
        );


        asignarValor(
            "duracionRefrigerioHorario",
            "60"
        );


        cruzaMedianocheHorario.checked =
        false;


        refrigerioHabilitado.checked =
        false;


        document.getElementById(
            "tituloModalHorario"
        ).textContent =
        "Nuevo horario";


        guardarHorario.innerHTML = `

            <i class="bi bi-floppy"></i>

            Guardar horario

        `;


        actualizarMensajeAmanecida();

        actualizarCamposRefrigerio();


        modalHorario.style.display =
        "flex";

    }



    function abrirEditar(
        horario
    ){

        if(!horario){

            return;

        }


        horarioEditandoId =
        horario.id;


        const entrada =
        obtenerDatosEntrada(
            horario
        );


        const salida =
        obtenerDatosSalida(
            horario
        );


        document.getElementById(
            "tituloModalHorario"
        ).textContent =
        "Editar horario";


        guardarHorario.innerHTML = `

            <i class="bi bi-floppy"></i>

            Guardar cambios

        `;


        asignarValor(
            "nombreHorario",
            horario.nombre
        );


        asignarValor(
            "descripcionHorario",
            horario.descripcion
        );


        asignarValor(
            "estadoHorario",
            horario.estado || "ACTIVO"
        );


        asignarValor(
            "permitirEntradaDesdeHorario",
            entrada.permitirDesde
        );


        asignarValor(
            "horaEntradaHorario",
            entrada.programada
        );


        asignarValor(
            "permitirEntradaHastaHorario",
            entrada.permitirHasta
        );


        asignarValor(
            "toleranciaEntradaHorario",
            entrada.toleranciaMinutos
        );


        asignarValor(
            "permitirSalidaDesdeHorario",
            salida.permitirDesde
        );


        asignarValor(
            "horaSalidaHorario",
            salida.programada
        );


        asignarValor(
            "permitirSalidaHastaHorario",
            salida.permitirHasta
        );


        asignarValor(
            "horasExtraDesdeHorario",
            salida.horasExtraDesde
        );


        cruzaMedianocheHorario.checked =
        Boolean(
            horario.cruzaMedianoche
        );


        refrigerioHabilitado.checked =
        Boolean(
            horario.refrigerio
            ?.habilitado
        );


        asignarValor(
            "inicioRefrigerioHorario",
            horario.refrigerio
            ?.permitirInicioDesde
            ??
            ""
        );


        asignarValor(
            "finRefrigerioHorario",
            horario.refrigerio
            ?.permitirInicioHasta
            ??
            ""
        );


        asignarValor(
            "duracionRefrigerioHorario",
            horario.refrigerio
            ?.duracionMinutos
            ??
            60
        );


        actualizarMensajeAmanecida();

        actualizarCamposRefrigerio(
            false
        );


        modalHorario.style.display =
        "flex";

    }



    function cerrar(){

        modalHorario.style.display =
        "none";


        horarioEditandoId =
        null;


        formHorario?.reset();

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



    function actualizarCamposRefrigerio(
        limpiar = true
    ){

        const habilitado =
        refrigerioHabilitado.checked;


        camposRefrigerio.hidden =
        !habilitado;


        if(
            !habilitado
            &&
            limpiar
        ){

            asignarValor(
                "inicioRefrigerioHorario",
                ""
            );


            asignarValor(
                "finRefrigerioHorario",
                ""
            );

        }

    }



    if(formHorario){

        formHorario.addEventListener(
            "submit",
            async evento=>{

                evento.preventDefault();


                const datosFormulario =
                leerFormulario();


                const valido =
                await validarFormulario(
                    datosFormulario
                );


                if(!valido){

                    return;

                }


                const horarios =
                obtenerHorarios();


                const nombreDuplicado =
                horarios.some(horario=>

                    horario.id !==
                    horarioEditandoId

                    &&

                    String(
                        horario.nombre || ""
                    )
                    .trim()
                    .toLowerCase()
                    ===
                    datosFormulario.nombre
                    .toLowerCase()

                );


                if(nombreDuplicado){

                    await Swal.fire({

                        icon:"warning",

                        title:"Horario existente",

                        text:
                        "Ya existe un horario con ese nombre."

                    });

                    return;

                }


                const datosHorario =
                construirDatosHorario(
                    datosFormulario
                );


                try{

                    guardarHorario.disabled =
                    true;


                    guardarHorario.innerHTML = `

                        <span class="spinner-boton"></span>

                        Guardando...

                    `;


                    let horarioGuardadoId =
                    horarioEditandoId;


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


                        horarioGuardadoId =
                        referencia.id;

                    }


                    const editando =
                    Boolean(
                        horarioEditandoId
                    );


                    cerrar();


                    alGuardar?.(
                        horarioGuardadoId
                    );


                    await Swal.fire({

                        icon:"success",

                        title:
                        editando
                        ?
                        "Horario actualizado"
                        :
                        "Horario registrado",

                        text:
                        editando
                        ?
                        "El horario fue actualizado correctamente."
                        :
                        "El horario fue creado correctamente."

                    });

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


                    guardarHorario.innerHTML = `

                        <i class="bi bi-floppy"></i>

                        Guardar horario

                    `;

                }

            }
        );

    }



    function leerFormulario(){

        return {

            nombre:
            obtenerValor(
                "nombreHorario"
            )
            .trim(),

            descripcion:
            obtenerValor(
                "descripcionHorario"
            )
            .trim(),

            estado:
            obtenerValor(
                "estadoHorario"
            ),

            cruzaMedianoche:
            cruzaMedianocheHorario.checked,

            entrada:{

                permitirDesde:
                obtenerValor(
                    "permitirEntradaDesdeHorario"
                ),

                programada:
                obtenerValor(
                    "horaEntradaHorario"
                ),

                permitirHasta:
                obtenerValor(
                    "permitirEntradaHastaHorario"
                ),

                toleranciaMinutos:
                Number(
                    obtenerValor(
                        "toleranciaEntradaHorario"
                    )
                )

            },

            salida:{

                permitirDesde:
                obtenerValor(
                    "permitirSalidaDesdeHorario"
                ),

                programada:
                obtenerValor(
                    "horaSalidaHorario"
                ),

                permitirHasta:
                obtenerValor(
                    "permitirSalidaHastaHorario"
                ),

                horasExtraDesde:
                obtenerValor(
                    "horasExtraDesdeHorario"
                )

            },

            refrigerio:{

                habilitado:
                refrigerioHabilitado.checked,

                permitirInicioDesde:
                obtenerValor(
                    "inicioRefrigerioHorario"
                ),

                permitirInicioHasta:
                obtenerValor(
                    "finRefrigerioHorario"
                ),

                duracionMinutos:
                Number(
                    obtenerValor(
                        "duracionRefrigerioHorario"
                    )
                )

            }

        };

    }



    async function validarFormulario(
        datos
    ){

        const entrada =
        datos.entrada;


        const salida =
        datos.salida;


        if(
            !datos.nombre
            ||
            !entrada.permitirDesde
            ||
            !entrada.programada
            ||
            !entrada.permitirHasta
            ||
            !salida.permitirDesde
            ||
            !salida.programada
            ||
            !salida.permitirHasta
            ||
            !salida.horasExtraDesde
        ){

            await Swal.fire({

                icon:"warning",

                title:"Campos incompletos",

                text:
                "Completa todos los campos obligatorios del horario."

            });

            return false;

        }


        if(
            entrada.permitirDesde >
            entrada.programada
        ){

            await mostrarAdvertencia(

                "Rango de entrada incorrecto",

                "La hora permitida de entrada debe ser anterior o igual a la entrada programada."

            );

            return false;

        }


        if(
            entrada.permitirHasta <
            entrada.programada
        ){

            await mostrarAdvertencia(

                "Rango de entrada incorrecto",

                "La hora límite de entrada no puede ser anterior a la entrada programada."

            );

            return false;

        }


        if(
            entrada.toleranciaMinutos < 0
            ||
            entrada.toleranciaMinutos > 180
        ){

            await mostrarAdvertencia(

                "Tolerancia incorrecta",

                "La tolerancia debe estar entre 0 y 180 minutos."

            );

            return false;

        }


        if(
            salida.permitirDesde >
            salida.programada
        ){

            await mostrarAdvertencia(

                "Rango de salida incorrecto",

                "La hora permitida de salida debe ser anterior o igual a la salida programada."

            );

            return false;

        }


        if(
            salida.permitirHasta <
            salida.programada
        ){

            await mostrarAdvertencia(

                "Rango de salida incorrecto",

                "La hora límite de salida debe ser posterior o igual a la salida programada."

            );

            return false;

        }


        if(
            !datos.cruzaMedianoche
            &&
            salida.programada <=
            entrada.programada
        ){

            await mostrarAdvertencia(

                "Jornada incorrecta",

                "La salida debe ser posterior a la entrada. Activa el horario de amanecida cuando la salida corresponda al día siguiente."

            );

            return false;

        }


        if(
            salida.horasExtraDesde <
            salida.programada
        ){

            await mostrarAdvertencia(

                "Horas extra incorrectas",

                "Las horas extra deben comenzar desde la salida programada o después."

            );

            return false;

        }


        if(datos.refrigerio.habilitado){

            const refrigerio =
            datos.refrigerio;


            if(
                !refrigerio.permitirInicioDesde
                ||
                !refrigerio.permitirInicioHasta
            ){

                await mostrarAdvertencia(

                    "Refrigerio incompleto",

                    "Completa el rango permitido para iniciar el refrigerio."

                );

                return false;

            }


            if(
                refrigerio.permitirInicioHasta <=
                refrigerio.permitirInicioDesde
            ){

                await mostrarAdvertencia(

                    "Rango de refrigerio incorrecto",

                    "La hora final del rango debe ser posterior a la hora inicial."

                );

                return false;

            }


            if(
                refrigerio.duracionMinutos <= 0
            ){

                await mostrarAdvertencia(

                    "Duración incorrecta",

                    "Indica una duración válida para el refrigerio."

                );

                return false;

            }


            const amplitudRango =
            convertirHoraAMinutos(
                refrigerio.permitirInicioHasta
            )
            -
            convertirHoraAMinutos(
                refrigerio.permitirInicioDesde
            );


            if(
                refrigerio.duracionMinutos >
                amplitudRango
            ){

                await mostrarAdvertencia(

                    "Duración fuera del rango",

                    "La duración del refrigerio no puede ser mayor que el rango permitido."

                );

                return false;

            }

        }


        return true;

    }



    function construirDatosHorario(
        datos
    ){

        return {

            empresaId,

            nombre:
            datos.nombre,

            descripcion:
            datos.descripcion,

            estado:
            datos.estado,

            tipoJornada:
            "FIJO",

            cruzaMedianoche:
            datos.cruzaMedianoche,

            entrada:{

                permitirDesde:
                datos.entrada.permitirDesde,

                programada:
                datos.entrada.programada,

                permitirHasta:
                datos.entrada.permitirHasta,

                toleranciaMinutos:
                datos.entrada.toleranciaMinutos

            },

            salida:{

                permitirDesde:
                datos.salida.permitirDesde,

                programada:
                datos.salida.programada,

                permitirHasta:
                datos.salida.permitirHasta,

                horasExtraDesde:
                datos.salida.horasExtraDesde

            },

            refrigerio:{

                habilitado:
                datos.refrigerio.habilitado,

                permitirInicioDesde:
                datos.refrigerio.habilitado
                ?
                datos.refrigerio.permitirInicioDesde
                :
                null,

                permitirInicioHasta:
                datos.refrigerio.habilitado
                ?
                datos.refrigerio.permitirInicioHasta
                :
                null,

                duracionMinutos:
                datos.refrigerio.habilitado
                ?
                datos.refrigerio.duracionMinutos
                :
                null

            }

        };

    }



    if(cerrarHorario){

        cerrarHorario.onclick =
        cerrar;

    }


    if(cancelarHorario){

        cancelarHorario.onclick =
        cerrar;

    }


    if(modalHorario){

        modalHorario.onclick =
        evento=>{

            if(
                evento.target ===
                modalHorario
            ){

                cerrar();

            }

        };

    }


    if(cruzaMedianocheHorario){

        cruzaMedianocheHorario.onchange =
        actualizarMensajeAmanecida;

    }


    if(refrigerioHabilitado){

        refrigerioHabilitado.onchange =
        ()=>{

            actualizarCamposRefrigerio(
                true
            );

        };

    }


    return {

        abrirNuevo,

        abrirEditar,

        cerrar

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



async function mostrarAdvertencia(
    titulo,
    texto
){

    await Swal.fire({

        icon:"warning",

        title:titulo,

        text:texto

    });

}
