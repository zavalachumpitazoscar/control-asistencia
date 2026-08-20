import {
    normalizarTexto,
    normalizarDNI,
    normalizarDNIParaComparacion,
    validarDNI,
    interpretarMarcacion,
    formatearFechaHora,
    convertirFechaAISO,
    convertirFechaHoraAISO
}
from "./utilidades-asistencia.js?v=20260817-4";


import {
    guardarMarcacionesImportadas,
    obtenerCoincidenciasDNIImportacion
}
from "./guardar-marcaciones.js?v=20260817-5";



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
    "NUMERO DE DOCUMENTO",
    "NRO DOCUMENTO",
    "NRO DE DOCUMENTO",
    "CODIGO EMPLEADO",
    "ID EMPLEADO",
    "USER ID"
];


const COLUMNAS_MARCACION = [
    "MARCACION",
    "MARCACIONES",
    "FECHA HORA",
    "FECHA Y HORA",
    "FECHA/HORA",
    "FECHA DE MARCACION",
    "FECHA Y HORA DE MARCACION",
    "CHECKTIME",
    "REGISTRO"
];

const COLUMNAS_FECHA = ["FECHA","FECHA MARCACION","FECHA DE MARCACION","DIA"];
const COLUMNAS_HORA = ["HORA","HORA MARCACION","HORA DE MARCACION","CHECK TIME"];



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

    document.getElementById("btnDescargarPlantillaMarcaciones")
        ?.addEventListener("click",descargarPlantillaMarcaciones);


    btnImportarMarcaciones.addEventListener(
        "click",
        ()=>{

            inputImportarMarcaciones.value =
                "";

            inputImportarMarcaciones.click();

        }
    );

}

