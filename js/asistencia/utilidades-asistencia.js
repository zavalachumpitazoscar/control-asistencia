/*=====================================================
NORMALIZAR TEXTO
=====================================================*/

export function normalizarTexto(
    valor
){

    return String(
        valor ?? ""
    )
    .normalize("NFD")
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .trim()
    .toUpperCase();

}



/*=====================================================
NORMALIZAR DNI
=====================================================*/

export function normalizarDNI(
    valor
){

    return String(
        valor ?? ""
    )
    .trim()
    .replace(
        /\.0+$/,
        ""
    )
    .replace(
        /\s+/g,
        ""
    );

}



/*=====================================================
VALIDAR DNI
=====================================================*/

export function validarDNI(
    dni
){

    return /^\d{8}$/.test(
        dni
    );

}



/*=====================================================
DOS DÍGITOS
=====================================================*/

function dosDigitos(
    valor
){

    return String(
        valor
    )
    .padStart(
        2,
        "0"
    );

}



/*=====================================================
FORMATEAR FECHA Y HORA
=====================================================*/

export function formatearFechaHora(
    fecha
){

    return [
        dosDigitos(
            fecha.getDate()
        ),
        dosDigitos(
            fecha.getMonth() + 1
        ),
        fecha.getFullYear()
    ]
    .join("/") +
    " " +
    [
        dosDigitos(
            fecha.getHours()
        ),
        dosDigitos(
            fecha.getMinutes()
        ),
        dosDigitos(
            fecha.getSeconds()
        )
    ]
    .join(":");

}



/*=====================================================
FECHA ISO LOCAL
=====================================================*/

export function convertirFechaAISO(
    fecha
){

    return (
        fecha.getFullYear() +
        "-" +
        dosDigitos(
            fecha.getMonth() + 1
        ) +
        "-" +
        dosDigitos(
            fecha.getDate()
        )
    );

}



/*=====================================================
FECHA Y HORA ISO LOCAL
=====================================================*/

export function convertirFechaHoraAISO(
    fecha
){

    return (
        convertirFechaAISO(
            fecha
        ) +
        "T" +
        dosDigitos(
            fecha.getHours()
        ) +
        ":" +
        dosDigitos(
            fecha.getMinutes()
        ) +
        ":" +
        dosDigitos(
            fecha.getSeconds()
        )
    );

}



/*=====================================================
INTERPRETAR MARCACIÓN
=====================================================*/

export function interpretarMarcacion(
    valor
){

    if(
        valor instanceof Date &&
        !Number.isNaN(
            valor.getTime()
        )
    ){

        return new Date(
            valor
        );

    }


    if(typeof valor === "number"){

        return convertirSerialExcelAFecha(
            valor
        );

    }


    const texto =
        String(
            valor ?? ""
        )
        .trim();


    if(!texto){

        return null;

    }


    /*
        DD/MM/YYYY HH:mm:ss
        DD/MM/YYYY HH:mm
    */

    const formatoPeru =
        texto.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if(formatoPeru){

        const [
            ,
            dia,
            mes,
            anio,
            hora,
            minuto,
            segundo = "0"
        ] = formatoPeru;


        return crearFechaValidada(
            Number(anio),
            Number(mes),
            Number(dia),
            Number(hora),
            Number(minuto),
            Number(segundo)
        );

    }


    /*
        YYYY-MM-DD HH:mm:ss
        YYYY-MM-DDTHH:mm:ss
    */

    const formatoISO =
        texto.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if(formatoISO){

        const [
            ,
            anio,
            mes,
            dia,
            hora,
            minuto,
            segundo = "0"
        ] = formatoISO;


        return crearFechaValidada(
            Number(anio),
            Number(mes),
            Number(dia),
            Number(hora),
            Number(minuto),
            Number(segundo)
        );

    }


    return null;

}



/*=====================================================
CREAR FECHA VALIDADA
=====================================================*/

function crearFechaValidada(
    anio,
    mes,
    dia,
    hora,
    minuto,
    segundo
){

    const fecha =
        new Date(
            anio,
            mes - 1,
            dia,
            hora,
            minuto,
            segundo
        );


    const esValida =
        fecha.getFullYear() === anio &&
        fecha.getMonth() === mes - 1 &&
        fecha.getDate() === dia &&
        fecha.getHours() === hora &&
        fecha.getMinutes() === minuto &&
        fecha.getSeconds() === segundo;


    return esValida
        ? fecha
        : null;

}



/*=====================================================
SERIAL DE EXCEL A FECHA
=====================================================*/

function convertirSerialExcelAFecha(
    serial
){

    if(
        !Number.isFinite(serial) ||
        serial <= 0
    ){

        return null;

    }


    const diasCompletos =
        Math.floor(
            serial
        );

    const fraccionDia =
        serial -
        diasCompletos;


    /*
        Base del sistema de fechas de Excel.
    */

    const baseUTC =
        Date.UTC(
            1899,
            11,
            30
        );


    const fechaBase =
        new Date(
            baseUTC +
            diasCompletos *
            86400000
        );


    const segundosDia =
        Math.round(
            fraccionDia *
            86400
        );


    const horas =
        Math.floor(
            segundosDia / 3600
        );

    const minutos =
        Math.floor(
            (
                segundosDia % 3600
            ) / 60
        );

    const segundos =
        segundosDia % 60;


    return new Date(
        fechaBase.getUTCFullYear(),
        fechaBase.getUTCMonth(),
        fechaBase.getUTCDate(),
        horas,
        minutos,
        segundos
    );

}
