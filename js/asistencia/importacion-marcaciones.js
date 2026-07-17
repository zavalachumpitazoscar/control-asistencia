import {
    normalizarTexto,
    normalizarDNI,
    validarDNI,
    interpretarMarcacion,
    formatearFechaHora,
    convertirFechaAISO,
    convertirFechaHoraAISO
}
from "./utilidades-asistencia.js";

import {
    guardarMarcacionesImportadas
}
from "./guardar-marcaciones.js";

/*=====================================================
CONFIGURACIÓN
=====================================================*/

const EXTENSIONES_PERMITIDAS = [
    "xlsx",
    "xls",
    "csv"
];


const COLUMNAS_DNI = [
    "DNI",
    "DOCUMENTO",
    "NUMERO DOCUMENTO",
    "NUMERO DE DOCUMENTO"
];


const COLUMNAS_MARCACION = [
    "MARCACION",
    "MARCACIONES",
    "FECHA HORA",
    "FECHA Y HORA"
];



/*=====================================================
VARIABLES
=====================================================*/

let btnImportarMarcaciones;

let inputImportarMarcaciones;

let marcacionesProcesadas = [];



/*=====================================================
INICIAR IMPORTACIÓN
=====================================================*/

export function iniciarImportacionMarcaciones(){

    btnImportarMarcaciones =
        document.getElementById(
            "btnImportarMarcaciones"
        );


    if(!btnImportarMarcaciones){

        console.warn(
            "No se encontró btnImportarMarcaciones."
        );

        return;

    }


    crearInputArchivo();


    btnImportarMarcaciones.addEventListener(
        "click",
        ()=>{

            inputImportarMarcaciones.value =
                "";

            inputImportarMarcaciones.click();

        }
    );

}



/*=====================================================
CREAR INPUT DE ARCHIVO
=====================================================*/

function crearInputArchivo(){

    inputImportarMarcaciones =
        document.createElement(
            "input"
        );


    inputImportarMarcaciones.type =
        "file";

    inputImportarMarcaciones.accept =
        ".xlsx,.xls,.csv";

    inputImportarMarcaciones.hidden =
        true;


    document.body.appendChild(
        inputImportarMarcaciones
    );


    inputImportarMarcaciones.addEventListener(
        "change",
        procesarArchivoSeleccionado
    );

}



/*=====================================================
PROCESAR ARCHIVO
=====================================================*/

async function procesarArchivoSeleccionado(){

    const archivo =
        inputImportarMarcaciones.files?.[0];


    if(!archivo){

        return;

    }


    const extension =
        archivo.name
        .split(".")
        .pop()
        .toLowerCase();


    if(
        !EXTENSIONES_PERMITIDAS.includes(
            extension
        )
    ){

        mostrarError(
            "El archivo debe ser XLSX, XLS o CSV."
        );

        return;

    }


    mostrarCargando(
        "Procesando archivo de marcaciones..."
    );


    try{

        const filas =
            await leerArchivoMarcaciones(
                archivo
            );


        if(filas.length === 0){

            mostrarError(
                "El archivo no contiene registros."
            );

            return;

        }


        const resultado =
            validarFilasMarcaciones(
                filas
            );


        marcacionesProcesadas =
            resultado.validas;


        mostrarVistaPreviaImportacion(
            resultado,
            archivo.name
        );

    }
    catch(error){

        console.error(
            "Error al importar marcaciones:",
            error
        );


        mostrarError(
            error.message ||
            "No se pudo procesar el archivo."
        );

    }

}



/*=====================================================
LEER EXCEL O CSV
=====================================================*/

async function leerArchivoMarcaciones(
    archivo
){

    const XLSX =
        await cargarSheetJS();


    const contenido =
        await archivo.arrayBuffer();


    const libro =
        XLSX.read(
            contenido,
            {
                type:"array",
                cellDates:true,
                raw:true
            }
        );


    if(libro.SheetNames.length === 0){

        throw new Error(
            "El archivo no contiene hojas."
        );

    }


    const primeraHoja =
        libro.Sheets[
            libro.SheetNames[0]
        ];


    return XLSX.utils.sheet_to_json(
        primeraHoja,
        {
            defval:"",
            raw:true
        }
    );

}



