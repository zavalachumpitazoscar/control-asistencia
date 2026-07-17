/*=====================================================
VARIABLES
=====================================================*/

let fechaSeleccionada =
    normalizarFecha(
        new Date()
    );

let fechaActualAsistencia;

let btnDiaAnteriorAsistencia;

let btnDiaSiguienteAsistencia;

let btnHoyAsistencia;



/*=====================================================
INICIAR FECHA
=====================================================*/

export function iniciarFechaAsistencia(){

    fechaActualAsistencia =
        document.getElementById(
            "fechaActualAsistencia"
        );

    btnDiaAnteriorAsistencia =
        document.getElementById(
            "btnDiaAnteriorAsistencia"
        );

    btnDiaSiguienteAsistencia =
        document.getElementById(
            "btnDiaSiguienteAsistencia"
        );

    btnHoyAsistencia =
        document.getElementById(
            "btnHoyAsistencia"
        );


    if(!fechaActualAsistencia){

        console.warn(
            "No se encontró fechaActualAsistencia."
        );

        return;

    }


    if(btnDiaAnteriorAsistencia){

        btnDiaAnteriorAsistencia.onclick =
            ()=>cambiarFechaAsistencia(-1);

    }


    if(btnDiaSiguienteAsistencia){

        btnDiaSiguienteAsistencia.onclick =
            ()=>cambiarFechaAsistencia(1);

    }


    if(btnHoyAsistencia){

        btnHoyAsistencia.onclick = ()=>{

            fechaSeleccionada =
                normalizarFecha(
                    new Date()
                );

            actualizarFechaAsistencia();

        };

    }


    actualizarFechaAsistencia();

}



/*=====================================================
CAMBIAR FECHA
=====================================================*/

function cambiarFechaAsistencia(
    cantidadDias
){

    fechaSeleccionada.setDate(
        fechaSeleccionada.getDate() +
        cantidadDias
    );


    fechaSeleccionada =
        normalizarFecha(
            fechaSeleccionada
        );


    actualizarFechaAsistencia();

}



/*=====================================================
ACTUALIZAR FECHA
=====================================================*/

function actualizarFechaAsistencia(){

    fechaActualAsistencia.textContent =
        new Intl.DateTimeFormat(
            "es-PE",
            {
                weekday:"long",
                day:"2-digit",
                month:"long",
                year:"numeric"
            }
        )
        .format(
            fechaSeleccionada
        );


    document.dispatchEvent(
        new CustomEvent(
            "asistencia:cambio-fecha",
            {
                detail:{

                    fecha:
                        obtenerFechaISO(
                            fechaSeleccionada
                        ),

                    fechaObjeto:
                        new Date(
                            fechaSeleccionada
                        )

                }
            }
        )
    );

}



/*=====================================================
OBTENER FECHA SELECCIONADA
=====================================================*/

export function obtenerFechaSeleccionadaAsistencia(){

    return new Date(
        fechaSeleccionada
    );

}



/*=====================================================
NORMALIZAR FECHA
=====================================================*/

function normalizarFecha(
    fecha
){

    return new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate()
    );

}



/*=====================================================
FECHA ISO LOCAL
=====================================================*/

function obtenerFechaISO(
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


    return `${anio}-${mes}-${dia}`;

}
