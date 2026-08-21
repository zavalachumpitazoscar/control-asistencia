import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    writeBatch,
    doc,
    serverTimestamp,
    Timestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    normalizarDNI,
    normalizarDNIParaComparacion
}
from "./utilidades-asistencia.js?v=20260817-4";


import {
    auth,
    db
}
from "../firebase-config.js";


/*=====================================================
CONFIGURACIÓN
=====================================================*/

const MAXIMO_OPERACIONES_BATCH = 450;

const MAXIMO_IDS_CONSULTA = 30;



/*=====================================================
GUARDAR MARCACIONES IMPORTADAS
=====================================================*/

export async function guardarMarcacionesImportadas(
    marcaciones
){

    if(
        !Array.isArray(marcaciones) ||
        marcaciones.length === 0
    ){

        throw new Error(
            "No existen marcaciones válidas para guardar."
        );

    }


    const usuario =
        auth.currentUser;


    if(!usuario){

        throw new Error(
            "No existe un usuario autenticado."
        );

    }


    const empresaId =
        sessionStorage.getItem(
            "empresaId"
        );


    if(!empresaId){

        throw new Error(
            "No se encontró la empresa activa."
        );

    }


    /*
        Resultado general de la importación.
    */

    const resultado = {

        totalRecibidas:
            marcaciones.length,

        guardadas:[],

        duplicadas:[],

        dniNoEncontrados:[],

        colaboradoresInactivos:[],

        coincidenciasDniSinCeros:[],

        errores:[]

    };


    /*
        1. Obtener colaboradores de la empresa.
    */

    const indiceColaboradores =
        await obtenerColaboradoresPorDNI(
            empresaId
        );


    /*
        2. Relacionar cada marcación
           con su colaborador.
    */

    const marcacionesRelacionadas = [];


    marcaciones.forEach(
        marcacion=>{

            const coincidencia =
                buscarColaboradorPorDNI(
                    indiceColaboradores,
                    marcacion.dni
                );

            const colaborador =
                coincidencia?.colaborador;


            if(!colaborador){

                resultado.dniNoEncontrados.push({

                    fila:
                        marcacion.fila,

                    dni:
                        marcacion.dni,

                    fechaHoraTexto:
                        marcacion.fechaHoraTexto,

                    motivo:
                        "No existe un colaborador con este DNI."

                });


                return;

            }

            if(coincidencia.sinCerosIniciales){

                resultado.coincidenciasDniSinCeros.push({
                    fila:marcacion.fila,
                    dniReloj:marcacion.dni,
                    dniColaborador:colaborador.dni,
                    colaboradorId:colaborador.id,
                    colaboradorNombre:colaborador.nombreCompleto,
                    fechaHoraTexto:marcacion.fechaHoraTexto
                });

            }


            const estadoColaborador =
                String(
                    colaborador.estado ||
                    "ACTIVO"
                )
                .trim()
                .toUpperCase();


            if(
                estadoColaborador ===
                "INACTIVO"
            ){

                resultado.colaboradoresInactivos.push({

                    fila:
                        marcacion.fila,

                    dni:
                        marcacion.dni,

                    colaboradorId:
                        colaborador.id,

                    colaboradorNombre:
                        colaborador.nombreCompleto,

                    fechaHoraTexto:
                        marcacion.fechaHoraTexto,

                    motivo:
                        "El colaborador se encuentra inactivo."

                });


                return;

            }


            /*
                ID determinístico.

                La misma empresa, colaborador y fecha/hora
                siempre generan el mismo documento.

                Esto evita duplicados incluso si el mismo
                archivo se intenta importar nuevamente.
            */

            const marcacionId =
                construirIdMarcacion(
                    empresaId,
                    colaborador.id,
                    marcacion.fechaHora
                );


            marcacionesRelacionadas.push({

                ...marcacion,

                marcacionId,

                empresaId,

                colaboradorId:
                    colaborador.id,

                colaboradorNombre:
                    colaborador.nombreCompleto,

                colaboradorDocumento:
                    colaborador.dni,

                documentoReloj:
                    marcacion.dni,

                sucursalId:
                    colaborador.sucursalId,

                areaId:
                    colaborador.areaId,

                subareaId:
                    colaborador.subareaId

            });

        }
    );


    if(
        marcacionesRelacionadas.length === 0
    ){

        return completarResumen(
            resultado
        );

    }


    /*
        3. Buscar cuáles ya existen
           en Firestore.
    */

    const idsExistentes =
        await obtenerIdsMarcacionesExistentes(
            marcacionesRelacionadas.map(
                marcacion=>
                    marcacion.marcacionId
            )
        );


    const marcacionesNuevas = [];


    marcacionesRelacionadas.forEach(
        marcacion=>{

            if(
                idsExistentes.has(
                    marcacion.marcacionId
                )
            ){

                resultado.duplicadas.push({

                    fila:
                        marcacion.fila,

                    dni:
                        marcacion.dni,

                    colaboradorId:
                        marcacion.colaboradorId,

                    colaboradorNombre:
                        marcacion.colaboradorNombre,

                    fechaHoraTexto:
                        marcacion.fechaHoraTexto,

                    motivo:
                        "La marcación ya existe en el sistema."

                });


                return;

            }


            marcacionesNuevas.push(
                marcacion
            );

        }
    );


    /*
        4. Guardar las marcaciones nuevas.
    */

    if(
        marcacionesNuevas.length > 0
    ){

        await guardarMarcacionesPorLotes(

            marcacionesNuevas,

            usuario.uid,

            resultado

        );

    }


    return completarResumen(
        resultado
    );

}



