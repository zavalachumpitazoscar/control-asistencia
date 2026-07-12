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
    getDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


export function iniciarSucursales(){

    const empresaId =
    sessionStorage.getItem("empresaId");

    if(!empresaId){

        console.error("No se encontró la empresa.");

        return;

    }


    const btnNuevaSucursal =
    document.getElementById("btnNuevaSucursal");

    const modalSucursal =
    document.getElementById("modalSucursal");

    const cerrarSucursal =
    document.getElementById("cerrarSucursal");

    const guardarSucursal =
    document.getElementById("guardarSucursal");

    const listaSucursales =
    document.getElementById("listaSucursales");

    let modoEdicion = false;

    let idSucursalEditando = null;


    //=========================
    // ABRIR MODAL
    //=========================

if(btnNuevaSucursal){

    btnNuevaSucursal.onclick = ()=>{

        modoEdicion = false;

        idSucursalEditando = null;

        document.getElementById("nombreSucursal").value="";

        document.getElementById("direccionSucursal").value="";

        document.getElementById("departamentoSucursal").value="";

        document.getElementById("provinciaSucursal").value="";

        document.getElementById("distritoSucursal").value="";

        document.querySelector("#modalSucursal h3").textContent =
        "Nueva sucursal";

        guardarSucursal.textContent =
        "Guardar";

        modalSucursal.style.display="flex";

    };

}


    if(cerrarSucursal){

        cerrarSucursal.onclick = ()=>{

            modalSucursal.style.display="none";

        };

    }


    //=========================
    // GUARDAR
    //=========================

    guardarSucursal.onclick = async()=>{

        const nombre =
        document.getElementById("nombreSucursal").value.trim();

        const direccion =
        document.getElementById("direccionSucursal").value.trim();

        const departamento =
        document.getElementById("departamentoSucursal").value.trim();

        const provincia =
        document.getElementById("provinciaSucursal").value.trim();

        const distrito =
        document.getElementById("distritoSucursal").value.trim();


        if(nombre===""){

            Swal.fire({

                icon:"warning",

                title:"Ingrese un nombre para la sucursal"

            });

            return;

        }


try{

    if(!modoEdicion){

        await addDoc(

            collection(db,"sucursales"),

            {

                empresaId,

                nombre,

                direccion,

                departamento,

                provincia,

                distrito,

                estado:"ACTIVA",

                fechaRegistro:new Date()

            }

        );

    }

    else{

        await updateDoc(

            doc(
                db,
                "sucursales",
                idSucursalEditando
            ),

            {

                nombre,

                direccion,

                departamento,

                provincia,

                distrito

            }

        );

    }


    document.getElementById("nombreSucursal").value="";

    document.getElementById("direccionSucursal").value="";

    document.getElementById("departamentoSucursal").value="";

    document.getElementById("provinciaSucursal").value="";

    document.getElementById("distritoSucursal").value="";


const mensaje =
modoEdicion
? "Sucursal actualizada"
: "Sucursal creada";


modoEdicion = false;

idSucursalEditando = null;


modalSucursal.style.display="none";


Swal.fire({

    icon:"success",

    title: mensaje,

    timer:1500,

    showConfirmButton:false

});

    
}

        catch(error){

            console.error(error);

            Swal.fire({

                icon:"error",

                title:"No fue posible crear la sucursal."

            });

        }

    };


    //=========================
    // LISTAR
    //=========================

    const consulta =

    query(

        collection(db,"sucursales"),

        where(
            "empresaId",
            "==",
            empresaId
        )

    );


    onSnapshot(

        consulta,

        (snapshot)=>{

            listaSucursales.innerHTML="";


            if(snapshot.empty){

                listaSucursales.innerHTML=`

                <div class="sin-sucursales">

                    <i class="bi bi-building"></i>

                    <h3>

                        No existen sucursales

                    </h3>

                    <p>

                        Crea la primera sucursal de la empresa.

                    </p>

                </div>

                `;

                return;

            }


            snapshot.forEach(documento=>{

                const sucursal =
                documento.data();


                listaSucursales.innerHTML +=`

                <div
                class="sucursal-card">

                    <div class="sucursal-header">

                        <div>

                            <h3>

                                ${sucursal.nombre}

                            </h3>

                            <span class="badge-estado ${
                            sucursal.estado === "ACTIVA"
                            ? "activa"
                            : "inactiva"
                            }">

                            ${sucursal.estado}

                            </span>

                        </div>

                    </div>


                    <div class="sucursal-info">

                        <p>

                            <i class="bi bi-geo-alt"></i>

                            ${sucursal.direccion}

                        </p>

                        <p>

                            <i class="bi bi-map"></i>

                            ${sucursal.departamento}

                            /

                            ${sucursal.provincia}

                            /

                            ${sucursal.distrito}

                        </p>

                    </div>


<div class="sucursal-footer">

    <button class="btnColaboradoresArea" data-id="${documento.id}">

    <i class="bi bi-people"></i>

    0 colaboradores

    </button>

    <div class="acciones-sucursal">

        <button
            class="btnEditarSucursal"
            data-id="${documento.id}"
            data-nombre="${sucursal.nombre}"
            data-direccion="${sucursal.direccion}"
            data-departamento="${sucursal.departamento}"
            data-provincia="${sucursal.provincia}"
            data-distrito="${sucursal.distrito}">

            <i class="bi bi-pencil-square"></i>

            Editar

        </button>

        <button
            class="btnEstadoSucursal"
            data-id="${documento.id}"
            data-estado="${sucursal.estado}">

            <i class="bi ${
                sucursal.estado==="ACTIVA"
                ? "bi-lock-fill"
                : "bi-unlock-fill"
            }"></i>

            ${
                sucursal.estado==="ACTIVA"
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
.querySelectorAll(".btnEditarSucursal")
.forEach(boton=>{

    boton.onclick = ()=>{

        modoEdicion = true;

        idSucursalEditando =
        boton.dataset.id;

        document.querySelector("#modalSucursal h3").textContent =
        "Editar sucursal";

        guardarSucursal.textContent =
        "Actualizar";

        document.getElementById("nombreSucursal").value =
        boton.dataset.nombre;

        document.getElementById("direccionSucursal").value =
        boton.dataset.direccion;

        document.getElementById("departamentoSucursal").value =
        boton.dataset.departamento;

        document.getElementById("provinciaSucursal").value =
        boton.dataset.provincia;

        document.getElementById("distritoSucursal").value =
        boton.dataset.distrito;

        modalSucursal.style.display="flex";

    };

});

            //=========================
// ACTIVAR / DESACTIVAR
//=========================

document
.querySelectorAll(".btnEstadoSucursal")
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
            "¿Desactivar sucursal?"
            :
            "¿Activar sucursal?",

            text:
            estadoActual === "ACTIVA"
            ?
            "Los colaboradores ya no podrán ser asignados a esta sucursal."
            :
            "La sucursal volverá a estar disponible.",

            icon:
            estadoActual === "ACTIVA"
            ?
            "warning"
            :
            "question",

            showCancelButton:true,

            confirmButtonText:
            estadoActual === "ACTIVA"
            ?
            "Sí, desactivar"
            :
            "Sí, activar",

            cancelButtonText:"Cancelar",

            confirmButtonColor:
            estadoActual === "ACTIVA"
            ?
            "#dc2626"
            :
            "#16a34a",

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
                    "sucursales",
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
                "Sucursal activada"
                :
                "Sucursal desactivada",

                text:
                nuevoEstado==="ACTIVA"
                ?
                "La sucursal ya puede utilizarse nuevamente."
                :
                "La sucursal fue desactivada correctamente.",

                timer:1800,

                showConfirmButton:false

            });

        }

        catch(error){

            console.error(error);

            Swal.fire({

                icon:"error",

                title:"Ocurrió un error",

                text:"No fue posible actualizar la sucursal."

            });

        }

    };

});

        }

    );

}
