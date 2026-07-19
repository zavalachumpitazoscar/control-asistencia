/*=====================================================
CALCULAR JORNADA Y HORAS TRABAJADAS
=====================================================*/

export function calcularJornadaAsistencia({

    horario,
    clasificacion,

    /*
        Valores futuros que podrá escoger el usuario.
    */

    tratamientoRefrigerio =
        "LABORADO",

    tratamientoRefrigerioCorto =
        "NO_CONSIDERAR_EXTRA"

}){

    const resultado = {

        calculable:false,

        minutosTranscurridos:0,

        minutosRefrigerioProgramado:0,

        minutosRefrigerioReal:0,

        minutosRefrigerioDescontados:0,

        minutosTrabajados:0,

        minutosJornadaProgramada:0,

        minutosJornadaCumplida:0,

        minutosLlegadaPosterior:0,

        minutosSalidaAnticipada:0,

        minutosTardanza:0,

        toleranciaMinutos:0,

        minutosExcesoRefrigerio:0,

        minutosRefrigerioNoUsado:0,

        minutosExtraRefrigerioCandidato:0,

        refrigerioAutomatico:false,

        refrigerioCompleto:false,

        jornadaCompleta:false,

        advertencias:[]

    };


    if(!horario){

        resultado.advertencias.push({

            codigo:
                "SIN_HORARIO",

            tipo:
                "ADVERTENCIA",

            mensaje:
                "No se puede calcular la jornada porque el colaborador no tiene horario."

        });


        return resultado;

    }


    const entrada =
        clasificacion?.entrada
        ||
        null;


    const salida =
        clasificacion?.salida
        ||
        null;


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

        salidaProgramada +=
            1440;

    }


    const tolerancia =
        Number(
            horario.entrada
            ?.toleranciaMinutos
            ||
            0
        );


    resultado.toleranciaMinutos =
        tolerancia;


    const refrigerioHabilitado =
        Boolean(
            horario.refrigerio
            ?.habilitado
        );


    const duracionRefrigerioProgramada =
        refrigerioHabilitado
        ?
        Number(
            horario.refrigerio
            ?.duracionMinutos
            ||
            0
        )
        :
        0;


    resultado.minutosRefrigerioProgramado =
        duracionRefrigerioProgramada;


    const duracionBrutaProgramada =
        Math.max(
            0,
            salidaProgramada -
            entradaProgramada
        );


    resultado.minutosJornadaProgramada =
        Math.max(
            0,
            duracionBrutaProgramada -
            duracionRefrigerioProgramada
        );


    /*
        Sin entrada o sin salida no es posible calcular
        las horas completas de trabajo.
    */

    if(
        !entrada
        ||
        !salida
    ){

        resultado.advertencias.push({

            codigo:
                "MARCACION_INCOMPLETA",

            tipo:
                "ERROR",

            mensaje:
                !entrada
                ?
                "Falta la marcación de entrada."
                :
                "Falta la marcación de salida."

        });


        return resultado;

    }


    const entradaReal =
        obtenerMinutosMarcacion(
            entrada
        );


    let salidaReal =
        obtenerMinutosMarcacion(
            salida
        );


    /*
        Soporte para jornadas que cruzan medianoche.
    */

    if(
        horario.cruzaMedianoche
        &&
        salidaReal <=
        entradaReal
    ){

        salidaReal +=
            1440;

    }


    resultado.calculable =
        true;


    resultado.minutosTranscurridos =
        Math.max(
            0,
            salidaReal -
            entradaReal
        );


    /*
        La tolerancia evita marcar tardanza disciplinaria,
        pero los minutos realmente no trabajados sí afectan
        el cumplimiento de jornada.
    */

    resultado.minutosLlegadaPosterior =
        Math.max(
            0,
            entradaReal -
            entradaProgramada
        );


    resultado.minutosTardanza =
        Math.max(
            0,
            resultado.minutosLlegadaPosterior -
            tolerancia
        );


    resultado.minutosSalidaAnticipada =
        Math.max(
            0,
            salidaProgramada -
            salidaReal
        );


    calcularRefrigerio({

        resultado,

        horario,

        clasificacion,

        tratamientoRefrigerio,

        tratamientoRefrigerioCorto

    });


    resultado.minutosTrabajados =
        Math.max(
            0,
            resultado.minutosTranscurridos -
            resultado.minutosRefrigerioDescontados
        );


    /*
        La jornada no aumenta por llegar antes, salir
        después o tomar menos refrigerio.

        Sí disminuye por:
        - llegada posterior;
        - salida anticipada;
        - exceso de refrigerio.
    */

    resultado.minutosJornadaCumplida =
        Math.max(
            0,

            Math.min(

                resultado.minutosJornadaProgramada,

                resultado.minutosJornadaProgramada
                -
                resultado.minutosLlegadaPosterior
                -
                resultado.minutosSalidaAnticipada
                -
                resultado.minutosExcesoRefrigerio

            )
        );


    resultado.jornadaCompleta =
        resultado.minutosJornadaCumplida >=
        resultado.minutosJornadaProgramada;


    if(
        resultado.minutosLlegadaPosterior > 0
    ){

        resultado.advertencias.push({

            codigo:
                "LLEGADA_POSTERIOR",

            tipo:
                resultado.minutosTardanza > 0
                ?
                "ERROR"
                :
                "INFORMACION",

            minutos:
                resultado.minutosLlegadaPosterior,

            mensaje:
                resultado.minutosTardanza > 0
                ?
                `Llegó ${resultado.minutosLlegadaPosterior} minutos después de la hora programada.`
                :
                `Llegó ${resultado.minutosLlegadaPosterior} minutos después, dentro de la tolerancia.`

        });

    }


    if(
        resultado.minutosSalidaAnticipada > 0
    ){

        resultado.advertencias.push({

            codigo:
                "SALIDA_ANTICIPADA",

            tipo:
                "ADVERTENCIA",

            minutos:
                resultado.minutosSalidaAnticipada,

            mensaje:
                `Salió ${resultado.minutosSalidaAnticipada} minutos antes de la hora programada.`

        });

    }


    return resultado;

}


