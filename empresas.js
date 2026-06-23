import { app } from "./firebase.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const db = getFirestore(app);

const btnGuardar =
document.getElementById("btnGuardar");

btnGuardar.addEventListener(
    "click",
    guardarEmpresa
);

async function guardarEmpresa(){

    const ruc =
    document.getElementById("ruc").value;

    const razonSocial =
    document.getElementById("razonSocial").value;

    const direccion =
    document.getElementById("direccion").value;

    const correo =
    document.getElementById("correo").value;

    const telefono =
    document.getElementById("telefono").value;

    try{

        await addDoc(
            collection(db,"empresas"),
            {
                ruc,
                razonSocial,
                direccion,
                correo,
                telefono,
                estado:true,
                fechaCreacion:new Date()
            }
        );

        alert("Empresa guardada");

        cargarEmpresas();

    }
    catch(error){

        console.error(error);

        alert("Error al guardar");

    }

}

async function cargarEmpresas(){

    const tabla =
    document.getElementById("tablaEmpresas");

    tabla.innerHTML = "";

    const snapshot =
    await getDocs(
        collection(db,"empresas")
    );

    snapshot.forEach(doc=>{

        const empresa = doc.data();

        tabla.innerHTML += `
            <tr>
                <td>${empresa.ruc}</td>
                <td>${empresa.razonSocial}</td>
                <td>${empresa.correo}</td>
                <td>
                    ${empresa.estado ? "Activo" : "Inactivo"}
                </td>
            </tr>
        `;

    });

}

cargarEmpresas();
