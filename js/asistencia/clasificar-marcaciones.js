/*=====================================================
CLASIFICAR MARCACIONES SEGÚN EL HORARIO
=====================================================*/

export function clasificarMarcaciones({

    marcaciones,
    horarios,
    fecha

}){

    const resultado = {

        entrada:null,

        salida:null,

        inicioRefrigerio:null,

        finRefrigerio:null,

        refrigerios:[],

        sinClasificar:[],

        todas:[]

    };


    if(
        !Array.isArray(marcaciones)
        ||
        marcaciones.length === 0
    ){

        return resultado;

    }


    const marcas =
        marcaciones
        .map(marcacion=>({

            ...marcacion,

            minutosJornada:
                obtenerMinutosDesdeFecha(
                    marcacion,
                    fecha
                ),

            tipoInterpretado:null,

            horarioInterpretadoId:null

        }))
        .sort(
            (
                primero,
                segundo
            )=>

                primero.minutosJornada -
                segundo.minutosJornada

        );


    /*
        Primero respetamos las marcaciones manuales
        que ya tienen un tipo explícito.
    */

    marcas.forEach(marcacion=>{

        const tipo =
            String(
                marcacion.tipo ||
                ""
            )
            .trim()
            .toUpperCase();


        if(
            [
                "ENTRADA",
                "SALIDA",
                "INICIO_REFRIGERIO",
                "FIN_REFRIGERIO"
            ]
            .includes(tipo)
        ){

            marcacion.tipoInterpretado =
                tipo;

        }

    });


    const horariosOrdenados =
        (
            Array.isArray(horarios)
            ?
            horarios
            :
            []
        )
        .filter(Boolean)
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

        );


    horariosOrdenados.forEach(horario=>{

        clasificarHorario(
            marcas,
            horario
        );

    });


    const entradas =
        marcas.filter(
            marcacion=>

                marcacion.tipoInterpretado ===
                "ENTRADA"

        );


    const salidas =
        marcas.filter(
            marcacion=>

                marcacion.tipoInterpretado ===
                "SALIDA"

        );


    const iniciosRefrigerio =
        marcas.filter(
            marcacion=>

                marcacion.tipoInterpretado ===
                "INICIO_REFRIGERIO"

        );


    const finesRefrigerio =
        marcas.filter(
            marcacion=>

                marcacion.tipoInterpretado ===
                "FIN_REFRIGERIO"

        );


    resultado.entrada =
        entradas[0] ||
        null;


    resultado.salida =
        salidas[
            salidas.length - 1
        ]
        ||
        null;


    resultado.inicioRefrigerio =
        iniciosRefrigerio[0] ||
        null;


    resultado.finRefrigerio =
        finesRefrigerio[
            finesRefrigerio.length - 1
        ]
        ||
        null;


    resultado.refrigerios =
        construirPeriodosRefrigerio(
            iniciosRefrigerio,
            finesRefrigerio
        );


    resultado.sinClasificar =
        marcas.filter(
            marcacion=>

                !marcacion.tipoInterpretado

        );


    resultado.todas =
        marcas;


    return resultado;

}


/*=====================================================
CLASIFICAR PARA UN HORARIO
=====================================================*/

