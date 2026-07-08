import {
    db
}
from "../firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



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

// Se implementará en el siguiente paso.


    //=========================
    // REPRESENTANTES
    //=========================

    const lista =
        document.getElementById("listaRepresentantes");

    lista.innerHTML = "";

    (datos.representantes || []).forEach(rep=>{

        lista.innerHTML +=

        `
        <div class="representante-card">

            <h4>${rep.nombre}</h4>

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
