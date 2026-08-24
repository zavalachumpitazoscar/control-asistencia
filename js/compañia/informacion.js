import {
    db,
    auth
}
from "../firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where,
    deleteDoc,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    getFunctions,
    httpsCallable
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

const crearUsuarioAdministradorEmpresa =
httpsCallable(
    getFunctions(undefined,"us-central1"),
    "crearUsuarioAdministradorEmpresa"
);

const gestionarUsuarioEmpresa =
httpsCallable(
    getFunctions(undefined,"us-central1"),
    "gestionarUsuarioEmpresa"
);


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

    // La vista pudo cambiar mientras terminaba la consulta asíncrona.
    // En ese caso no escribimos sobre campos que ya fueron retirados del DOM.
    if(!document.getElementById("ruc")) return;

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
const botonGuardar=document.getElementById("guardarAcceso");
const nombre=document.getElementById("nombreAcceso").value.trim();
const correo=document.getElementById("correoAcceso").value.trim();
const rol=document.getElementById("rolAcceso").value;
const empresaId=sessionStorage.getItem("empresaId");

if(!empresaId){
    await Swal.fire({icon:"error",title:"No se encontró la empresa",text:"Vuelve a cargar la página e inténtalo nuevamente.",confirmButtonColor:"#2563eb"});
    return;
}

if(!nombre||!correo){
    await Swal.fire({icon:"warning",title:"Completa los datos",text:"El nombre y el correo del nuevo usuario son obligatorios.",confirmButtonColor:"#2563eb"});
    return;
}

try{
    botonGuardar.disabled=true;
    botonGuardar.textContent="Creando usuario…";
    const respuesta=await crearUsuarioAdministradorEmpresa({empresaId,nombre,correo,rol});
    const credenciales=respuesta.data;
    modalAcceso.style.display="none";
    await Swal.fire({
        icon:"success",
        title:"Usuario administrador creado",
        html:`<div style="text-align:left;margin-top:8px"><p style="margin:0 0 14px;color:#64748b;line-height:1.5">Comparte estas credenciales de forma segura. Al ingresar, el usuario deberá cambiar su contraseña temporal.</p><label style="display:block;margin-bottom:5px;color:#475569;font-size:12px;font-weight:700">Correo de acceso</label><div id="credencialCorreoAdmin" style="padding:11px 12px;border:1px solid #dbe4f0;border-radius:10px;background:#f8fafc;color:#1e293b;overflow-wrap:anywhere"></div><label style="display:block;margin:14px 0 5px;color:#475569;font-size:12px;font-weight:700">Contraseña temporal</label><div style="display:flex;gap:8px"><input id="credencialPasswordAdmin" readonly style="min-width:0;flex:1;padding:11px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-family:monospace;font-size:15px;font-weight:700"><button id="copiarPasswordAdmin" type="button" style="padding:0 14px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer">Copiar</button></div><small id="estadoCopiaPasswordAdmin" style="display:block;min-height:18px;margin-top:7px;color:#059669"></small></div>`,
        confirmButtonText:"Listo",
        confirmButtonColor:"#2563eb",
        allowOutsideClick:false,
        didOpen:()=>{
            document.getElementById("credencialCorreoAdmin").textContent=credenciales.correo;
            document.getElementById("credencialPasswordAdmin").value=credenciales.passwordTemporal;
            document.getElementById("copiarPasswordAdmin").onclick=async()=>{
                const estado=document.getElementById("estadoCopiaPasswordAdmin");
                try{await navigator.clipboard.writeText(credenciales.passwordTemporal);}
                catch(_){const campo=document.getElementById("credencialPasswordAdmin");campo.select();document.execCommand("copy");}
                estado.textContent="✓ Contraseña copiada al portapapeles";
            };
        }
    });
}catch(error){
    console.error("No se pudo crear el usuario administrativo:",error);
    await Swal.fire({icon:"error",title:"No se pudo crear el usuario",text:error?.message||"Ocurrió un error inesperado.",confirmButtonColor:"#dc2626"});
}finally{
    botonGuardar.disabled=false;
    botonGuardar.textContent="Guardar";
}
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
        usuario.id !== auth.currentUser.uid &&
        datosUsuario.principal !== true;

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
                <div class="acciones-usuario-secundario">
                    <button
                        class="btnEstadoUsuario"
                        data-id="${usuario.id}"
                        data-estado="${datosUsuario.estado}">
                        ${datosUsuario.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                    </button>
                    <button class="btnEliminarUsuario" data-id="${usuario.id}" data-nombre="${datosUsuario.nombre||datosUsuario.correo||"Usuario"}">Eliminar</button>
                </div>
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


            await gestionarUsuarioEmpresa({uid,accion:"ESTADO",estado:nuevoEstado});


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

document.querySelectorAll(".btnEliminarUsuario").forEach(boton=>{
    boton.onclick=async()=>{
        const uid=boton.dataset.id,nombreUsuario=boton.dataset.nombre;
        const resultado=await Swal.fire({
            icon:"warning",
            title:"¿Eliminar usuario?",
            text:`Se eliminará definitivamente el acceso de ${nombreUsuario}. Esta acción no se puede deshacer.`,
            showCancelButton:true,
            confirmButtonText:"Sí, eliminar",
            cancelButtonText:"Cancelar",
            confirmButtonColor:"#dc2626",
            cancelButtonColor:"#64748b",
            reverseButtons:true
        });
        if(!resultado.isConfirmed)return;
        try{
            boton.disabled=true;
            await gestionarUsuarioEmpresa({uid,accion:"ELIMINAR"});
            await Swal.fire({icon:"success",title:"Usuario eliminado",text:"La cuenta y su acceso fueron eliminados correctamente.",confirmButtonColor:"#2563eb"});
        }catch(error){
            console.error("No se pudo eliminar el usuario:",error);
            await Swal.fire({icon:"error",title:"No se pudo eliminar",text:error?.message||"Ocurrió un error inesperado.",confirmButtonColor:"#dc2626"});
            boton.disabled=false;
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
