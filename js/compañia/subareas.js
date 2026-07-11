import {
    db
}
from "../firebase-config.js";

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    getDocs
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



export function iniciarSubareas(){

    const empresaId =
    sessionStorage.getItem("empresaId");


    if(!empresaId){

        console.error("No se encontró la empresa.");

        return;

    }


    const btnNuevaSubarea =
    document.getElementById("btnNuevaSubarea");

    const modalSubarea =
    document.getElementById("modalSubarea");

    const cerrarSubarea =
    document.getElementById("cerrarSubarea");

    const guardarSubarea =
    document.getElementById("guardarSubarea");

    const listaSubareas =
    document.getElementById("listaSubareas");

    const areaSubarea =
    document.getElementById("areaSubarea");


    let modoEdicion = false;

    let idSubareaEditando = null;



    //=========================
    // CARGAR AREAS
    //=========================

    async function cargarAreas(){

        areaSubarea.innerHTML = `

        <option value="">

            Seleccione un área

        </option>

        `;


        const consulta = query(

            collection(db,"areas"),

            where(
                "empresaId",
                "==",
                empresaId
            ),

            where(
                "estado",
                "==",
                "ACTIVA"
            )

        );


        const snapshot =
        await getDocs(consulta);


        snapshot.forEach(documento=>{

            const area =
            documento.data();


            areaSubarea.innerHTML += `

            <option
                value="${documento.id}"
                data-nombre="${area.nombre}">

                ${area.nombre}

            </option>

            `;

        });

    }



    //=========================
    // ABRIR MODAL
    //=========================

    if(btnNuevaSubarea){

        btnNuevaSubarea.onclick = async()=>{

            modoEdicion = false;

            idSubareaEditando = null;


            document.getElementById("nombreSubarea").value="";

            document.getElementById("descripcionSubarea").value="";


            await cargarAreas();

            areaSubarea.value="";


            document.querySelector("#modalSubarea h3").textContent =
            "Nueva subárea";

            guardarSubarea.textContent =
            "Guardar";


            modalSubarea.style.display="flex";

        };

    }



    //=========================
    // CERRAR MODAL
    //=========================

    if(cerrarSubarea){

        cerrarSubarea.onclick = ()=>{

            modalSubarea.style.display="none";

        };

    }



    //=========================
    // GUARDAR
    //=========================

    guardarSubarea.onclick = async()=>{

        const areaId =
        areaSubarea.value;

        const nombreArea =
        areaSubarea.options[
            areaSubarea.selectedIndex
        ]?.dataset.nombre || "";


        const nombre =
        document.getElementById("nombreSubarea")
        .value
        .trim();


        const descripcion =
        document.getElementById("descripcionSubarea")
        .value
        .trim();



        if(areaId===""){

            Swal.fire({

                icon:"warning",

                title:"Seleccione un área"

            });

            return;

        }


        if(nombre===""){

            Swal.fire({

                icon:"warning",

                title:"Ingrese un nombre para la subárea"

            });

            return;

        }



        try{

            if(!modoEdicion){

                await addDoc(

                    collection(db,"subareas"),

                    {

                        empresaId,

                        areaId,

                        nombreArea,

                        nombre,

                        descripcion,

                        estado:"ACTIVA",

                        fechaRegistro:new Date()

                    }

                );

            }

            else{

                await updateDoc(

                    doc(
                        db,
                        "subareas",
                        idSubareaEditando
                    ),

                    {

                        areaId,

                        nombreArea,

                        nombre,

                        descripcion

                    }

                );

            }


            const mensaje =
            modoEdicion
            ? "Subárea actualizada"
            : "Subárea creada";


            modoEdicion = false;

            idSubareaEditando = null;


            document.getElementById("nombreSubarea").value="";

            document.getElementById("descripcionSubarea").value="";

            areaSubarea.value="";


            modalSubarea.style.display="none";


            Swal.fire({

                icon:"success",

                title:mensaje,

                timer:1500,

                showConfirmButton:false

            });

        }

        catch(error){

            console.error(error);

            Swal.fire({

                icon:"error",

                title:"No fue posible guardar la subárea."

            });

        }

    };


    //=========================
    // LISTAR SUBAREAS
    //=========================

    const consulta =

    query(

        collection(db,"subareas"),

        where(
            "empresaId",
            "==",
            empresaId
        )

    );


    onSnapshot(

        consulta,

        (snapshot)=>{

            listaSubareas.innerHTML="";


            if(snapshot.empty){

                listaSubareas.innerHTML = `

                <div class="sin-subareas">

                    <i class="bi bi-diagram-3"></i>

                    <h3>

                        No existen subáreas

                    </h3>

                    <p>

                        Crea la primera subárea de la empresa.

                    </p>

                </div>

                `;

                return;

            }


            snapshot.forEach(documento=>{

                const subarea =
                documento.data();


                listaSubareas.innerHTML += `

                <div
                class="subarea-card">

                    <div class="subarea-header">

                        <div>

                            <h3>

                                ${subarea.nombre}

                            </h3>

                            <span class="badge-estado ${
                                subarea.estado==="ACTIVA"
                                ? "activa"
                                : "inactiva"
                            }">

                                ${subarea.estado}

                            </span>

                        </div>

                    </div>


                    <div class="area-padre">

                        <i class="bi bi-diagram-2"></i>

                        ${subarea.nombreArea}

                    </div>


                    <div class="subarea-descripcion">

                        ${
                            subarea.descripcion
                            ?
                            subarea.descripcion
                            :
                            "Sin descripción."
                        }

                    </div>


                    <div class="subarea-footer">

                        <div class="total-colaboradores">

                            <i class="bi bi-people"></i>

                            0 colaboradores

                        </div>


                        <div class="acciones-subarea">

                            <button

                                class="btnEditarSubarea"

                                data-id="${documento.id}"

                                data-areaid="${subarea.areaId}"

                                data-nombre="${subarea.nombre}"

                                data-descripcion="${subarea.descripcion || ""}">

                                <i class="bi bi-pencil-square"></i>

                                Editar

                            </button>


                            <button

                                class="btnEstadoSubarea"

                                data-id="${documento.id}"

                                data-estado="${subarea.estado}">

                                <i class="bi ${
                                    subarea.estado==="ACTIVA"
                                    ? "bi-lock-fill"
                                    : "bi-unlock-fill"
                                }"></i>

                                ${
                                    subarea.estado==="ACTIVA"
                                    ? "Desactivar"
                                    : "Activar"
                                }

                            </button>

                        </div>

                    </div>

                </div>

                `;

            });



            //=========================
            // BOTONES EDITAR
            //=========================

            document

            .querySelectorAll(".btnEditarSubarea")

            .forEach(boton=>{

                boton.onclick = async()=>{

                    modoEdicion = true;

                    idSubareaEditando =
                    boton.dataset.id;


                    await cargarAreas();


                    areaSubarea.value =
                    boton.dataset.areaid;


                    document.querySelector("#modalSubarea h3").textContent =
                    "Editar subárea";


                    guardarSubarea.textContent =
                    "Actualizar";


                    document.getElementById("nombreSubarea").value =
                    boton.dataset.nombre;


                    document.getElementById("descripcionSubarea").value =
                    boton.dataset.descripcion;


                    modalSubarea.style.display="flex";

                };

            });

                    //=========================
            // ACTIVAR / DESACTIVAR
            //=========================

            document
            .querySelectorAll(".btnEstadoSubarea")
            .forEach(boton=>{

                boton.onclick = async()=>{

                    const id =
                    boton.dataset.id;

                    const estadoActual =
                    boton.dataset.estado;

                    const nuevoEstado =
                    estadoActual === "ACTIVA"
                    ? "INACTIVA"
                    : "ACTIVA";


                    const respuesta =
                    await Swal.fire({

                        title:
                        estadoActual === "ACTIVA"
                        ?
                        "¿Desactivar subárea?"
                        :
                        "¿Activar subárea?",

                        text:
                        estadoActual === "ACTIVA"
                        ?
                        "Los colaboradores ya no podrán ser asignados a esta subárea."
                        :
                        "La subárea volverá a estar disponible.",

                        icon:
                        estadoActual === "ACTIVA"
                        ? "warning"
                        : "question",

                        showCancelButton:true,

                        confirmButtonText:
                        estadoActual === "ACTIVA"
                        ? "Sí, desactivar"
                        : "Sí, activar",

                        cancelButtonText:"Cancelar",

                        confirmButtonColor:
                        estadoActual === "ACTIVA"
                        ? "#dc2626"
                        : "#16a34a",

                        cancelButtonColor:"#64748b",

                        reverseButtons:true

                    });


                    if(!respuesta.isConfirmed){

                        return;

                    }


                    try{

                        await updateDoc(

                            doc(
                                db,
                                "subareas",
                                id
                            ),

                            {

                                estado:nuevoEstado

                            }

                        );


                        await Swal.fire({

                            icon:"success",

                            title:
                            nuevoEstado==="ACTIVA"
                            ?
                            "Subárea activada"
                            :
                            "Subárea desactivada",

                            text:
                            nuevoEstado==="ACTIVA"
                            ?
                            "La subárea ya puede utilizarse nuevamente."
                            :
                            "La subárea fue desactivada correctamente.",

                            timer:1800,

                            showConfirmButton:false

                        });

                    }

                    catch(error){

                        console.error(error);

                        Swal.fire({

                            icon:"error",

                            title:"Ocurrió un error",

                            text:"No fue posible actualizar la subárea."

                        });

                    }

                };

            });



            //=========================
            // VER COLABORADORES
            // (POR IMPLEMENTAR)
            //=========================

            document
            .querySelectorAll(".total-colaboradores")
            .forEach(boton=>{

                boton.onclick = ()=>{

                    Swal.fire({

                        icon:"info",

                        title:"Próximamente",

                        text:"Aquí se mostrarán los colaboradores de la subárea."

                    });

                };

            });

        }

    );

}