/*=====================================================
OBTENER COLABORADORES POR DNI
=====================================================*/

async function obtenerColaboradoresPorDNI(
    empresaId
){

    const exactos = new Map();

    const normalizados = new Map();


    const consulta =
        query(
            collection(
                db,
                "colaboradores"
            ),
            where(
                "empresaId",
                "==",
                empresaId
            )
        );


    const resultado =
        await getDocs(
            consulta
        );


    resultado.forEach(
        documento=>{

            const datos =
                documento.data();


            /*
                Tu estructura principal utiliza:

                documento.numero

                Se mantienen alternativas para que también
                funcione con colaboradores antiguos o
                importados con otra estructura.
            */

            const dni =
                normalizarDNI(
                    datos.documento?.numero ||
                    datos.numeroDocumento ||
                    datos.dni ||
                    datos.datosPersonales?.dni ||
                    ""
                );


            if(!dni){

                return;

            }


            const nombres =
                datos.datosPersonales?.nombres ||
                datos.nombres ||
                "";


            const apellidos =
                datos.datosPersonales?.apellidos ||
                datos.apellidos ||
                "";


            const nombreCompleto =
                [
                    nombres,
                    apellidos
                ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
                datos.nombreCompleto ||
                "Colaborador";


            const colaborador = {

                    id:
                        documento.id,

                    dni,

                    nombreCompleto,

                    estado:
                        datos.estado ||
                        "ACTIVO",

                    sucursalId:
                        datos.organizacion?.sucursalId ||
                        datos.sucursalId ||
                        null,

                    areaId:
                        datos.organizacion?.areaId ||
                        datos.areaId ||
                        null,

                    subareaId:
                        datos.organizacion?.subareaId ||
                        datos.subareaId ||
                        null

                };

            exactos.set(dni, colaborador);

            const claveComparacion =
                normalizarDNIParaComparacion(dni);

            if(claveComparacion && !normalizados.has(claveComparacion)){
                normalizados.set(claveComparacion, colaborador);
            }

        }
    );


    return { exactos, normalizados };

}


function buscarColaboradorPorDNI(indice, dniReloj){

    const dni = normalizarDNI(dniReloj);

    const exacto = indice.exactos.get(dni);

    if(exacto){
        return { colaborador:exacto, sinCerosIniciales:false };
    }

    const clave = normalizarDNIParaComparacion(dni);

    const normalizado = clave
        ? indice.normalizados.get(clave)
        : null;

    return normalizado
        ? { colaborador:normalizado, sinCerosIniciales:normalizado.dni !== dni }
        : null;

}


export async function obtenerCoincidenciasDNIImportacion(dnis){

    const empresaId = sessionStorage.getItem("empresaId");

    if(!empresaId){
        throw new Error("No se encontró la empresa activa.");
    }

    const indice = await obtenerColaboradoresPorDNI(empresaId);

    return dnis.map(dni=>{
        const coincidencia = buscarColaboradorPorDNI(indice, dni);
        if(!coincidencia) return null;
        return {
            dniReloj:normalizarDNI(dni),
            dniColaborador:coincidencia.colaborador.dni,
            colaboradorId:coincidencia.colaborador.id,
            colaboradorNombre:coincidencia.colaborador.nombreCompleto,
            sinCerosIniciales:coincidencia.sinCerosIniciales
        };
    });

}



/*=====================================================
OBTENER MARCACIONES YA EXISTENTES
=====================================================*/

async function obtenerIdsMarcacionesExistentes(
    ids
){

    const existentes =
        new Set();


    const grupos = dividirEnGrupos([...new Set(ids)], MAXIMO_IDS_CONSULTA);


    for(
        const grupo of grupos
    ){

        if(grupo.length === 0){

            continue;

        }


        /*
            Las reglas autorizan la lectura directa porque el identificador
            comienza con la empresa activa. Una consulta "documentId in"
            se evalúa como listado y Firestore no puede demostrar que todos
            los posibles resultados pertenecen a esa empresa.
        */
        const documentos = await Promise.all(
            grupo.map(id=>getDoc(doc(db,"marcaciones",id)))
        );

        documentos.forEach(documento=>{
            if(documento.exists()) existentes.add(documento.id);
        });

    }


    return existentes;

}



/*=====================================================
GUARDAR POR LOTES
=====================================================*/

async function guardarMarcacionesPorLotes(
    marcaciones,
    usuarioId,
    resultado
){

    const grupos =
        dividirEnGrupos(
            marcaciones,
            MAXIMO_OPERACIONES_BATCH
        );


    for(
        const grupo of grupos
    ){

        const lote =
            writeBatch(
                db
            );


        const preparadas = [];


        grupo.forEach(
            marcacion=>{

                try{

                    const referencia =
                        doc(
                            db,
                            "marcaciones",
                            marcacion.marcacionId
                        );


                    const datosMarcacion = {

                        empresaId:
                            marcacion.empresaId,

                        colaboradorId:
                            marcacion.colaboradorId,

                        colaboradorNombre:
                            marcacion.colaboradorNombre,

                        colaboradorDocumento:
                            marcacion.colaboradorDocumento,

                        documentoReloj:
                            marcacion.documentoReloj ||
                            marcacion.colaboradorDocumento,

                        fecha:
                            marcacion.fecha,

                        fechaHora:
                            Timestamp.fromDate(
                                marcacion.fechaHora
                            ),

                        fechaHoraISO:
                            marcacion.fechaHoraISO,

                        hora:
                            obtenerHoraTexto(
                                marcacion.fechaHora
                            ),

                        tipo:
                            "SIN_CLASIFICAR",

                        origen:
                            "IMPORTACION",

                        sucursalId:
                            marcacion.sucursalId ||
                            null,

                        areaId:
                            marcacion.areaId ||
                            null,

                        subareaId:
                            marcacion.subareaId ||
                            null,

                        estado:
                            "VALIDA",

                        observaciones:
                            marcacion.documentoReloj !== marcacion.colaboradorDocumento
                            ? `DNI del reloj ${marcacion.documentoReloj} asociado al DNI registrado ${marcacion.colaboradorDocumento}.`
                            : null,

                        archivoFila:
                            marcacion.fila,

                        importadaPor:
                            usuarioId,

                        fechaImportacion:
                            serverTimestamp(),

                        creadoPor:
                            usuarioId,

                        fechaCreacion:
                            serverTimestamp()

                    };


                    lote.set(
                        referencia,
                        datosMarcacion
                    );


                    preparadas.push(
                        marcacion
                    );

                }
                catch(error){

                    resultado.errores.push({

                        fila:
                            marcacion.fila,

                        dni:
                            marcacion.dni,

                        fechaHoraTexto:
                            marcacion.fechaHoraTexto,

                        motivo:
                            error.message ||
                            "No se pudo preparar la marcación."

                    });

                }

            }
        );


        if(
            preparadas.length === 0
        ){

            continue;

        }


        try{

            await lote.commit();


            preparadas.forEach(
                marcacion=>{

                    resultado.guardadas.push({

                        id:
                            marcacion.marcacionId,

                        fila:
                            marcacion.fila,

                        dni:
                            marcacion.dni,

                        colaboradorId:
                            marcacion.colaboradorId,

                        colaboradorNombre:
                            marcacion.colaboradorNombre,

                        fecha:
                            marcacion.fecha,

                        fechaHoraTexto:
                            marcacion.fechaHoraTexto

                    });

                }
            );

        }
        catch(error){

            console.error(
                "Error guardando lote de marcaciones:",
                error
            );


            preparadas.forEach(
                marcacion=>{

                    resultado.errores.push({

                        fila:
                            marcacion.fila,

                        dni:
                            marcacion.dni,

                        fechaHoraTexto:
                            marcacion.fechaHoraTexto,

                        motivo:
                            error.message ||
                            "No se pudo guardar el lote."

                    });

                }
            );

        }

    }

}



/*=====================================================
CONSTRUIR ID ÚNICO
=====================================================*/

function construirIdMarcacion(
    empresaId,
    colaboradorId,
    fechaHora
){

    const tiempo =
        fechaHora.getTime();


    return [
        limpiarParaId(
            empresaId
        ),
        limpiarParaId(
            colaboradorId
        ),
        tiempo
    ]
    .join("_");

}



/*=====================================================
LIMPIAR TEXTO PARA ID
=====================================================*/

function limpiarParaId(
    valor
){

    return String(
        valor ?? ""
    )
    .trim()
    .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
    );

}



