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


export function iniciarDesactivacionMasiva({

    botonDesactivar,

    obtenerSeleccionados,

    limpiarSeleccion

}){

    if(!botonDesactivar){

        console.error(
            "No se encontró el botón para desactivar colaboradores."
        );

        return;

    }


    botonDesactivar.onclick = async()=>{

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
                "Selecciona al menos un colaborador para desactivar.",

                confirmButtonText:
                "Aceptar"

            });

            return;

        }


        const respuesta =
        await Swal.fire({

            icon:"warning",

            title:"Desactivar colaboradores",

            html:`

                <p>

                    Se desactivarán

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

                    Los colaboradores permanecerán registrados,
                    pero quedarán con estado INACTIVO.

                </p>

            `,

            showCancelButton:true,

            confirmButtonText:
            "Sí, desactivar",

            cancelButtonText:
            "Cancelar",

            confirmButtonColor:
            "#f59e0b",

            cancelButtonColor:
            "#64748b",

            reverseButtons:true

        });


        if(!respuesta.isConfirmed){

            return;

        }


        await desactivarColaboradores({

            ids:
            seleccionados,

            botonDesactivar,

            limpiarSeleccion

        });

    };

}


/*=====================================================
    DESACTIVAR COLABORADORES
=====================================================*/

async function desactivarColaboradores({

    ids,

    botonDesactivar,

    limpiarSeleccion

}){

    const textoOriginal =
    botonDesactivar.innerHTML;


    try{

        botonDesactivar.disabled =
        true;


        botonDesactivar.innerHTML = `

            <span class="spinner-boton"></span>

            Desactivando...

        `;


        Swal.fire({

            title:"Desactivando colaboradores",

            text:
            "Espera mientras se actualizan los registros.",

            allowOutsideClick:false,

            allowEscapeKey:false,

            showConfirmButton:false,

            didOpen:()=>{

                Swal.showLoading();

            }

        });


        /*
        Firestore admite un máximo de operaciones
        por lote. Procesamos en grupos seguros.
        */

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
                        "INACTIVO",

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

            title:"Colaboradores desactivados",

            text:
            `${ids.length} colaboradores fueron desactivados correctamente.`,

            confirmButtonText:
            "Aceptar"

        });

    }
    catch(error){

        console.error(
            "Error al desactivar colaboradores:",
            error
        );


        await Swal.fire({

            icon:"error",

            title:"No se pudo desactivar",

            text:
            "Ocurrió un error al actualizar los colaboradores seleccionados.",

            confirmButtonText:
            "Aceptar"

        });

    }
    finally{

        botonDesactivar.innerHTML =
        textoOriginal;

    }

}
