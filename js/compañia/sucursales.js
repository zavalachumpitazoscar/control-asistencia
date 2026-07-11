import {
    db
}
from "../firebase-config.js";

import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot
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


    //=========================
    // ABRIR MODAL
    //=========================

    if(btnNuevaSucursal){

        btnNuevaSucursal.onclick = ()=>{

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


            document.getElementById("nombreSucursal").value="";

            document.getElementById("direccionSucursal").value="";

            document.getElementById("departamentoSucursal").value="";

            document.getElementById("provinciaSucursal").value="";

            document.getElementById("distritoSucursal").value="";


            modalSucursal.style.display="none";


            Swal.fire({

                icon:"success",

                title:"Sucursal creada",

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

                            <span class="badge-estado">

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

                        <div
                        class="total-colaboradores">

                            <i class="bi bi-people"></i>

                            0 colaboradores

                        </div>

                        <button
                        class="btn-ver">

                            Ver

                        </button>

                    </div>

                </div>

                `;

            });

        }

    );

}
