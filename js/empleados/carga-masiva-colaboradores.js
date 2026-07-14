import * as XLSX
from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";


export function iniciarCargaMasivaColaboradores({

    empresaId,

    botonCargaMasiva

}){

    if(!empresaId){

        console.error(
            "No se recibió empresaId para la carga masiva."
        );

        return;

    }


    if(!botonCargaMasiva){

        console.error(
            "No se encontró el botón de carga masiva."
        );

        return;

    }


    botonCargaMasiva.onclick = ()=>{

        mostrarVentanaCargaMasiva(
            empresaId
        );

    };

}


/*=====================================================
    VENTANA PRINCIPAL
=====================================================*/

function mostrarVentanaCargaMasiva(
    empresaId
){

    Swal.fire({

        title:
        "Carga masiva de colaboradores",

        html:`

            <div class="carga-masiva-contenido">

                <div class="carga-masiva-icono">

                    <i class="bi bi-file-earmark-excel"></i>

                </div>


                <p class="carga-masiva-descripcion">

                    Descarga la plantilla, completa los datos
                    de los colaboradores y luego selecciona
                    el archivo para importarlo.

                </p>


                <div class="carga-masiva-pasos">

                    <div class="carga-paso">

                        <span>1</span>

                        <div>

                            <strong>
                                Descargar plantilla
                            </strong>

                            <p>
                                Utiliza el formato establecido
                                para evitar errores.
                            </p>

                        </div>

                    </div>


                    <div class="carga-paso">

                        <span>2</span>

                        <div>

                            <strong>
                                Completar información
                            </strong>

                            <p>
                                Cada fila representa un colaborador.
                            </p>

                        </div>

                    </div>


                    <div class="carga-paso">

                        <span>3</span>

                        <div>

                            <strong>
                                Seleccionar archivo
                            </strong>

                            <p>
                                Se aceptan archivos Excel .xlsx.
                            </p>

                        </div>

                    </div>

                </div>


                <button
                type="button"
                id="btnDescargarPlantillaColaboradores"
                class="btn-carga-excel btn-descargar-excel">

                    <i class="bi bi-download"></i>

                    Descargar plantilla Excel

                </button>


                <button
                type="button"
                id="btnSeleccionarExcelColaboradores"
                class="btn-carga-excel btn-seleccionar-excel">

                    <i class="bi bi-upload"></i>

                    Seleccionar archivo Excel

                </button>


                <input
                type="file"
                id="archivoExcelColaboradores"
                accept=".xlsx"
                hidden>


                <div
                id="resultadoArchivoExcel"
                class="resultado-archivo-excel">

                </div>


                <p class="empresa-carga-masiva">

                    Empresa vinculada:

                    <strong>
                        ${empresaId}
                    </strong>

                </p>

            </div>

        `,

        width:620,

        showConfirmButton:false,

        showCloseButton:true,

        didOpen:()=>{

            configurarVentanaCargaMasiva();

        }

    });

}


/*=====================================================
    CONFIGURAR BOTONES
=====================================================*/

function configurarVentanaCargaMasiva(){

    const btnDescargar =
    document.getElementById(
        "btnDescargarPlantillaColaboradores"
    );


    const btnSeleccionar =
    document.getElementById(
        "btnSeleccionarExcelColaboradores"
    );


    const inputArchivo =
    document.getElementById(
        "archivoExcelColaboradores"
    );


    if(btnDescargar){

        btnDescargar.onclick = ()=>{

            descargarPlantillaColaboradores();

        };

    }


    if(btnSeleccionar && inputArchivo){

        btnSeleccionar.onclick = ()=>{

            inputArchivo.click();

        };


        inputArchivo.onchange = async()=>{

            const archivo =
            inputArchivo.files?.[0];


            if(!archivo){

                return;

            }


            await leerArchivoExcel(
                archivo
            );

        };

    }

}


/*=====================================================
    DESCARGAR PLANTILLA
=====================================================*/

