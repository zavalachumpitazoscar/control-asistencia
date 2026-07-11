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
    deleteDoc
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

const usuarioActual =
    auth.currentUser;

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


            alert("Representante agregado correctamente");


            if(modalRepresentante){

                modalRepresentante.style.display="none";

            }


            location.reload();


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



    const usuarios =
    await getDocs(consulta);

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

        const mensaje =
            estadoActual === "ACTIVO"
            ?
            "¿Desea desactivar este usuario?\n\nNo podrá volver a iniciar sesión hasta que sea activado nuevamente."
            :
            "¿Desea volver a activar este usuario?";

        if(!confirm(mensaje))
            return;

        try{

            await updateDoc(
                doc(db,"usuarios",uid),
                {
                    estado:nuevoEstado
                }
            );

            alert(
                nuevoEstado === "ACTIVO"
                ?
                "Usuario activado correctamente."
                :
                "Usuario desactivado correctamente."
            );

            location.reload();

        }

        catch(error){

            console.error(error);

            alert("Ocurrió un error.");

        }

    };

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

const lista =
document.getElementById("listaRepresentantes");


if(lista){

    lista.innerHTML = "";

(datos.representantes || []).forEach((rep, indice)=>{

    lista.innerHTML += `

    <div class="representante-card">

        <div class="representante-header">

            <h4>${rep.nombre}</h4>

            <button class="btnEliminarRepresentante" data-index="${indice}" title="Eliminar representante">
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

    boton.onclick = async()=>{

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

            const indice =
            Number(
                boton.dataset.index
            );

            const representantes =
            [...(datos.representantes || [])];

            representantes.splice(indice,1);

            await updateDoc(
                referencia,
                {
                    representantes
                }
            );

            await Swal.fire({

                icon:"success",

                title:"Representante eliminado",

                text:"El representante fue eliminado correctamente.",

                timer:1800,

                showConfirmButton:false

            });

            location.reload();

        }

        catch(error){

            console.error(error);

            await Swal.fire({

                icon:"error",

                title:"Ocurrió un error",

                text:"No fue posible eliminar el representante."

            });

        }

    };

});
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

            alert("Información actualizada correctamente.");

        }

        catch(error){

            console.error(error);

            alert("Ocurrió un error al guardar.");

        }

    };

}
