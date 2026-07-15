import * as XLSX
from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

import {
    db
}
from "../firebase-config.js";


import {
    collection,
    query,
    where,
    getDocs,
    doc,
    writeBatch,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let empresaIdActual = null;


export function iniciarCargaMasivaColaboradores({

    empresaId,

    botonCargaMasiva

}){

    empresaIdActual = empresaId;

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

    btnContinuar.onclick = async()=>{

        await confirmarImportacion(
            filasValidas
        );

    };

}

}


async function confirmarImportacion(
    filasValidas
){

    if(filasValidas.length === 0){

        return;

    }


    const respuesta =
    await Swal.fire({

        icon:"question",

        title:"Confirmar importación",

        html:`

            <p>

                Se registrarán

                <strong>
                    ${filasValidas.length}
                </strong>

                colaboradores en la empresa.

            </p>

            <p style="
                margin-top:10px;
                color:#64748b;
                font-size:13px;
            ">

                Los documentos duplicados no serán registrados.

            </p>

        `,

        showCancelButton:true,

        confirmButtonText:
        "Sí, importar",

        cancelButtonText:
        "Cancelar",

        confirmButtonColor:
        "#7c3aed"

    });


    if(!respuesta.isConfirmed){

        return;

    }


    await importarColaboradores(
        filasValidas
    );

}

async function importarColaboradores(
    filasValidas
){

    if(!empresaIdActual){

        Swal.fire({

            icon:"error",

            title:"Empresa no identificada",

            text:
            "No se pudo determinar la empresa de los colaboradores."

        });

        return;

    }


    try{

        Swal.fire({

            title:"Importando colaboradores",

            html:`

                <p>
                    Procesando la información del archivo...
                </p>

            `,

            allowOutsideClick:false,

            allowEscapeKey:false,

            showConfirmButton:false,

            didOpen:()=>{

                Swal.showLoading();

            }

        });


        /*
        Obtener colaboradores existentes
        para evitar documentos duplicados.
        */

        const consultaColaboradores =
        query(

            collection(
                db,
                "colaboradores"
            ),

            where(
                "empresaId",
                "==",
                empresaIdActual
            )

        );


        const resultadoColaboradores =
        await getDocs(
            consultaColaboradores
        );


        const documentosExistentes =
        new Set();


        resultadoColaboradores.forEach(
            documento=>{

                const datos =
                documento.data();


                const numeroDocumento =
                String(

                    datos.documento?.numero ||

                    datos.dni ||

                    ""

                )
                .trim()
                .toUpperCase();


                if(numeroDocumento){

                    documentosExistentes.add(
                        numeroDocumento
                    );

                }

            }
        );


        /*
        Cargar estructura organizacional.
        */

        const [

            resultadoSucursales,

            resultadoAreas,

            resultadoSubareas

        ] =
        await Promise.all([

            getDocs(
                query(
                    collection(
                        db,
                        "sucursales"
                    ),
                    where(
                        "empresaId",
                        "==",
                        empresaIdActual
                    )
                )
            ),

            getDocs(
                query(
                    collection(
                        db,
                        "areas"
                    ),
                    where(
                        "empresaId",
                        "==",
                        empresaIdActual
                    )
                )
            ),

            getDocs(
                query(
                    collection(
                        db,
                        "subareas"
                    ),
                    where(
                        "empresaId",
                        "==",
                        empresaIdActual
                    )
                )
            )

        ]);


        const sucursales =
        convertirSnapshotEnLista(
            resultadoSucursales
        );


        const areas =
        convertirSnapshotEnLista(
            resultadoAreas
        );


        const subareas =
        convertirSnapshotEnLista(
            resultadoSubareas
        );


        const colaboradoresImportar = [];

        const omitidos = [];

        const documentosArchivo =
        new Set();


        filasValidas.forEach(fila=>{

            const datos =
            fila.datos;


            const numeroDocumento =
            String(
                datos.numeroDocumento
            )
            .trim()
            .toUpperCase();


            /*
            Duplicado en Firestore.
            */

            if(
                documentosExistentes.has(
                    numeroDocumento
                )
            ){

                omitidos.push({

                    fila:
                    fila.numeroFila,

                    documento:
                    numeroDocumento,

                    motivo:
                    "El documento ya existe en el sistema"

                });

                return;

            }


            /*
            Duplicado dentro del mismo Excel.
            */

            if(
                documentosArchivo.has(
                    numeroDocumento
                )
            ){

                omitidos.push({

                    fila:
                    fila.numeroFila,

                    documento:
                    numeroDocumento,

                    motivo:
                    "Documento repetido dentro del archivo"

                });

                return;

            }


            documentosArchivo.add(
                numeroDocumento
            );


            const sucursalEncontrada =
            buscarPorNombre(

                sucursales,

                datos.sucursal

            );


            const areaEncontrada =
            buscarPorNombre(

                areas,

                datos.area

            );


            const subareaEncontrada =
            buscarPorNombre(

                subareas,

                datos.subarea

            );


            colaboradoresImportar.push({

                empresaId:
                empresaIdActual,

                documento:{

                    tipo:
                    datos.tipoDocumento,

                    numero:
                    numeroDocumento

                },

                datosPersonales:{

                    nombres:
                    datos.nombres,

                    apellidos:
                    datos.apellidos,

                    fechaNacimiento:
                    datos.fechaNacimiento || null,

                    genero:
                    datos.genero ||
                    "SIN_ESPECIFICAR"

                },

                contacto:{

                    correo:
                    datos.correo,

                    telefono:
                    datos.telefono,

                    direccion:
                    datos.direccion

                },

                organizacion:{

                    sucursalId:
                    sucursalEncontrada?.id ||
                    null,

                    sucursal:
                    sucursalEncontrada
                    ?
                    obtenerNombre(
                        sucursalEncontrada
                    )
                    :
                    datos.sucursal,

                    areaId:
                    areaEncontrada?.id ||
                    null,

                    area:
                    areaEncontrada
                    ?
                    obtenerNombre(
                        areaEncontrada
                    )
                    :
                    datos.area,

                    subareaId:
                    subareaEncontrada?.id ||
                    null,

                    subarea:
                    subareaEncontrada
                    ?
                    obtenerNombre(
                        subareaEncontrada
                    )
                    :
                    datos.subarea

                },

                informacionAdicional:{

                    cargoProfesion:
                    datos.cargoProfesion,

                    inicioContrato:
                    datos.inicioContrato || null,

                    terminoContrato:
                    datos.terminoContrato || null,

                    nacionalidad:
                    datos.nacionalidad,

                    paisNacionalidad:
                    datos.paisNacionalidad,

                    comentarios:
                    datos.comentarios

                },

                estado:"ACTIVO",

                fechaRegistro:
                serverTimestamp(),

                origenRegistro:
                "CARGA_MASIVA"

            });

        });


        if(
            colaboradoresImportar.length === 0
        ){

            await Swal.fire({

                icon:"warning",

                title:"Nada para importar",

                text:
                "Todos los documentos del archivo ya existen o están duplicados."

            });

            return;

        }


        /*
        Firestore permite hasta 500 operaciones
        por lote. Se procesan en bloques.
        */

        const tamañoLote = 450;


        for(
            let inicio = 0;

            inicio <
            colaboradoresImportar.length;

            inicio += tamañoLote
        ){

            const grupo =
            colaboradoresImportar.slice(

                inicio,

                inicio + tamañoLote

            );


            const lote =
            writeBatch(
                db
            );


            grupo.forEach(
                colaborador=>{

                    const referencia =
                    doc(
                        collection(
                            db,
                            "colaboradores"
                        )
                    );


                    lote.set(

                        referencia,

                        colaborador

                    );

                }
            );


            await lote.commit();

        }


        await mostrarResultadoImportacion({

            importados:
            colaboradoresImportar.length,

            omitidos

        });

    }
    catch(error){

        console.error(
            "Error en carga masiva:",
            error
        );


        await Swal.fire({

            icon:"error",

            title:"No se pudo importar",

            text:
            "Ocurrió un error al registrar los colaboradores."

        });

    }

}