/*=====================================================
CARGAR SHEETJS
=====================================================*/

async function cargarSheetJS(){

    try{

        return await import(
            "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"
        );

    }
    catch(error){

        console.error(
            "No se pudo cargar SheetJS:",
            error
        );


        throw new Error(
            "No se pudo cargar el lector de archivos Excel."
        );

    }

}



/*=====================================================
VALIDAR FILAS
=====================================================*/

function validarFilasMarcaciones(
    filas
){

    const validas = [];

    const invalidas = [];

    const duplicadas = [];

    const clavesEncontradas =
        new Set();


    filas.forEach(
        (
            fila,
            indice
        )=>{

            const numeroFila =
                indice + 2;


            const filaNormalizada =
                normalizarFila(
                    fila
                );


            const valorDNI =
                encontrarValorColumna(
                    filaNormalizada,
                    COLUMNAS_DNI
                );


            const valorMarcacion =
                encontrarValorColumna(
                    filaNormalizada,
                    COLUMNAS_MARCACION
                );


            const dni =
                normalizarDNI(
                    valorDNI
                );


            const fechaHora =
                interpretarMarcacion(
                    valorMarcacion
                );


            const errores = [];


            if(!dni){

                errores.push(
                    "DNI vacío"
                );

            }
            else if(!validarDNI(dni)){

                errores.push(
                    "El DNI debe contener 8 dígitos"
                );

            }


            if(!valorMarcacion){

                errores.push(
                    "Marcación vacía"
                );

            }
            else if(!fechaHora){

                errores.push(
                    "Formato de fecha y hora inválido"
                );

            }


            if(errores.length > 0){

                invalidas.push({

                    fila:numeroFila,

                    dni,

                    marcacion:
                        String(
                            valorMarcacion ?? ""
                        ),

                    errores

                });


                return;

            }


            const fechaHoraISO =
                convertirFechaHoraAISO(
                    fechaHora
                );


            const clave =
                `${dni}_${fechaHoraISO}`;


            if(
                clavesEncontradas.has(
                    clave
                )
            ){

                duplicadas.push({

                    fila:numeroFila,

                    dni,

                    fechaHora,

                    fechaHoraTexto:
                        formatearFechaHora(
                            fechaHora
                        ),

                    motivo:
                        "Marcación repetida dentro del archivo"

                });


                return;

            }


            clavesEncontradas.add(
                clave
            );


            validas.push({

                fila:numeroFila,

                dni,

                fecha:
                    convertirFechaAISO(
                        fechaHora
                    ),

                fechaHora,

                fechaHoraISO,

                fechaHoraTexto:
                    formatearFechaHora(
                        fechaHora
                    ),

                estadoValidacion:
                    "VALIDA"

            });

        }
    );


    return {

        total:filas.length,

        validas,

        invalidas,

        duplicadas

    };

}



/*=====================================================
NORMALIZAR FILA
=====================================================*/

function normalizarFila(
    fila
){

    const resultado = {};


    Object.entries(
        fila
    )
    .forEach(
        ([
            columna,
            valor
        ])=>{

            resultado[
                normalizarTexto(
                    columna
                )
            ] = valor;

        }
    );


    return resultado;

}



/*=====================================================
ENCONTRAR COLUMNA
=====================================================*/

function encontrarValorColumna(
    fila,
    nombresPermitidos
){

    for(
        const nombre of
        nombresPermitidos
    ){

        if(
            Object.prototype
            .hasOwnProperty.call(
                fila,
                nombre
            )
        ){

            return fila[nombre];

        }

    }


    return "";

}



/*=====================================================
MOSTRAR VISTA PREVIA
=====================================================*/

