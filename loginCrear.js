import { app } from "./firebase.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

window.crearEmpresaPublica = async function () {

    const ruc = document.getElementById("rucEmpresa").value.trim();
    const razonSocial = document.getElementById("razonSocialEmpresa").value.trim();
    const direccion = document.getElementById("direccionEmpresa").value.trim();
    const correo = document.getElementById("correoEmpresa").value.trim();
    const telefono = document.getElementById("telefonoEmpresa").value.trim();

    if (!ruc || !razonSocial || !correo) {
        alert("Complete los campos");
        return;
    }

    try {

        // 🏢 1. CREAR EMPRESA
        const empresaRef = await addDoc(collection(db, "empresas"), {
            ruc,
            razonSocial,
            direccion,
            correo,
            telefono,
            estado: "pendiente",
            fechaCreacion: new Date()
        });

        // 👤 2. CREAR USUARIO EN AUTH (ADMIN POR DEFECTO)
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            correo,
            ruc // contraseña = RUC (como pediste)
        );

        const uid = userCredential.user.uid;

        // 👤 3. GUARDAR USUARIO EN FIRESTORE
        await addDoc(collection(db, "usuarios"), {
            uid,
            empresaId: empresaRef.id,
            nombre: razonSocial,
            correo,
            rol: "ADMIN",
            estado: false, // 🔴 pendiente de activación
            ultimoAcceso: null,
            fechaCreacion: new Date()
        });

        alert("Empresa creada. Pendiente de aprobación.");

        cerrarModalEmpresa();

    } catch (error) {
        console.error("ERROR:", error);
        alert(error.message);
    }
};