async function descargarPlantillaMarcaciones(){
    try{
        mostrarCargando("Preparando archivo de ejemplo...");
        const XLSX=await cargarSheetJS();
        const filas=[
            {DNI:"01234567",MARCACION:"20/08/2026 08:00:00"},
            {DNI:"01234567",MARCACION:"20/08/2026 13:00:00"},
            {DNI:"01234567",MARCACION:"20/08/2026 14:00:00"},
            {DNI:"01234567",MARCACION:"20/08/2026 18:00:00"},
            {DNI:"87654321",MARCACION:"20/08/2026 07:55:00"},
            {DNI:"87654321",MARCACION:"20/08/2026 17:45:00"}
        ];
        const hoja=XLSX.utils.json_to_sheet(filas,{header:["DNI","MARCACION"]});
        hoja["!cols"]=[{wch:16},{wch:27}];
        const libro=XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro,hoja,"Marcaciones");
        XLSX.writeFile(libro,"plantilla-importacion-marcaciones.xlsx");
        cerrarAlerta();
    }catch(error){mostrarError(error.message||"No se pudo crear la plantilla.");}
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

        await asociarCoincidenciasDNIConColaboradores(resultado);


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


            let valorMarcacion =
                encontrarValorColumna(
                    filaNormalizada,
                    COLUMNAS_MARCACION
                );

            if(valorMarcacion === "" || valorMarcacion === undefined || valorMarcacion === null){
                valorMarcacion=combinarFechaHoraSeparadas(
                    encontrarValorColumna(filaNormalizada,COLUMNAS_FECHA),
                    encontrarValorColumna(filaNormalizada,COLUMNAS_HORA)
                );
            }


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
            else if(!/^\d{1,8}$/.test(dni)){

                errores.push(
                    "El DNI debe contener entre 1 y 8 dígitos"
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
                `${normalizarDNIParaComparacion(dni)}_${fechaHoraISO}`;


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

function combinarFechaHoraSeparadas(fecha,hora){
    if(fecha === "" || fecha === undefined || fecha === null || hora === "" || hora === undefined || hora === null)return "";
    if(typeof fecha === "number"){
        const fraccion=typeof hora === "number" ? hora-Math.floor(hora) : fraccionHoraTexto(hora);
        if(fraccion !== null)return Math.floor(fecha)+fraccion;
    }
    const fechaTexto=fecha instanceof Date
        ? `${String(fecha.getDate()).padStart(2,"0")}/${String(fecha.getMonth()+1).padStart(2,"0")}/${fecha.getFullYear()}`
        : String(fecha).trim();
    const horaTexto=hora instanceof Date
        ? `${String(hora.getHours()).padStart(2,"0")}:${String(hora.getMinutes()).padStart(2,"0")}:${String(hora.getSeconds()).padStart(2,"0")}`
        : typeof hora === "number"
            ? horaDesdeFraccion(hora-Math.floor(hora))
            : String(hora).trim();
    return `${fechaTexto} ${horaTexto}`;
}

function fraccionHoraTexto(valor){const m=String(valor||"").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!m)return null;return (Number(m[1])*3600+Number(m[2])*60+Number(m[3]||0))/86400;}
function horaDesdeFraccion(fraccion){const segundos=Math.round(fraccion*86400)%86400,h=Math.floor(segundos/3600),m=Math.floor((segundos%3600)/60),s=segundos%60;return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}


async function asociarCoincidenciasDNIConColaboradores(resultado){

    const coincidencias =
        await obtenerCoincidenciasDNIImportacion(
            resultado.validas.map(marcacion=>marcacion.dni)
        );

    resultado.validas.forEach((marcacion, indice)=>{
        const coincidencia = coincidencias[indice];
        if(coincidencia?.sinCerosIniciales){
            marcacion.coincidenciaDni = coincidencia;
            marcacion.estadoValidacion = "RECONOCIDA_SIN_CEROS";
        }
    });

    const unicas = new Map();

    coincidencias.filter(item=>item?.sinCerosIniciales).forEach(item=>{
        unicas.set(`${item.dniReloj}_${item.dniColaborador}`, item);
    });

    resultado.coincidenciasDniSinCeros = [...unicas.values()];

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
                        ${escaparHTML(marcacion.dni)}
                        ${marcacion.coincidenciaDni ? `<small class="importacion-dni-asociado">DNI registrado: ${escaparHTML(marcacion.coincidenciaDni.dniColaborador)}</small>` : ""}
                    </td>

                    <td>
                        ${escaparHTML(
                            marcacion.fechaHoraTexto
                        )}
                    </td>

                    <td>
                        <span class="importacion-estado ${marcacion.coincidenciaDni ? "advertencia" : "valida"}">
                            ${marcacion.coincidenciaDni ? "Reconocida sin ceros" : "Válida"}
                        </span>
                    </td>

                </tr>
            `
        )
        .join("");

    const htmlInvalidas = resultado.invalidas
        .slice(0,10)
        .map(item=>`<tr><td>${item.fila}</td><td>${escaparHTML(item.dni||"—")}</td><td>${escaparHTML(item.marcacion||"—")}</td><td><span class="importacion-estado error">${escaparHTML(item.errores.join(" · "))}</span></td></tr>`)
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
                            DNI recuperados
                        </span>

                        <strong>
                            ${resultado.coincidenciasDniSinCeros?.length || 0}
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

                ${resultado.coincidenciasDniSinCeros?.length ? `
                    <div class="importacion-advertencia-dni">
                        <i class="bi bi-exclamation-triangle"></i>
                        <div>
                            <strong>Se reconocieron DNI sin ceros iniciales</strong>
                            <p>El sistema conservará el DNI registrado del colaborador y asociará estas marcaciones:</p>
                            <ul>${resultado.coincidenciasDniSinCeros.map(item=>`<li><b>${escaparHTML(item.dniReloj)}</b> → <b>${escaparHTML(item.dniColaborador)}</b> · ${escaparHTML(item.colaboradorNombre)}</li>`).join("")}</ul>
                        </div>
                    </div>` : ""}

                ${resultado.invalidas.length ? `
                    <details class="importacion-errores-detalle" ${resultado.validas.length===0?"open":""}>
                        <summary>Ver por qué se rechazaron ${resultado.invalidas.length} fila(s)</summary>
                        <div class="importacion-vista-previa"><table><thead><tr><th>Fila</th><th>DNI</th><th>Valor encontrado</th><th>Motivo</th></tr></thead><tbody>${htmlInvalidas}</tbody></table></div>
                        ${resultado.invalidas.length>10?`<p class="importacion-mas-registros">Se muestran los primeros 10 errores.</p>`:""}
                    </details>` : ""}


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
        resultado.cantidadCoincidenciasDniSinCeros > 0 ||
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

    const coincidenciasSinCeros = [...new Map(
        resultado.coincidenciasDniSinCeros.map(item=>[
            `${item.dniReloj}_${item.dniColaborador}`,
            item
        ])
    ).values()];


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

                        <span>DNI recuperados</span>

                        <strong>${coincidenciasSinCeros.length}</strong>

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

                ${coincidenciasSinCeros.length ? `
                    <div class="resultado-importacion-detalle">
                        <h4>DNI asociados sin ceros iniciales</h4>
                        <ul>${coincidenciasSinCeros.map(item=>`<li><strong>${escaparHTML(item.colaboradorNombre)}</strong><span>${escaparHTML(item.dniReloj)} → ${escaparHTML(item.dniColaborador)}</span></li>`).join("")}</ul>
                    </div>` : ""}


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
