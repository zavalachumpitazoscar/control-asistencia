//=====================================================
// UTILIDADES DE HORARIOS
//=====================================================

export const NOMBRES_MESES = [

    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"

];


export const DIAS_SEMANA = [

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



export function formatearHora(
    hora
){

    if(!hora){

        return "--:--";

    }


    const partes =
    String(hora)
    .split(":");


    if(partes.length < 2){

        return hora;

    }


    const fecha =
    new Date();


    fecha.setHours(
        Number(partes[0]),
        Number(partes[1]),
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



export function convertirHoraAMinutos(
    hora
){

    if(!hora){

        return 0;

    }


    const [
        horas,
        minutos
    ] =
    String(hora)
    .split(":")
    .map(Number);


    return (
        horas * 60
        +
        minutos
    );

}



export function obtenerFechaActual(){

    return formatearFechaISO(
        new Date()
    );

}



export function formatearFechaISO(
    fecha
){

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



export function convertirFechaISO(
    fechaISO
){

    if(!fechaISO){

        return null;

    }


    const [
        año,
        mes,
        dia
    ] =
    fechaISO
    .split("-")
    .map(Number);


    return new Date(
        año,
        mes - 1,
        dia
    );

}



export function formatearFechaVisible(
    fechaISO
){

    const fecha =
    convertirFechaISO(
        fechaISO
    );


    if(!fecha){

        return "Sin fecha";

    }


    return fecha.toLocaleDateString(
        "es-PE",
        {
            day:"2-digit",
            month:"long",
            year:"numeric"
        }
    );

}



export function obtenerUltimoDiaMes(
    año,
    mes
){

    return new Date(
        año,
        mes + 1,
        0
    )
    .getDate();

}



export function escaparHTML(
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



export function asignarTexto(
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



export function obtenerDatosEntrada(
    horario
){

    return {

        permitirDesde:
        horario.entrada
        ?.permitirDesde
        ??
        horario.permitirEntradaDesde
        ??
        "",

        programada:
        horario.entrada
        ?.programada
        ??
        horario.horaEntrada
        ??
        "",

        permitirHasta:
        horario.entrada
        ?.permitirHasta
        ??
        "",

        toleranciaMinutos:
        horario.entrada
        ?.toleranciaMinutos
        ??
        0

    };

}



export function obtenerDatosSalida(
    horario
){

    return {

        permitirDesde:
        horario.salida
        ?.permitirDesde
        ??
        "",

        programada:
        horario.salida
        ?.programada
        ??
        horario.horaSalida
        ??
        "",

        permitirHasta:
        horario.salida
        ?.permitirHasta
        ??
        "",

        horasExtraDesde:
        horario.salida
        ?.horasExtraDesde
        ??
        horario.horasExtraDesde
        ??
        ""

    };

}
