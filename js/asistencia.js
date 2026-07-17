import {
    iniciarNavegacionAsistencia
}
from "./asistencia/navegacion-asistencia.js";


import {
    iniciarFechaAsistencia
}
from "./asistencia/fecha-asistencia.js";


import {
    iniciarImportacionMarcaciones
}
from "./asistencia/importacion-marcaciones.js";

import {
    guardarMarcacionesImportadas
}
from "./asistencia/guardar-marcaciones.js";

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

    guardarMarcacionesImportadas();

}
