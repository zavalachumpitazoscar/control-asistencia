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
    writeBatch
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";




/*
Aquí se colocarán las colecciones relacionadas
con los colaboradores.

Cada colección debe contener un campo colaboradorId.

Ejemplo futuro:

{
    nombre:"asistencias",
    campo:"colaboradorId"
}
*/

const COLECCIONES_RELACIONADAS = [

    // {
    //     nombre:"asistencias",
    //     campo:"colaboradorId"
    // },

    // {
    //     nombre:"marcaciones",
    //     campo:"colaboradorId"
    // },

    // {
    //     nombre:"asignacionesHorarios",
    //     campo:"colaboradorId"
    // }

];


export function iniciarEliminacionMasiva({

    botonEliminar,

    obtenerSeleccionados,

    limpiarSeleccion

}){

    if(!botonEliminar){

        console.error(
            "No se encontró el botón para eliminar colaboradores."
        );

        return;

    }


    botonEliminar.onclick = async()=>{

        const seleccionados =
        obtenerSeleccionados();


        if(
            !Array.isArray(seleccionados) ||
            seleccionados.length === 0
        ){

            await Swal.fire({

                icon:"warning",

                title:"No se puede eliminar",

                text:
                "Solo puedes eliminar colaboradores que se encuentren inactivos.",

                confirmButtonText:
                "Aceptar"

            });

            return;

        }


        const respuesta =
        await Swal.fire({

            icon:"warning",

            title:"Eliminar colaboradores",

            html:`

                <p>

                    Se eliminarán definitivamente

                    <strong>
                        ${seleccionados.length}
                    </strong>

                    colaboradores.

                </p>


                <div style="
                    margin-top:15px;
                    padding:12px 14px;
                    border-radius:10px;
                    background:#fee2e2;
                    color:#991b1b;
                    text-align:left;
                    font-size:13px;
                ">

                    <strong>
                        Esta acción no se puede deshacer.
                    </strong>

                    <p style="margin:6px 0 0;">

                        También se eliminarán los registros
                        relacionados configurados para estos
                        colaboradores.

                    </p>

                </div>

            `,

            showCancelButton:true,

            confirmButtonText:
            "Sí, eliminar definitivamente",

            cancelButtonText:
            "Cancelar",

            confirmButtonColor:
            "#dc2626",

            cancelButtonColor:
            "#64748b",

            reverseButtons:true,

            focusCancel:true

        });


        if(!respuesta.isConfirmed){

            return;

        }


        await eliminarColaboradores({

            ids:
            seleccionados,

            botonEliminar,

            limpiarSeleccion

        });

    };

}


/*=====================================================
    ELIMINAR COLABORADORES
=====================================================*/

async function eliminarColaboradores({

    ids,

    botonEliminar,

    limpiarSeleccion

}){

    const textoOriginal =
    botonEliminar.innerHTML;


    try{

        botonEliminar.disabled =
        true;


        botonEliminar.innerHTML = `

            <span class="spinner-boton"></span>

            Eliminando...

        `;


        Swal.fire({

            title:"Eliminando colaboradores",

            text:
            "Espera mientras se eliminan los registros.",

            allowOutsideClick:false,

            allowEscapeKey:false,

            showConfirmButton:false,

            didOpen:()=>{

                Swal.showLoading();

            }

        });


        const referenciasEliminar = [];


        /*
        Documento principal de cada colaborador.
        */

        ids.forEach(idColaborador=>{

            referenciasEliminar.push(

                doc(
                    db,
                    "colaboradores",
                    idColaborador
                )

            );

        });


        /*
        Buscar todos los registros relacionados.
        */

        for(
            const relacion
            of COLECCIONES_RELACIONADAS
        ){

            for(
                const idColaborador
                of ids
            ){

                const consultaRelacionados =
                query(

                    collection(
                        db,
                        relacion.nombre
                    ),

                    where(
                        relacion.campo,
                        "==",
                        idColaborador
                    )

                );


                const resultado =
                await getDocs(
                    consultaRelacionados
                );


                resultado.forEach(documento=>{

                    referenciasEliminar.push(

                        documento.ref

                    );

                });

            }

        }


        /*
        Firestore admite un máximo limitado
        de operaciones por lote.

        Se utilizan grupos de 450.
        */

        const tamañoLote =
        450;


        for(
            let inicio = 0;

            inicio <
            referenciasEliminar.length;

            inicio += tamañoLote
        ){

            const grupo =
            referenciasEliminar.slice(

                inicio,

                inicio + tamañoLote

            );


            const lote =
            writeBatch(
                db
            );


            grupo.forEach(referencia=>{

                lote.delete(
                    referencia
                );

            });


            await lote.commit();

        }


        if(
            typeof limpiarSeleccion ===
            "function"
        ){

            limpiarSeleccion();

        }


        await Swal.fire({

            icon:"success",

            title:"Colaboradores eliminados",

            html:`

                <p>

                    Se eliminaron correctamente

                    <strong>
                        ${ids.length}
                    </strong>

                    colaboradores.

                </p>

            `,

            confirmButtonText:
            "Aceptar"

        });

    }
    catch(error){

        console.error(
            "Error al eliminar colaboradores:",
            error
        );


        await Swal.fire({

            icon:"error",

            title:"No se pudo eliminar",

            text:
            "Ocurrió un error al eliminar los colaboradores seleccionados.",

            confirmButtonText:
            "Aceptar"

        });

    }
    finally{

        botonEliminar.innerHTML =
        textoOriginal;

    }

}
