import {
    db
}
from "../firebase-config.js";

import {
    doc,
    writeBatch,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


export function iniciarActivacionMasiva({

    botonActivar,

    obtenerSeleccionados,

    limpiarSeleccion

}){

    if(!botonActivar){

        console.error(
            "No se encontró el botón para activar colaboradores."
        );

        return;

    }


    botonActivar.onclick = async()=>{

        const seleccionados =
        obtenerSeleccionados();


        if(
            !Array.isArray(seleccionados) ||
            seleccionados.length === 0
        ){

            await Swal.fire({

                icon:"warning",

                title:"Sin colaboradores seleccionados",

                text:
                "Todos los colaboradores seleccionados ya se encuentran activos.",

                confirmButtonText:
                "Aceptar"

            });

            return;

        }


        const respuesta =
        await Swal.fire({

            icon:"question",

            title:"Activar colaboradores",

            html:`

                <p>

                    Se activarán

                    <strong>
                        ${seleccionados.length}
                    </strong>

                    colaboradores seleccionados.

                </p>

                <p style="
                    margin-top:10px;
                    color:#64748b;
                    font-size:13px;
                ">

                    Los colaboradores cambiarán al estado ACTIVO.

                </p>

            `,

            showCancelButton:true,

            confirmButtonText:
            "Sí, activar",

            cancelButtonText:
            "Cancelar",

            confirmButtonColor:
            "#16a34a",

            cancelButtonColor:
            "#64748b",

            reverseButtons:true

        });


        if(!respuesta.isConfirmed){

            return;

        }


        await activarColaboradores({

            ids:
            seleccionados,

            botonActivar,

            limpiarSeleccion

        });

    };

}


/*=====================================================
    ACTIVAR COLABORADORES
=====================================================*/

async function activarColaboradores({

    ids,

    botonActivar,

    limpiarSeleccion

}){

    const textoOriginal =
    botonActivar.innerHTML;


    try{

        botonActivar.disabled =
        true;


        botonActivar.innerHTML = `

            <span class="spinner-boton"></span>

            Activando...

        `;


        Swal.fire({

            title:"Activando colaboradores",

            text:
            "Espera mientras se actualizan los registros.",

            allowOutsideClick:false,

            allowEscapeKey:false,

            showConfirmButton:false,

            didOpen:()=>{

                Swal.showLoading();

            }

        });


        const tamañoLote =
        450;


        for(
            let inicio = 0;
            inicio < ids.length;
            inicio += tamañoLote
        ){

            const grupo =
            ids.slice(
                inicio,
                inicio + tamañoLote
            );


            const lote =
            writeBatch(
                db
            );


            grupo.forEach(idColaborador=>{

                const referencia =
                doc(
                    db,
                    "colaboradores",
                    idColaborador
                );


                lote.update(
                    referencia,
                    {

                        estado:
                        "ACTIVO",

                        fechaModificacion:
                        serverTimestamp()

                    }
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

            title:"Colaboradores activados",

            text:
            `${ids.length} colaboradores fueron activados correctamente.`,

            confirmButtonText:
            "Aceptar"

        });

    }
    catch(error){

        console.error(
            "Error al activar colaboradores:",
            error
        );


        await Swal.fire({

            icon:"error",

            title:"No se pudo activar",

            text:
            "Ocurrió un error al actualizar los colaboradores seleccionados.",

            confirmButtonText:
            "Aceptar"

        });

    }
    finally{

        botonActivar.innerHTML =
        textoOriginal;

    }

}