function descargarPlantillaColaboradores(){

    try{

        const encabezados = [

            "TIPO_DOCUMENTO",
            "NUMERO_DOCUMENTO",
            "NOMBRES",
            "APELLIDOS",
            "FECHA_NACIMIENTO",
            "GENERO",
            "CORREO",
            "TELEFONO",
            "DIRECCION",
            "SUCURSAL",
            "AREA",
            "SUBAREA",
            "CARGO_PROFESION",
            "INICIO_CONTRATO",
            "TERMINO_CONTRATO",
            "NACIONALIDAD",
            "PAIS_NACIONALIDAD",
            "COMENTARIOS"

        ];


        const ejemplo = [

            "DNI",
            "12345678",
            "Juan Carlos",
            "Pérez López",
            "1995-05-20",
            "MASCULINO",
            "juan@empresa.com",
            "987654321",
            "Av. Principal 123",
            "Sede principal",
            "Sistemas",
            "Desarrollo",
            "Analista de sistemas",
            "2026-01-10",
            "",
            "Peruana",
            "PERU",
            "Registro de ejemplo"

        ];


        const datos = [

            encabezados,

            ejemplo

        ];


        const hoja =
        XLSX.utils.aoa_to_sheet(
            datos
        );


        hoja["!cols"] = [

            {wch:20},
            {wch:20},
            {wch:25},
            {wch:25},
            {wch:20},
            {wch:18},
            {wch:30},
            {wch:18},
            {wch:35},
            {wch:25},
            {wch:25},
            {wch:25},
            {wch:30},
            {wch:20},
            {wch:20},
            {wch:20},
            {wch:22},
            {wch:40}

        ];


        const libro =
        XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(

            libro,

            hoja,

            "Colaboradores"

        );


        XLSX.writeFile(

            libro,

            "Plantilla_Carga_Masiva_Colaboradores.xlsx",

            {
                compression:true
            }

        );

    }
    catch(error){

        console.error(
            "Error al generar plantilla:",
            error
        );


        Swal.fire({

            icon:"error",

            title:"No se pudo generar",

            text:
            "Ocurrió un error al crear la plantilla Excel."

        });

    }

}


/*=====================================================
    LEER ARCHIVO EXCEL
=====================================================*/

async function leerArchivoExcel(
    archivo
){

    const resultado =
    document.getElementById(
        "resultadoArchivoExcel"
    );


    if(
        !archivo.name
        .toLowerCase()
        .endsWith(".xlsx")
    ){

        mostrarErrorArchivo(

            resultado,

            "Selecciona un archivo con extensión .xlsx."

        );

        return;

    }


    try{

        if(resultado){

            resultado.innerHTML = `

                <div class="archivo-cargando">

                    <span class="spinner-archivo"></span>

                    Validando archivo...

                </div>

            `;

        }


        const datosBinarios =
        await archivo.arrayBuffer();


        const libro =
        XLSX.read(
            datosBinarios,
            {
                type:"array"
            }
        );


        const nombrePrimeraHoja =
        libro.SheetNames[0];


        if(!nombrePrimeraHoja){

            mostrarErrorArchivo(

                resultado,

                "El archivo Excel no contiene hojas."

            );

            return;

        }


        const hoja =
        libro.Sheets[
            nombrePrimeraHoja
        ];


        const filas =
        XLSX.utils.sheet_to_json(

            hoja,

            {
                defval:"",
                raw:false
            }

        );


        if(filas.length === 0){

            mostrarErrorArchivo(

                resultado,

                "El archivo no contiene colaboradores."

            );

            return;

        }


        const columnasValidas =
        validarColumnasExcel(
            filas
        );


        if(!columnasValidas.valido){

            mostrarErrorArchivo(

                resultado,

                `Faltan las siguientes columnas: ${
                    columnasValidas.faltantes.join(", ")
                }`

            );

            return;

        }


        const filasRevisadas =
        filas.map(
            (
                fila,
                indice
            )=>
            validarFilaColaborador(
                fila,
                indice + 2
            )
        );


        mostrarVistaPreviaExcel(

            archivo,

            filasRevisadas

        );

    }
    catch(error){

        console.error(
            "Error al leer archivo Excel:",
            error
        );


        mostrarErrorArchivo(

            resultado,

            "No se pudo leer el archivo. Verifica que sea un Excel válido."

        );

    }

}



