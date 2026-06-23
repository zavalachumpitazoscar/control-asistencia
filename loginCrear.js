import { app } from "./firebase.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    getDocs
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

        // 🔎 1. VALIDAR RUC EXISTENTE
        const q = query(
            collection(db, "empresas"),
            where("ruc", "==", ruc)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
            alert("❌ El RUC ya está registrado");
            return;
        }

        // 🏢 2. CREAR EMPRESA
        const empresaRef = await addDoc(collection(db, "empresas"), {
            ruc,
            razonSocial,
            direccion,
            correo,
            telefono,
            estado: "pendiente",
            fechaCreacion: new Date()
        });

        // 👤 3. CREAR USUARIO EN AUTH
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            correo,
            ruc // contraseña = RUC
        );

        const uid = userCredential.user.uid;

        // 👤 4. GUARDAR USUARIO EN FIRESTORE
        await addDoc(collection(db, "usuarios"), {
            uid,
            empresaId: empresaRef.id,
            nombre: razonSocial,
            correo,
            rol: "ADMIN",
            estado: false,
            fechaCreacion: new Date()
        });

        alert("Empresa creada. Pendiente de aprobación.");

        cerrarModalEmpresa();

    } catch (error) {

        console.error(error);

        // 🚨 VALIDAR CORREO DUPLICADO EN AUTH
        if (error.code === "auth/email-already-in-use") {
            alert("❌ Este correo ya está registrado en el sistema");
            return;
        }

        alert("Error al crear empresa");
    }
};
