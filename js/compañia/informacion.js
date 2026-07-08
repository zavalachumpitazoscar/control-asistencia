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
    addDoc
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

creado:new Date()

});


alert("Usuario creado");


modalAcceso.style.display="none";


};



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

    (datos.representantes || []).forEach(rep=>{

        lista.innerHTML += `

        <div class="representante-card">

        <h4>${rep.nombre}</h4>

        <p><strong>Cargo:</strong> ${rep.cargo}</p>

        <p><strong>DNI:</strong> ${rep.dni}</p>

        <p><strong>Correo:</strong> ${rep.correo}</p>

        <p><strong>Teléfono:</strong> ${rep.telefono}</p>

        </div>

        `;

    });

}

    (datos.representantes || []).forEach(rep=>{

        lista.innerHTML +=

        `
<div class="representante-card">

<h4>${rep.nombre}</h4>

<p><strong>Cargo:</strong> ${rep.cargo}</p>

<p><strong>DNI:</strong> ${rep.dni}</p>

<p><strong>Correo:</strong> ${rep.correo}</p>

<p><strong>Teléfono:</strong> ${rep.telefono}</p>

</div>
        `;

    });


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