function validarColumnasExcel(
    filas
){

    const columnasObligatorias = [

        "TIPO_DOCUMENTO",
        "NUMERO_DOCUMENTO",
        "NOMBRES",
        "APELLIDOS",
        "FECHA_NACIMIENTO",
        "GENERO",
        "CORREO",
        "TELEFONO",
        "DIRECCION",
        "SUCURSAL",
        "AREA",
        "SUBAREA",
        "CARGO_PROFESION",
        "INICIO_CONTRATO",
        "TERMINO_CONTRATO",
        "NACIONALIDAD",
        "PAIS_NACIONALIDAD",
        "COMENTARIOS"

    ];


    const primeraFila =
    filas[0] || {};


    const columnasArchivo =
    Object.keys(
        primeraFila
    )
    .map(columna=>
        columna
        .trim()
        .toUpperCase()
    );


    const faltantes =
    columnasObligatorias.filter(
        columna=>
        !columnasArchivo.includes(
            columna
        )
    );


    return {

        valido:
        faltantes.length === 0,

        faltantes

    };

}


function validarFilaColaborador(
    fila,
    numeroFila
){

    const errores = [];


    const tipoDocumento =
    String(
        fila.TIPO_DOCUMENTO || ""
    )
    .trim()
    .toUpperCase();


    const numeroDocumento =
    String(
        fila.NUMERO_DOCUMENTO || ""
    )
    .trim()
    .toUpperCase();


    const nombres =
    String(
        fila.NOMBRES || ""
    )
    .trim();


    const apellidos =
    String(
        fila.APELLIDOS || ""
    )
    .trim();


    const fechaNacimiento =
    String(
        fila.FECHA_NACIMIENTO || ""
    )
    .trim();


    const genero =
    String(
        fila.GENERO || ""
    )
    .trim()
    .toUpperCase();


    const correo =
    String(
        fila.CORREO || ""
    )
    .trim()
    .toLowerCase();


    const telefono =
    String(
        fila.TELEFONO || ""
    )
    .trim();


    const direccion =
    String(
        fila.DIRECCION || ""
    )
    .trim();


    const sucursal =
    String(
        fila.SUCURSAL || ""
    )
    .trim();


    const area =
    String(
        fila.AREA || ""
    )
    .trim();


    const subarea =
    String(
        fila.SUBAREA || ""
    )
    .trim();


    const cargoProfesion =
    String(
        fila.CARGO_PROFESION || ""
    )
    .trim();


    const inicioContrato =
    String(
        fila.INICIO_CONTRATO || ""
    )
    .trim();


    const terminoContrato =
    String(
        fila.TERMINO_CONTRATO || ""
    )
    .trim();


    const nacionalidad =
    String(
        fila.NACIONALIDAD || ""
    )
    .trim();


    const paisNacionalidad =
    String(
        fila.PAIS_NACIONALIDAD || ""
    )
    .trim()
    .toUpperCase();


    const comentarios =
    String(
        fila.COMENTARIOS || ""
    )
    .trim();


    // Campos obligatorios

    if(!tipoDocumento){

        errores.push(
            "Falta el tipo de documento"
        );

    }


    if(!numeroDocumento){

        errores.push(
            "Falta el número de documento"
        );

    }


    if(!nombres){

        errores.push(
            "Faltan los nombres"
        );

    }


    if(!apellidos){

        errores.push(
            "Faltan los apellidos"
        );

    }


    // Tipo de documento

    const tiposPermitidos = [

        "DNI",
        "CARNET_EXTRANJERIA",
        "PASAPORTE",
        "OTRO"

    ];


    if(
        tipoDocumento &&
        !tiposPermitidos.includes(
            tipoDocumento
        )
    ){

        errores.push(
            "Tipo de documento no válido"
        );

    }


    // DNI

    if(
        tipoDocumento === "DNI" &&
        !/^\d{8}$/.test(
            numeroDocumento
        )
    ){

        errores.push(
            "El DNI debe tener 8 números"
        );

    }


    // Correo

    if(
        correo &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            correo
        )
    ){

        errores.push(
            "Correo electrónico no válido"
        );

    }


    // Género

    const generosPermitidos = [

        "",
        "MASCULINO",
        "FEMENINO",
        "SIN_ESPECIFICAR"

    ];


    if(
        !generosPermitidos.includes(
            genero
        )
    ){

        errores.push(
            "Género no válido"
        );

    }


    // Fechas de contrato

    if(
        inicioContrato &&
        terminoContrato &&
        terminoContrato <
        inicioContrato
    ){

        errores.push(
            "El término del contrato es anterior al inicio"
        );

    }


    return {

        numeroFila,

        valido:
        errores.length === 0,

        errores,

        datos:{

            tipoDocumento,

            numeroDocumento,

            nombres,

            apellidos,

            fechaNacimiento,

            genero:
            genero || "SIN_ESPECIFICAR",

            correo,

            telefono,

            direccion,

            sucursal,

            area,

            subarea,

            cargoProfesion,

            inicioContrato,

            terminoContrato,

            nacionalidad,

            paisNacionalidad,

            comentarios

        }

    };

}