function convertirSnapshotEnLista(
    snapshot
){

    const lista = [];


    snapshot.forEach(documento=>{

        lista.push({

            id:
            documento.id,

            ...documento.data()

        });

    });


    return lista;

}


function normalizarTexto(
    valor
){

    return String(
        valor || ""
    )
    .normalize("NFD")
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .trim()
    .toUpperCase();

}


function obtenerNombre(
    elemento
){

    return (

        elemento.nombre ||

        elemento.nombreSucursal ||

        elemento.nombreArea ||

        elemento.nombreSubarea ||

        elemento.descripcion ||

        ""

    );

}


function buscarPorNombre(
    lista,
    nombreBuscado
){

    const nombreNormalizado =
    normalizarTexto(
        nombreBuscado
    );


    if(!nombreNormalizado){

        return null;

    }


    return lista.find(elemento=>{

        return normalizarTexto(
            obtenerNombre(
                elemento
            )
        ) === nombreNormalizado;

    }) || null;

}



async function mostrarResultadoImportacion({

    importados,

    omitidos

}){

    const detalleOmitidos =
    omitidos.length > 0
    ?
    `

        <div style="
            margin-top:15px;
            padding:12px;
            background:#fff7ed;
            border-radius:10px;
            color:#9a3412;
            text-align:left;
            font-size:13px;
        ">

            <strong>
                ${omitidos.length}
                registros omitidos
            </strong>

            <ul style="
                margin:8px 0 0;
                padding-left:20px;
                max-height:150px;
                overflow:auto;
            ">

                ${omitidos.map(item=>`

                    <li>

                        Fila ${item.fila} ·
                        ${escaparHTML(
                            item.documento
                        )}:

                        ${escaparHTML(
                            item.motivo
                        )}

                    </li>

                `).join("")}

            </ul>

        </div>

    `
    :
    "";


    await Swal.fire({

        icon:"success",

        title:"Importación completada",

        html:`

            <p>

                Se registraron correctamente

                <strong>
                    ${importados}
                </strong>

                colaboradores.

            </p>

            ${detalleOmitidos}

        `,

        confirmButtonText:
        "Aceptar"

    });

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