/*=====================================================
CALCULAR REFRIGERIO
=====================================================*/

function calcularRefrigerio({

    resultado,
    horario,
    clasificacion,
    tratamientoRefrigerio,
    tratamientoRefrigerioCorto

}){

    if(
        !horario.refrigerio
        ?.habilitado
    ){

        return;

    }


    const inicio =
        clasificacion
        ?.inicioRefrigerio
        ||
        null;


    const fin =
        clasificacion
        ?.finRefrigerio
        ||
        null;


    const duracionProgramada =
        resultado
        .minutosRefrigerioProgramado;


    const modo =
        horario.refrigerio
        ?.modo
        ||
        "MARCACION";


    resultado.refrigerioAutomatico =
        Boolean(
            inicio?.esAutomatica
            &&
            fin?.esAutomatica
        );


    /*
        Refrigerio completo, real o automático.
    */

    if(
        inicio
        &&
        fin
    ){

        const inicioMinutos =
            obtenerMinutosMarcacion(
                inicio
            );


        let finMinutos =
            obtenerMinutosMarcacion(
                fin
            );


        if(
            horario.cruzaMedianoche
            &&
            finMinutos <=
            inicioMinutos
        ){

            finMinutos +=
                1440;

        }


        const duracionReal =
            Math.max(
                0,
                finMinutos -
                inicioMinutos
            );


        resultado.refrigerioCompleto =
            true;


        resultado.minutosRefrigerioReal =
            duracionReal;


        /*
            Refrigerio más largo:
            se descuenta todo el tiempo real.
        */

        if(
            duracionReal >
            duracionProgramada
        ){

            resultado.minutosRefrigerioDescontados =
                duracionReal;


            resultado.minutosExcesoRefrigerio =
                duracionReal -
                duracionProgramada;


            resultado.advertencias.push({

                codigo:
                    "REFRIGERIO_EXCESIVO",

                tipo:
                    "ERROR",

                minutos:
                    resultado.minutosExcesoRefrigerio,

                mensaje:
                    `El refrigerio excedió en ${resultado.minutosExcesoRefrigerio} minutos el tiempo permitido.`

            });


            return;

        }


        /*
            Refrigerio más corto:
            por defecto se descuenta la duración completa
            y no se genera tiempo extra.
        */

        if(
            duracionReal <
            duracionProgramada
        ){

            resultado.minutosRefrigerioNoUsado =
                duracionProgramada -
                duracionReal;


            if(
                tratamientoRefrigerioCorto ===
                "CONSIDERAR_REAL"
            ){

                resultado.minutosRefrigerioDescontados =
                    duracionReal;


                resultado.minutosExtraRefrigerioCandidato =
                    resultado.minutosRefrigerioNoUsado;

            }
            else{

                resultado.minutosRefrigerioDescontados =
                    duracionProgramada;

            }


            resultado.advertencias.push({

                codigo:
                    "REFRIGERIO_CORTO",

                tipo:
                    "ADVERTENCIA",

                minutos:
                    resultado.minutosRefrigerioNoUsado,

                mensaje:
                    `Tomó ${resultado.minutosRefrigerioNoUsado} minutos menos de refrigerio. Por defecto no se consideran tiempo extra.`

            });


            return;

        }


        /*
            Duración exacta.
        */

        resultado.minutosRefrigerioDescontados =
            duracionProgramada;


        return;

    }


    /*
        Refrigerio automático sin marcas virtuales.

        Se conserva como protección por si el clasificador
        aún no generó las marcas del sistema.
    */

    if(
        modo ===
        "AUTOMATICO"
    ){

        resultado.refrigerioCompleto =
            true;

        resultado.refrigerioAutomatico =
            true;

        resultado.minutosRefrigerioReal =
            duracionProgramada;

        resultado.minutosRefrigerioDescontados =
            duracionProgramada;


        return;

    }


    /*
        Refrigerio con marcación obligatoria e incompleto.
    */

    if(
        inicio
        ||
        fin
    ){

        resultado.advertencias.push({

            codigo:
                "REFRIGERIO_INCOMPLETO",

            tipo:
                "ADVERTENCIA",

            mensaje:
                !inicio
                ?
                "Falta la marcación de inicio del refrigerio."
                :
                "Falta la marcación de término del refrigerio."

        });

    }
    else{

        resultado.advertencias.push({

            codigo:
                "REFRIGERIO_SIN_MARCACIONES",

            tipo:
                "ADVERTENCIA",

            mensaje:
                "El colaborador no registró su refrigerio."

        });

    }


    /*
        Comportamiento predeterminado solicitado:
        si el usuario no decide nada, se considera que
        trabajó durante el refrigerio.
    */

    if(
        tratamientoRefrigerio ===
        "DESCONTAR_PROGRAMADO"
    ){

        resultado.minutosRefrigerioDescontados =
            duracionProgramada;

    }
    else{

        resultado.minutosRefrigerioDescontados =
            0;

    }

}


/*=====================================================
OBTENER MINUTOS DE UNA MARCACIÓN
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
CONVERTIR HORA A MINUTOS
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
