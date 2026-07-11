import {
    db,
    auth
}
from "../firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    collection,
    getDocs,
    query,
    where,
    deleteDoc,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    createUserWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


export async function iniciarInformacion(){
    

    const empresaId =
        sessionStorage.getItem("empresaId");

    if(!empresaId){

        console.error("No se encontró el empresaId.");

        return;

    }

    const referencia =
        doc(
            db,
            "companias",
            empresaId
        );

    const documento =
        await getDoc(referencia);

    if(!documento.exists()){

        console.error("No existe la empresa.");

        return;

    }

    const datos =
        documento.data();


const usuarioActual = auth.currentUser;

if(!usuarioActual){

    console.error("No hay usuario autenticado.");

    return;

}

const documentoUsuario =
    await getDoc(
        doc(
            db,
            "usuarios",
            usuarioActual.uid
        )
    );

const datosUsuarioActual =
    documentoUsuario.data();

const esAdministrador =
    datosUsuarioActual?.rol === "ADMINISTRADOR";

const listaRepresentantes =
document.getElementById("listaRepresentantes");

    
function renderizarRepresentantes(){

    if(!listaRepresentantes)
        return;

    listaRepresentantes.innerHTML="";

    (datos.representantes || []).forEach((rep,indice)=>{

        listaRepresentantes.innerHTML +=`

        <div
            class="representante-card"
            id="representante-${indice}">

            <div class="representante-header">

                <h4>${rep.nombre}</h4>

                <button
                    class="btnEliminarRepresentante"
                    data-index="${indice}"
                    title="Eliminar representante">

                    <i class="bi bi-trash"></i>

                </button>

            </div>

            <p><strong>Cargo:</strong> ${rep.cargo}</p>

            <p><strong>DNI:</strong> ${rep.dni}</p>

            <p><strong>Correo:</strong> ${rep.correo}</p>

            <p><strong>Teléfono:</strong> ${rep.telefono}</p>

        </div>

        `;

    });

    document
    .querySelectorAll(".btnEliminarRepresentante")
    .forEach(boton=>{

        boton.onclick = eliminarRepresentante;

    });

}
renderizarRepresentantes();

async function eliminarRepresentante(e){

    const boton =
    e.currentTarget;

    const indice =
    Number(
        boton.dataset.index
    );

    const resultado =
    await Swal.fire({

        title:"¿Eliminar representante?",

        text:"Esta acción no se puede deshacer.",

        icon:"warning",

        showCancelButton:true,

        confirmButtonText:"Sí, eliminar",

        cancelButtonText:"Cancelar",

        confirmButtonColor:"#dc2626",

        cancelButtonColor:"#64748b",

        reverseButtons:true

    });

    if(!resultado.isConfirmed)
        return;

    try{

        datos.representantes.splice(indice,1);

        await updateDoc(
            referencia,
            {
                representantes:
                datos.representantes
            }
        );

        renderizarRepresentantes();

        await Swal.fire({

            icon:"success",

            title:"Representante eliminado",

            timer:1500,

            showConfirmButton:false

        });

    }

    catch(error){

        console.error(error);

        Swal.fire({

            icon:"error",

            title:"No fue posible eliminar."

        });

    }

}

    const btnNuevoRepresentante =
document.getElementById("btnNuevoRepresentante");


const modalRepresentante =
document.getElementById("modalRepresentante");


const cerrarRepresentante =
document.getElementById("cerrarRepresentante");


const guardarRepresentante =
document.getElementById("guardarRepresentante");


if(guardarRepresentante){

    guardarRepresentante.onclick = async()=>{


        const nuevoRepresentante = {

            nombre:
            document.getElementById("nombreRepresentante").value.trim(),

            dni:
            document.getElementById("dniRepresentante").value.trim(),

            correo:
            document.getElementById("correoRepresentante").value.trim(),

            telefono:
            document.getElementById("telefonoRepresentante").value.trim(),

            cargo:
            document.getElementById("cargoRepresentante").value.trim()

        };


        const representantes =
        datos.representantes || [];


        representantes.push(nuevoRepresentante);


        try{


            await updateDoc(
                referencia,
                {
                    representantes
                }
            );

            datos.representantes = representantes;

renderizarRepresentantes();

document.getElementById("nombreRepresentante").value = "";

document.getElementById("dniRepresentante").value = "";

document.getElementById("correoRepresentante").value = "";

document.getElementById("telefonoRepresentante").value = "";

document.getElementById("cargoRepresentante").value = "";

modalRepresentante.style.display="none";


            await Swal.fire({

            icon:"success",

            title:"Representante agregado",

            timer:1400,

            showConfirmButton:false

            });


            if(modalRepresentante){

                modalRepresentante.style.display="none";

            }


        }


        catch(error){

            console.error(error);

            alert("Error al guardar representante");

        }


    };

}

    //=========================
    // EMPRESA
    //=========================

    document.getElementById("ruc").value =
        datos.empresa?.ruc || "";

    document.getElementById("razonSocial").value =
        datos.empresa?.razonSocial || "";

    document.getElementById("giro").value =
        datos.empresa?.giro || "";


    //=========================
    // UBICACIÓN
    //=========================

    document.getElementById("direccion").value =
        datos.ubicacion?.direccion || "";

    document.getElementById("departamento").value =
        datos.ubicacion?.departamento || "";

    document.getElementById("provincia").value =
        datos.ubicacion?.provincia || "";

    document.getElementById("distrito").value =
        datos.ubicacion?.distrito || "";

    document.getElementById("pais").value =
        datos.ubicacion?.pais || "";

    document.getElementById("codigoPostal").value =
        datos.ubicacion?.codigoPostal || "";


//=========================
// ACCESOS AL SISTEMA
//=========================

const btnNuevoAcceso =
document.getElementById("btnNuevoAcceso");


const modalAcceso =
document.getElementById("modalAcceso");


const cerrarAcceso =
document.getElementById("cerrarAcceso");



if(btnNuevoAcceso && modalAcceso){

    btnNuevoAcceso.onclick = ()=>{

        modalAcceso.style.display="flex";

    };

}



if(cerrarAcceso && modalAcceso){

    cerrarAcceso.onclick = ()=>{

        modalAcceso.style.display="none";

    };

}


document.getElementById("guardarAcceso")
.onclick = async ()=>{


const nombre =
document.getElementById("nombreAcceso").value;


const correo =
document.getElementById("correoAcceso").value;


const rol =
document.getElementById("rolAcceso").value;



const empresaId =
    sessionStorage.getItem("empresaId");


if(!empresaId){

    alert("No se encontró la empresa");

    return;

}



const passwordTemporal =
"123456";


const nuevoUsuario =
await createUserWithEmailAndPassword(
auth,
correo,
passwordTemporal
);



await setDoc(
doc(db,"usuarios",nuevoUsuario.user.uid),
{

nombre,

correo,

rol,

estado:"ACTIVO",

empresaId,

fechaRegistro:new Date()

});


alert("Usuario creado");


modalAcceso.style.display="none";


};

//=========================
// LISTAR ACCESOS
//=========================


const listaAccesos =
document.getElementById("listaAccesos");


if(listaAccesos){


    listaAccesos.innerHTML = "";


    const consulta =
    query(
        collection(db,"usuarios"),
        where(
            "empresaId",
            "==",
            empresaId
        )
    );

onSnapshot(
    consulta,
    (usuarios)=>{

        listaAccesos.innerHTML="";


        usuarios.forEach(usuario=>{

    const datosUsuario =
        usuario.data();

    const puedeAdministrar =
        esAdministrador &&
        usuario.id !== auth.currentUser.uid;

    listaAccesos.innerHTML +=
    `

    <div class="acceso-card">

        <div class="acceso-header">

            <div>

                <h4>${datosUsuario.nombre}</h4>

                <p>
                    <strong>Correo:</strong>
                    ${datosUsuario.correo || "No registrado"}
                </p>

                <p>
                    <strong>Rol:</strong>
                    ${datosUsuario.rol}
                </p>

                <p>
                    <strong>Estado:</strong>
                    ${datosUsuario.estado}
                </p>

            </div>

            ${
                puedeAdministrar
                ?
                `
                <button
                    class="btnEstadoUsuario"
                    data-id="${usuario.id}"
                    data-estado="${datosUsuario.estado}">
                    ${
                        datosUsuario.estado === "ACTIVO"
                        ? "Desactivar"
                        : "Activar"
                    }
                </button>
                `
                :
                ""
            }

        </div>

    </div>

    `;

});

document
.querySelectorAll(".btnEstadoUsuario")
.forEach(boton=>{

    boton.onclick = async()=>{

        const uid =
            boton.dataset.id;

        const estadoActual =
            boton.dataset.estado;

        const nuevoEstado =
            estadoActual === "ACTIVO"
            ? "INACTIVO"
            : "ACTIVO";


        const resultado =
        await Swal.fire({

            title:
            estadoActual === "ACTIVO"
            ? "¿Desactivar usuario?"
            : "¿Activar usuario?",


            text:
            estadoActual === "ACTIVO"
            ?
            "El usuario no podrá iniciar sesión hasta que sea activado nuevamente."
            :
            "El usuario podrá volver a ingresar al sistema.",


            icon:
            estadoActual === "ACTIVO"
            ? "warning"
            : "question",


            showCancelButton:true,


            confirmButtonText:
            estadoActual === "ACTIVO"
            ?
            "Sí, desactivar"
            :
            "Sí, activar",


            cancelButtonText:"Cancelar",


            confirmButtonColor:
            estadoActual === "ACTIVO"
            ?
            "#dc2626"
            :
            "#16a34a",


            cancelButtonColor:"#64748b",


            reverseButtons:true

        });


        if(!resultado.isConfirmed)
            return;


        try{


            await updateDoc(

                doc(
                    db,
                    "usuarios",
                    uid
                ),

                {
                    estado:nuevoEstado
                }

            );


            await Swal.fire({

                icon:"success",

                title:
                nuevoEstado === "ACTIVO"
                ?
                "Usuario activado"
                :
                "Usuario desactivado",


                text:
                nuevoEstado === "ACTIVO"
                ?
                "El usuario puede ingresar nuevamente."
                :
                "El acceso fue bloqueado correctamente.",


                timer:1800,

                showConfirmButton:false

            });

        }


        catch(error){


            console.error(error);


            Swal.fire({

                icon:"error",

                title:"Ocurrió un error",

                text:"No fue posible actualizar el usuario."

            });


        }


    };

    });

    }); 


} 


    //=========================
    // REPRESENTANTES
    //=========================

if(btnNuevoRepresentante && modalRepresentante){

    btnNuevoRepresentante.onclick = ()=>{

        modalRepresentante.style.display="flex";

    };

}



if(cerrarRepresentante && modalRepresentante){

    cerrarRepresentante.onclick = ()=>{

        modalRepresentante.style.display="none";

    };

}





//=========================
// GUARDAR
//=========================

document
    .getElementById("btnGuardarEmpresa")
    .onclick = async()=>{

    try{

        await updateDoc(referencia,{

            empresa:{

                ruc:
                    document.getElementById("ruc").value.trim(),

                razonSocial:
                    document.getElementById("razonSocial").value.trim(),

                giro:
                    document.getElementById("giro").value.trim()

            },

            ubicacion:{

                direccion:
                    document.getElementById("direccion").value.trim(),

                departamento:
                    document.getElementById("departamento").value.trim(),

                provincia:
                    document.getElementById("provincia").value.trim(),

                distrito:
                    document.getElementById("distrito").value.trim(),

                pais:
                    document.getElementById("pais").value.trim(),

                codigoPostal:
                    document.getElementById("codigoPostal").value.trim()

            }

        });

        Swal.fire({
            icon: "success",
            title: "¡Guardado!",
            text: "La información de la empresa se actualizó correctamente.",
            confirmButtonColor: "#2563eb"
        });

    }

    catch(error){

        console.error(error);

        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Ocurrió un error al guardar la información.",
            confirmButtonColor: "#dc2626"
        });

    }

};
}
