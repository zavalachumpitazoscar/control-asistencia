/*=====================================================
CALCULAR HORAS EXTRA
=====================================================*/

export function calcularHorasExtraAsistencia({

    horario,
    clasificacion,
    calculoAsistencia,
    tratamientoRefrigerioCorto =
        "NO_CONSIDERAR_EXTRA"

}){

    const resultado = {

        calculable:false,

        minutosExtraSalida:0,

        minutosExtraRefrigerio:0,

        minutosExtraTotal:0,

        estado:
            "SIN_EXTRA",

        detalles:[]

    };


    if(
        !horario
        ||
        !clasificacion?.salida
    ){

        return resultado;

    }


    resultado.calculable =
        true;


    const entradaProgramada =
        convertirHoraAMinutos(
            horario.entrada
            ?.programada
        );


    let salidaReal =
        obtenerMinutosMarcacion(
            clasificacion.salida
        );


    let extraDesde =
        convertirHoraAMinutos(
            horario.salida
            ?.horasExtraDesde
        );


    if(
        horario.cruzaMedianoche
    ){

        if(
            salidaReal <=
            entradaProgramada
        ){

            salidaReal +=
                1440;

        }


        if(
            extraDesde <=
            entradaProgramada
        ){

            extraDesde +=
                1440;

        }

    }


    /*
        Extra después de la hora configurada.
    */

    if(extraDesde > 0){

        resultado.minutosExtraSalida =
            Math.max(
                0,
                salidaReal -
                extraDesde
            );

    }


    if(
        resultado.minutosExtraSalida > 0
    ){

        resultado.detalles.push({

            codigo:
                "EXTRA_SALIDA",

            minutos:
                resultado.minutosExtraSalida,

            mensaje:
                `${
                    resultado.minutosExtraSalida
                } minutos después del inicio de horas extra.`

        });

    }


    /*
        Tiempo no utilizado del refrigerio.

        Solo se considera candidato cuando el usuario
        decidió reconocer el tiempo real trabajado.
    */

    if(
        tratamientoRefrigerioCorto ===
        "CONSIDERAR_REAL"
    ){

        resultado.minutosExtraRefrigerio =
            Number(
                calculoAsistencia
                ?.minutosExtraRefrigerioCandidato
                ||
                0
            );

    }


    if(
        resultado.minutosExtraRefrigerio > 0
    ){

        resultado.detalles.push({

            codigo:
                "EXTRA_REFRIGERIO",

            minutos:
                resultado.minutosExtraRefrigerio,

            mensaje:
                `${
                    resultado.minutosExtraRefrigerio
                } minutos trabajados durante el refrigerio.`

        });

    }


    resultado.minutosExtraTotal =
        resultado.minutosExtraSalida
        +
        resultado.minutosExtraRefrigerio;


    if(
        resultado.minutosExtraTotal > 0
    ){

        resultado.estado =
            "PENDIENTE";

    }


    return resultado;

}


/*=====================================================
OBTENER MINUTOS DE MARCACIÓN
=====================================================*/

function obtenerMinutosMarcacion(
    marcacion
){

    if(
        Number.isFinite(
            marcacion?.minutosJornada
        )
    ){

        return marcacion.minutosJornada;

    }


    return convertirHoraAMinutos(
        marcacion?.hora
    );

}


/*=====================================================
CONVERTIR HORA
=====================================================*/

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
        .slice(
            0,
            5
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