function clasificarHorario(
    marcaciones,
    horario
){

    const rango =
        construirRangoHorario(
            horario
        );


    /*
        ENTRADA

        Se toma la primera marcación que esté dentro
        de la ventana permitida de entrada.
    */

    const entradaExistente =
        marcaciones.find(
            marcacion=>

                marcacion.tipoInterpretado ===
                "ENTRADA"

                &&

                marcacion.horarioInterpretadoId ===
                horario.id

        );


    if(!entradaExistente){

        const entrada =
            marcaciones.find(
                marcacion=>

                    !marcacion.tipoInterpretado

                    &&

                    estaDentroDelRango(
                        marcacion.minutosJornada,
                        rango.entradaDesde,
                        rango.entradaHasta
                    )

            );


        if(entrada){

            entrada.tipoInterpretado =
                "ENTRADA";

            entrada.horarioInterpretadoId =
                horario.id;

        }

    }


    /*
        SALIDA

        Se toma la última marcación que esté dentro
        de la ventana permitida de salida.
    */

    const salidaExistente =
        marcaciones.find(
            marcacion=>

                marcacion.tipoInterpretado ===
                "SALIDA"

                &&

                marcacion.horarioInterpretadoId ===
                horario.id

        );


    if(!salidaExistente){

        const candidatasSalida =
            marcaciones.filter(
                marcacion=>

                    !marcacion.tipoInterpretado

                    &&

                    estaDentroDelRango(
                        marcacion.minutosJornada,
                        rango.salidaDesde,
                        rango.salidaHasta
                    )

            );


        const salida =
            candidatasSalida[
                candidatasSalida.length - 1
            ];


        if(salida){

            salida.tipoInterpretado =
                "SALIDA";

            salida.horarioInterpretadoId =
                horario.id;

        }

    }


    /*
        REFRIGERIO

        La primera marcación libre dentro del rango
        permitido será el inicio del refrigerio.

        La siguiente marcación libre, anterior a la
        ventana de salida, será el fin.
    */

    if(
        !horario.refrigerio
        ?.habilitado
    ){

        return;

    }


    const inicioRefrigerio =
        marcaciones.find(
            marcacion=>

                !marcacion.tipoInterpretado

                &&

                estaDentroDelRango(
                    marcacion.minutosJornada,
                    rango.refrigerioDesde,
                    rango.refrigerioHasta
                )

        );


    if(!inicioRefrigerio){

        return;

    }


    inicioRefrigerio.tipoInterpretado =
        "INICIO_REFRIGERIO";

    inicioRefrigerio.horarioInterpretadoId =
        horario.id;


    const finRefrigerio =
        marcaciones.find(
            marcacion=>

                !marcacion.tipoInterpretado

                &&

                marcacion.minutosJornada >
                inicioRefrigerio.minutosJornada

                &&

                marcacion.minutosJornada <
                rango.salidaDesde

        );


    if(finRefrigerio){

        finRefrigerio.tipoInterpretado =
            "FIN_REFRIGERIO";

        finRefrigerio.horarioInterpretadoId =
            horario.id;

    }

}


/*=====================================================
CONSTRUIR RANGOS DEL HORARIO
=====================================================*/

function construirRangoHorario(
    horario
){

    let entradaDesde =
        convertirHoraAMinutos(
            horario.entrada?.permitirDesde
            ||
            horario.entrada?.programada
        );


    let entradaHasta =
        convertirHoraAMinutos(
            horario.entrada?.permitirHasta
            ||
            horario.entrada?.programada
        );


    let salidaDesde =
        convertirHoraAMinutos(
            horario.salida?.permitirDesde
            ||
            horario.salida?.programada
        );


    let salidaHasta =
        convertirHoraAMinutos(
            horario.salida?.permitirHasta
            ||
            horario.salida?.programada
        );


    let refrigerioDesde =
        convertirHoraAMinutos(
            horario.refrigerio
            ?.permitirInicioDesde
        );


    let refrigerioHasta =
        convertirHoraAMinutos(
            horario.refrigerio
            ?.permitirInicioHasta
        );


    if(
        horario.cruzaMedianoche
    ){

        if(
            salidaDesde <=
            entradaDesde
        ){

            salidaDesde +=
                1440;

        }


        if(
            salidaHasta <=
            entradaDesde
        ){

            salidaHasta +=
                1440;

        }


        if(
            refrigerioDesde <
            entradaDesde
        ){

            refrigerioDesde +=
                1440;

        }


        if(
            refrigerioHasta <
            entradaDesde
        ){

            refrigerioHasta +=
                1440;

        }

    }


    return {

        entradaDesde,

        entradaHasta,

        entradaProgramada:
            convertirHoraAMinutos(
                horario.entrada?.programada
            ),

        salidaDesde,

        salidaHasta,

        salidaProgramada:
            ajustarMinutosSalida(
                horario
            ),

        refrigerioDesde,

        refrigerioHasta

    };

}


