import {
    db
}
from "../firebase-config.js";


import {

    collection,
    query,
    where,
    onSnapshot

}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



export function iniciarColaboradores(){


    const empresaId =
    sessionStorage.getItem("empresaId");


    if(!empresaId){

        console.error(
            "No se encontró empresaId"
        );

        return;

    }



    const lista =
    document.getElementById(
        "listaColaboradores"
    );


    const buscar =
    document.getElementById(
        "buscarColaborador"
    );


    const seleccionarTodos =
    document.getElementById(
        "seleccionarTodos"
    );


    const btnActivar =
    document.getElementById(
        "btnActivarSeleccion"
    );


    const btnDesactivar =
    document.getElementById(
        "btnDesactivarSeleccion"
    );



    let colaboradores = [];

    let seleccionados = [];




    //=================================
    // LISTAR COLABORADORES
    //=================================


    const consulta = query(

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



    onSnapshot(

        consulta,

        snapshot=>{


            colaboradores = [];


            snapshot.forEach(doc=>{


                colaboradores.push({

                    id:doc.id,

                    ...doc.data()

                });


            });


            renderizar();


        }

    );





    //=================================
    // RENDER
    //=================================


    function renderizar(){


        lista.innerHTML="";



        let texto = "";


        if(buscar){

            texto =
            buscar.value
            .toLowerCase()
            .trim();

        }



        const filtrados =
        colaboradores.filter(col=>{


            const nombre =
            `${col.nombres || ""}
            ${col.apellidos || ""}`
            .toLowerCase();


            const dni =
            (col.dni || "")
            .toLowerCase();



            return (

                nombre.includes(texto)

                ||

                dni.includes(texto)

            );


        });




        if(filtrados.length===0){


            lista.innerHTML=`

            <div class="sin-registros">

                <i class="bi bi-people"></i>

                <h3>
                    No existen colaboradores
                </h3>

                <p>
                    Los colaboradores registrados aparecerán aquí.
                </p>

            </div>

            `;


            return;

        }





        filtrados.forEach(col=>{


            lista.innerHTML +=`


            <div class="tabla-fila">


                <div>

                    <input
                    class="check-colaborador"
                    type="checkbox"
                    data-id="${col.id}"
                    ${

                    seleccionados.includes(col.id)
                    ?
                    "checked"
                    :
                    ""

                    }>

                </div>



                <div>

                    ${col.dni || "-"}

                </div>



                <div>

                    ${col.apellidos || ""}
                    ${col.nombres || ""}

                </div>



                <div>

                    ${col.sucursal || "-"}

                </div>



                <div>

                    ${col.area || "-"}

                </div>



                <div>

                    ${col.subarea || "-"}

                </div>



                <div>

                    ${col.horario || "-"}

                </div>



                <div>


                    <span class="badge-estado

                    ${
                    col.estado==="ACTIVO"
                    ?
                    "activo"
                    :
                    "inactivo"
                    }

                    ">

                    ${
                    col.estado || "ACTIVO"
                    }

                    </span>


                </div>



                <div class="centrado">


                    <button
                    class="btn-editar-colaborador">

                        <i class="bi bi-pencil"></i>

                    </button>


                </div>



            </div>


            `;


        });



        activarChecks();


    }






    //=================================
    // CHECKBOX
    //=================================


    function activarChecks(){


        document
        .querySelectorAll(
            ".check-colaborador"
        )
        .forEach(check=>{


            check.onchange = ()=>{


                const id =
                check.dataset.id;



                if(check.checked){


                    if(
                        !seleccionados.includes(id)
                    ){

                        seleccionados.push(id);

                    }


                }

                else{


                    seleccionados =
                    seleccionados.filter(
                        item=>item!==id
                    );


                }


                actualizarAcciones();


            };


        });


    }





    function actualizarAcciones(){


        const activo =
        seleccionados.length>0;



        if(btnActivar)
        btnActivar.disabled =
        !activo;



        if(btnDesactivar)
        btnDesactivar.disabled =
        !activo;



    }






    //=================================
    // SELECCIONAR TODOS
    //=================================


    if(seleccionarTodos){


        seleccionarTodos.onchange = ()=>{


            const checks =
            document.querySelectorAll(
                ".check-colaborador"
            );



            checks.forEach(check=>{


                check.checked =
                seleccionarTodos.checked;



                const id =
                check.dataset.id;



                if(
                    seleccionarTodos.checked
                ){


                    if(
                    !seleccionados.includes(id)
                    ){

                        seleccionados.push(id);

                    }


                }

                else{


                    seleccionados =
                    [];


                }


            });



            actualizarAcciones();


        };


    }







    //=================================
    // BUSQUEDA
    //=================================


    if(buscar){


        buscar.addEventListener(
            "input",
            ()=>{

                renderizar();

            }

        );


    }



}
