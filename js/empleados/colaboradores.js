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

    let paginaActual = 1;

const registrosPorPagina = 20;


const btnEliminar =
document.getElementById(
    "btnEliminarSeleccion"
);


const btnCargaMasiva =
document.getElementById(
    "btnCargaMasiva"
);


const btnNuevo =
document.getElementById(
    "btnNuevoColaborador"
);


const modal =
document.getElementById(
    "modalColaborador"
);


const cerrar =
document.getElementById(
    "cerrarColaborador"
);




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

        const inicio =
(paginaActual-1) *
registrosPorPagina;

const fin =
inicio +
registrosPorPagina;

const pagina =
filtrados.slice(
inicio,
fin
);


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





        pagina.forEach(col=>{


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

                ${col.apellidos || "-"}

                </div>

                <div>

                ${col.nombres || "-"}

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


                    <button class="btn-editar-colaborador" data-id="${col.id}">

                        <i class="bi bi-pencil"></i>

                    </button>


                </div>



            </div>


            `;


        });



        activarChecks();

activarEditar();

renderizarPaginacion(
    filtrados.length
);


    }

function activarEditar(){

    document
    .querySelectorAll(
    ".btn-editar-colaborador")
    .forEach(btn=>{

        btn.onclick=()=>{

            console.log(
                "Editar",
                btn.dataset.id
            );

        };

    });

}

function renderizarPaginacion(total){

    const contenedor =
    document.getElementById(
        "paginacionColaboradores"
    );

    if(!contenedor) return;

    contenedor.innerHTML="";

    const paginas =
    Math.ceil(
        total /
        registrosPorPagina
    );

    for(let i=1;i<=paginas;i++){

        contenedor.innerHTML += `

        <button
        class="btn-pagina ${
        i===paginaActual
        ?"activa":""
        }"
        data-pagina="${i}">

            ${i}

        </button>

        `;

    }

    document
    .querySelectorAll(".btn-pagina")
    .forEach(btn=>{

        btn.onclick=()=>{

            paginaActual =
            Number(
                btn.dataset.pagina
            );

            renderizar();

        };

    });

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

    paginaActual = 1;

    renderizar();

}
);

    }


        // ==========================
    // BOTÓN NUEVO
    // ==========================

    if(btnNuevo){

        btnNuevo.onclick=()=>{

            modal.style.display="flex";

        };

    }


    // ==========================
    // CERRAR MODAL
    // ==========================

    if(cerrar){

        cerrar.onclick=()=>{

            modal.style.display="none";

        };

    }


    // ==========================
    // ACTIVAR
    // ==========================

    if(btnActivar){

        btnActivar.onclick=()=>{

            console.log(seleccionados);

        };

    }


    // ==========================
    // DESACTIVAR
    // ==========================

    if(btnDesactivar){

        btnDesactivar.onclick=()=>{

            console.log(seleccionados);

        };

    }


    // ==========================
    // ELIMINAR
    // ==========================

    if(btnEliminar){

        btnEliminar.onclick=()=>{

            console.log(seleccionados);

        };

    }


    // ==========================
    // CARGA MASIVA
    // ==========================

    if(btnCargaMasiva){

        btnCargaMasiva.onclick=()=>{

            Swal.fire({

                icon:"info",

                title:"Carga masiva",

                text:"Aquí se importará un archivo Excel."

            });

        };

    }

}