/*=====================================================
OBTENER HORA
=====================================================*/

function obtenerHoraTexto(
    fecha
){

    const hora =
        String(
            fecha.getHours()
        )
        .padStart(
            2,
            "0"
        );


    const minutos =
        String(
            fecha.getMinutes()
        )
        .padStart(
            2,
            "0"
        );


    const segundos =
        String(
            fecha.getSeconds()
        )
        .padStart(
            2,
            "0"
        );


    return `${hora}:${minutos}:${segundos}`;

}



/*=====================================================
DIVIDIR ARRAY EN GRUPOS
=====================================================*/

function dividirEnGrupos(
    elementos,
    tamanio
){

    const grupos = [];


    for(
        let indice = 0;
        indice < elementos.length;
        indice += tamanio
    ){

        grupos.push(
            elementos.slice(
                indice,
                indice + tamanio
            )
        );

    }


    return grupos;

}



/*=====================================================
COMPLETAR RESUMEN
=====================================================*/

function completarResumen(
    resultado
){

    return {

        ...resultado,

        cantidadGuardadas:
            resultado.guardadas.length,

        cantidadDuplicadas:
            resultado.duplicadas.length,

        cantidadDniNoEncontrados:
            resultado.dniNoEncontrados.length,

        cantidadInactivos:
            resultado.colaboradoresInactivos.length,

        cantidadCoincidenciasDniSinCeros:
            resultado.coincidenciasDniSinCeros.length,

        cantidadErrores:
            resultado.errores.length

    };

}


