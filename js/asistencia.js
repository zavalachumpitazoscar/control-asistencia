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
    iniciarResumenAsistencia
}
from "./asistencia/resumen-asistencia.js";

import {
    iniciarEditarDiaAsistencia
}
from "./asistencia/editar-dia-asistencia.js";

import {
    iniciarMarcacionManualAsistencia
}
from "./asistencia/marcacion-manual-asistencia.js";

/*=====================================================
INICIAR MÓDULO DE ASISTENCIA
=====================================================*/

export async function iniciarAsistencia(){

    console.log(
        "✅ INICIANDO MÓDULO DE ASISTENCIA"
    );


    iniciarNavegacionAsistencia();

    iniciarResumenAsistencia();

    iniciarEditarDiaAsistencia();

    iniciarFechaAsistencia();

    iniciarImportacionMarcaciones();
}