function mostrarVistaPreviaImportacion(
    resultado,
    nombreArchivo
){

    cerrarAlerta();


    const htmlFilas =
        resultado.validas
        .slice(
            0,
            10
        )
        .map(
            marcacion=>
            `
                <tr>

                    <td>
                        ${marcacion.fila}
                    </td>

                    <td>
                        ${escaparHTML(
                            marcacion.dni
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            marcacion.fechaHoraTexto
                        )}
                    </td>

                    <td>
                        <span class="importacion-estado valida">
                            Válida
                        </span>
                    </td>

                </tr>
            `
        )
        .join("");


    Swal.fire({

        title:"Importar marcaciones",

        width:850,

        showCancelButton:true,

        confirmButtonText:
            `Importar ${resultado.validas.length} marcaciones`,

        cancelButtonText:
            "Cancelar",

        confirmButtonColor:
            "#2563eb",

        showConfirmButton:
            resultado.validas.length > 0,

        html:
        `
            <div class="importacion-marcaciones-resumen">

                <div class="importacion-archivo">

                    <i class="bi bi-file-earmark-spreadsheet"></i>

                    <div>

                        <strong>
                            ${escaparHTML(
                                nombreArchivo
                            )}
                        </strong>

                        <span>
                            ${resultado.total} filas encontradas
                        </span>

                    </div>

                </div>


                <div class="importacion-indicadores">

                    <div class="importacion-indicador correcta">

                        <span>
                            Válidas
                        </span>

                        <strong>
                            ${resultado.validas.length}
                        </strong>

                    </div>


                    <div class="importacion-indicador advertencia">

                        <span>
                            Duplicadas
                        </span>

                        <strong>
                            ${resultado.duplicadas.length}
                        </strong>

                    </div>


                    <div class="importacion-indicador error">

                        <span>
                            Inválidas
                        </span>

                        <strong>
                            ${resultado.invalidas.length}
                        </strong>

                    </div>

                </div>


                <div class="importacion-vista-previa">

                    <table>

                        <thead>

                            <tr>

                                <th>Fila</th>

                                <th>DNI</th>

                                <th>Marcación</th>

                                <th>Estado</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${
                                htmlFilas ||
                                `
                                    <tr>

                                        <td colspan="4">

                                            No existen filas válidas para importar.

                                        </td>

                                    </tr>
                                `
                            }

                        </tbody>

                    </table>

                </div>


                ${
                    resultado.validas.length > 10
                    ?
                    `
                        <p class="importacion-mas-registros">

                            Se muestran las primeras 10 marcaciones válidas.

                        </p>
                    `
                    :
                    ""
                }

            </div>
        `

    })
    .then(resultadoSwal=>{

        if(!resultadoSwal.isConfirmed){

            return;

        }


        confirmarImportacionMarcaciones();

    });

}



/*=====================================================
CONFIRMAR Y GUARDAR IMPORTACIÓN
=====================================================*/

async function confirmarImportacionMarcaciones(){

    if(
        marcacionesProcesadas.length === 0
    ){

        mostrarError(
            "No existen marcaciones válidas para guardar."
        );

        return;

    }


    mostrarCargando(
        "Guardando marcaciones..."
    );


    try{

        const resultado =
            await guardarMarcacionesImportadas(
                marcacionesProcesadas
            );


        mostrarResultadoGuardado(
            resultado
        );

    }
    catch(error){

        console.error(
            "Error guardando marcaciones:",
            error
        );


        mostrarError(
            error.message ||
            "No se pudieron guardar las marcaciones."
        );

    }

}


/*=====================================================
MOSTRAR RESULTADO DEL GUARDADO
=====================================================*/

