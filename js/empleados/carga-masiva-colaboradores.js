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


    if(!archivo.name
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

                    Leyendo archivo...

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


        console.log(
            "Filas encontradas en Excel:",
            filas
        );


        if(resultado){

            resultado.innerHTML = `

                <div class="archivo-correcto">

                    <i class="bi bi-check-circle"></i>

                    <div>

                        <strong>
                            ${archivo.name}
                        </strong>

                        <p>

                            Se encontraron

                            <strong>
                                ${filas.length}
                            </strong>

                            colaboradores para revisar.

                        </p>

                    </div>

                </div>

            `;

        }


        /*
        En el siguiente paso utilizaremos
        estas filas para validar:

        - Campos obligatorios
        - DNI de 8 dígitos
        - Documentos duplicados
        - Sucursales
        - Áreas
        - Subáreas
        */

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
