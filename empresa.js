import { app } from "./firebase.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const db = getFirestore(app);

const params =
new URLSearchParams(window.location.search);

const empresaId =
params.get("id");

document
.getElementById("btnCrearUsuario")
.addEventListener(
    "click",
    crearUsuario
);

cargarEmpresa();
cargarUsuarios();

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

async function crearUsuario(){

    const nombre =
    document
    .getElementById("nombreUsuario")
    .value
    .trim();

    const correo =
    document
    .getElementById("correoUsuario")
    .value
    .trim();

    const password =
    document
    .getElementById("passwordUsuario")
    .value
    .trim();

    const rol =
    document
    .getElementById("rolUsuario")
    .value;

    if(
        !nombre ||
        !correo ||
        !password
    ){
        alert(
            "Complete todos los campos"
        );
        return;
    }

    try{

        await addDoc(
            collection(
                db,
                "usuarios"
            ),
            {
                empresaId,
                nombre,
                correo,
                password,
                rol,
                estado:true,
                fechaCreacion:new Date()
            }
        );

        alert(
            "Usuario creado"
        );

        document
        .getElementById("nombreUsuario")
        .value = "";

        document
        .getElementById("correoUsuario")
        .value = "";

        document
        .getElementById("passwordUsuario")
        .value = "";

        cargarUsuarios();

    }
    catch(error){

        console.error(error);

        alert(
            "Error al crear usuario"
        );

    }

}

async function cargarUsuarios(){

    const tabla =
    document.getElementById(
        "tablaUsuarios"
    );

    tabla.innerHTML = "";

    const q =
    query(
        collection(
            db,
            "usuarios"
        ),
        where(
            "empresaId",
            "==",
            empresaId
        )
    );

    const snapshot =
    await getDocs(q);

    snapshot.forEach(doc=>{

        const usuario =
        doc.data();

        tabla.innerHTML += `
            <tr>
                <td>${usuario.nombre}</td>
                <td>${usuario.correo}</td>
                <td>${usuario.rol}</td>
            </tr>
        `;

    });

}