function mostrarVistaPreviaExcel(
    archivo,
    filas
){

    const resultado =
    document.getElementById(
        "resultadoArchivoExcel"
    );


    if(!resultado){

        return;

    }


    const filasValidas =
    filas.filter(
        fila=>fila.valido
    );


    const filasConErrores =
    filas.filter(
        fila=>!fila.valido
    );


    const filasTabla =
    filas.map(fila=>{

        const estado = fila.valido
        ?
        `

            <span class="estado-fila-excel correcta">

                <i class="bi bi-check-circle"></i>

                Correcta

            </span>

        `
        :
        `

            <span class="estado-fila-excel incorrecta">

                <i class="bi bi-exclamation-circle"></i>

                Con errores

            </span>

        `;


        const observacion =
        fila.valido
        ?
        "Lista para importar"
        :
        fila.errores.join("; ");


        return `

            <tr>

                <td>
                    ${fila.numeroFila}
                </td>

                <td>
                    ${estado}
                </td>

                <td>
                    ${escaparHTML(
                        fila.datos.numeroDocumento
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        fila.datos.apellidos
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        fila.datos.nombres
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        observacion
                    )}
                </td>

            </tr>

        `;

    })
    .join("");


    resultado.innerHTML = `

        <div class="archivo-correcto">

            <i class="bi bi-file-earmark-check"></i>

            <div>

                <strong>
                    ${escaparHTML(
                        archivo.name
                    )}
                </strong>

                <p>
                    El archivo fue leído correctamente.
                </p>

            </div>

        </div>


        <div class="resumen-carga-excel">

            <div class="resumen-excel total">

                <strong>
                    ${filas.length}
                </strong>

                <span>
                    Total
                </span>

            </div>


            <div class="resumen-excel validas">

                <strong>
                    ${filasValidas.length}
                </strong>

                <span>
                    Correctas
                </span>

            </div>


            <div class="resumen-excel errores">

                <strong>
                    ${filasConErrores.length}
                </strong>

                <span>
                    Con errores
                </span>

            </div>

        </div>


        <div class="tabla-previa-excel-wrapper">

            <table class="tabla-previa-excel">

                <thead>

                    <tr>

                        <th>
                            Fila
                        </th>

                        <th>
                            Estado
                        </th>

                        <th>
                            Documento
                        </th>

                        <th>
                            Apellidos
                        </th>

                        <th>
                            Nombres
                        </th>

                        <th>
                            Observación
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${filasTabla}

                </tbody>

            </table>

        </div>


        <button
        type="button"
        id="btnContinuarImportacion"
        class="btn-carga-excel btn-importar-excel"
        ${filasValidas.length === 0
            ? "disabled"
            : ""
        }>

            <i class="bi bi-cloud-arrow-up"></i>

            Continuar con ${
                filasValidas.length
            } colaboradores

        </button>

    `;


    const btnContinuar =
    document.getElementById(
        "btnContinuarImportacion"
    );


    if(btnContinuar){

        btnContinuar.onclick = ()=>{

            console.log(
                "Colaboradores válidos:",
                filasValidas
            );


            Swal.fire({

                icon:"info",

                title:"Archivo validado",

                text:
                `${filasValidas.length} colaboradores están listos para importar.`,

                confirmButtonText:
                "Aceptar"

            });

        };

    }

}


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

/*=====================================================
    MOSTRAR ERROR
=====================================================*/

function mostrarErrorArchivo(
    contenedor,
    mensaje
){

    if(!contenedor){

        return;

    }


    contenedor.innerHTML = `

        <div class="archivo-error">

            <i class="bi bi-exclamation-circle"></i>

            <span>
                ${mensaje}
            </span>

        </div>

    `;

}