/*=====================================================
PERIODOS DE REFRIGERIO
=====================================================*/

function construirPeriodosRefrigerio(
    inicios,
    fines
){

    const periodos = [];

    const finesUtilizados =
        new Set();


    inicios.forEach(inicio=>{

        const fin =
            fines.find(
                posibleFin=>

                    !finesUtilizados.has(
                        posibleFin
                    )

                    &&

                    posibleFin.minutosJornada >
                    inicio.minutosJornada

            );


        if(fin){

            finesUtilizados.add(
                fin
            );

        }


        periodos.push({

            inicio,

            fin:
                fin ||
                null,

            minutos:
                fin
                ?
                Math.max(
                    0,
                    fin.minutosJornada -
                    inicio.minutosJornada
                )
                :
                0

        });

    });


    return periodos;

}


/*=====================================================
INTERPRETAR UNA HORA MANUAL
=====================================================*/

export function interpretarHoraSegunHorarios({

    hora,
    horarios

}){

    const minutos =
        convertirHoraAMinutos(
            hora
        );


    for(
        const horario of
        horarios
    ){

        const rango =
            construirRangoHorario(
                horario
            );


        if(
            estaDentroDelRango(
                minutos,
                rango.entradaDesde,
                rango.entradaHasta
            )
        ){

            return {

                tipo:"ENTRADA",

                horarioId:
                    horario.id,

                horario

            };

        }


        if(
            horario.refrigerio?.habilitado

            &&

            estaDentroDelRango(
                minutos,
                rango.refrigerioDesde,
                rango.refrigerioHasta
            )
        ){

            return {

                tipo:"INICIO_REFRIGERIO",

                horarioId:
                    horario.id,

                horario

            };

        }


        if(
            estaDentroDelRango(
                minutos,
                rango.salidaDesde,
                rango.salidaHasta
            )
        ){

            return {

                tipo:"SALIDA",

                horarioId:
                    horario.id,

                horario

            };

        }

    }


    return {

        tipo:"SIN_CLASIFICAR",

        horarioId:null,

        horario:null

    };

}


/*=====================================================
UTILIDADES
=====================================================*/

function obtenerMinutosDesdeFecha(
    marcacion,
    fechaISO
){

    const fechaMarcacion =
        obtenerFechaMarcacion(
            marcacion
        );


    const inicioDia =
        new Date(
            `${fechaISO}T00:00:00`
        );


    if(
        Number.isNaN(
            fechaMarcacion.getTime()
        )
    ){

        return convertirHoraAMinutos(
            marcacion.hora
        );

    }


    return Math.floor(
        (
            fechaMarcacion -
            inicioDia
        )
        /
        60000
    );

}


function obtenerFechaMarcacion(
    marcacion
){

    if(
        marcacion.fechaHora
        ?.toDate
    ){

        return marcacion.fechaHora.toDate();

    }


    if(
        marcacion.fechaHoraISO
    ){

        return new Date(
            marcacion.fechaHoraISO
        );

    }


    return new Date(
        `${marcacion.fecha}T${marcacion.hora}`
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


function ajustarMinutosSalida(
    horario
){

    const entrada =
        convertirHoraAMinutos(
            horario.entrada?.programada
        );


    let salida =
        convertirHoraAMinutos(
            horario.salida?.programada
        );


    if(
        horario.cruzaMedianoche
        ||
        salida <= entrada
    ){

        salida +=
            1440;

    }


    return salida;

}


function estaDentroDelRango(
    valor,
    desde,
    hasta
){

    return (
        valor >= desde

        &&

        valor <= hasta
    );

}
