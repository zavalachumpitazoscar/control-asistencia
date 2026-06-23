import { app } from "./firebase.js";

import {
    getFirestore,
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const db = getFirestore(app);

const params =
new URLSearchParams(
window.location.search
);

const empresaId =
params.get("id");

cargarEmpresa();

async function cargarEmpresa(){

    const empresaRef =
    doc(
        db,
        "empresas",
        empresaId
    );

    const empresaSnap =
    await getDoc(
        empresaRef
    );

    if(!empresaSnap.exists()){

        alert("Empresa no encontrada");

        return;

    }

    const empresa =
    empresaSnap.data();

    document.getElementById(
        "nombreEmpresa"
    ).textContent =
    empresa.razonSocial;

    document.getElementById(
        "ruc"
    ).textContent =
    empresa.ruc;

    document.getElementById(
        "correoEmpresa"
    ).textContent =
    empresa.correo;

    document.getElementById(
        "telefonoEmpresa"
    ).textContent =
    empresa.telefono;

}
