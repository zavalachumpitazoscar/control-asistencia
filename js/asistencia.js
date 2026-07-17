import {
    iniciarNavegacionAsistencia
}
from "./navegacion-asistencia.js";


import {
    iniciarFechaAsistencia
}
from "./fecha-asistencia.js";


import {
    iniciarImportacionMarcaciones
}
from "./importacion-marcaciones.js";



/*=====================================================
INICIAR MÓDULO DE ASISTENCIA
=====================================================*/

export async function iniciarAsistencia(){

    console.log(
        "✅ INICIANDO MÓDULO DE ASISTENCIA"
    );


    iniciarNavegacionAsistencia();

    iniciarFechaAsistencia();

    iniciarImportacionMarcaciones();

}