function mostrarResultadoGuardado(
    resultado
){

    const existenObservaciones =
        resultado.cantidadDuplicadas > 0 ||
        resultado.cantidadDniNoEncontrados > 0 ||
        resultado.cantidadInactivos > 0 ||
        resultado.cantidadErrores > 0;


    const icono =
        resultado.cantidadGuardadas === 0
            ? "warning"
            : existenObservaciones
                ? "info"
                : "success";


    const titulo =
        resultado.cantidadGuardadas === 0
            ? "No se guardaron marcaciones"
            : "Importación completada";


    const filasNoEncontradas =
        resultado.dniNoEncontrados
        .slice(
            0,
            8
        )
        .map(
            registro=>
            `
                <li>
                    <strong>
                        DNI ${escaparHTML(registro.dni)}
                    </strong>

                    <span>
                        ${escaparHTML(registro.fechaHoraTexto)}
                    </span>
                </li>
            `
        )
        .join("");


    const filasInactivas =
        resultado.colaboradoresInactivos
        .slice(
            0,
            8
        )
        .map(
            registro=>
            `
                <li>
                    <strong>
                        ${escaparHTML(registro.colaboradorNombre)}
                    </strong>

                    <span>
                        DNI ${escaparHTML(registro.dni)}
                    </span>
                </li>
            `
        )
        .join("");


    Swal.fire({

        icon:icono,

        title:titulo,

        width:720,

        confirmButtonText:"Aceptar",

        confirmButtonColor:"#2563eb",

        html:
        `
            <div class="resultado-importacion-marcaciones">

                <div class="resultado-importacion-grid">

                    <div class="resultado-importacion-card guardadas">

                        <span>
                            Guardadas
                        </span>

                        <strong>
                            ${resultado.cantidadGuardadas}
                        </strong>

                    </div>


                    <div class="resultado-importacion-card duplicadas">

                        <span>
                            Ya existentes
                        </span>

                        <strong>
                            ${resultado.cantidadDuplicadas}
                        </strong>

                    </div>


                    <div class="resultado-importacion-card no-encontradas">

                        <span>
                            DNI no encontrados
                        </span>

                        <strong>
                            ${resultado.cantidadDniNoEncontrados}
                        </strong>

                    </div>


                    <div class="resultado-importacion-card inactivas">

                        <span>
                            Colaboradores inactivos
                        </span>

                        <strong>
                            ${resultado.cantidadInactivos}
                        </strong>

                    </div>


                    <div class="resultado-importacion-card errores">

                        <span>
                            Errores
                        </span>

                        <strong>
                            ${resultado.cantidadErrores}
                        </strong>

                    </div>

                </div>


                ${
                    resultado.cantidadDniNoEncontrados > 0
                    ?
                    `
                        <div class="resultado-importacion-detalle">

                            <h4>
                                DNI no encontrados
                            </h4>

                            <ul>
                                ${filasNoEncontradas}
                            </ul>

                            ${
                                resultado.cantidadDniNoEncontrados > 8
                                ?
                                `
                                    <small>
                                        Y ${
                                            resultado.cantidadDniNoEncontrados - 8
                                        } registros adicionales.
                                    </small>
                                `
                                :
                                ""
                            }

                        </div>
                    `
                    :
                    ""
                }


                ${
                    resultado.cantidadInactivos > 0
                    ?
                    `
                        <div class="resultado-importacion-detalle">

                            <h4>
                                Colaboradores inactivos
                            </h4>

                            <ul>
                                ${filasInactivas}
                            </ul>

                        </div>
                    `
                    :
                    ""
                }

            </div>
        `

    })
    .then(()=>{

        /*
            Avisamos al resto del módulo que
            existen nuevas marcaciones.
        */

        document.dispatchEvent(
            new CustomEvent(
                "asistencia:marcaciones-importadas",
                {
                    detail:resultado
                }
            )
        );

    });

}



/*=====================================================
ALERTAS
=====================================================*/

function mostrarCargando(
    mensaje
){

    Swal.fire({

        title:mensaje,

        allowOutsideClick:false,

        allowEscapeKey:false,

        didOpen:()=>{

            Swal.showLoading();

        }

    });

}



function mostrarError(
    mensaje
){

    Swal.fire({

        icon:"error",

        title:"No se pudo importar",

        text:mensaje,

        confirmButtonColor:
            "#2563eb"

    });

}



function cerrarAlerta(){

    if(
        typeof Swal !==
        "undefined"
    ){

        Swal.close();

    }

}



/*=====================================================
ESCAPAR HTML
=====================================================*/

function escaparHTML(
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
