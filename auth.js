import { app } from "./firebase.js";

import {
    getAuth,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const mensaje = document.getElementById("mensaje");

    mensaje.style.color = "black";
    mensaje.innerHTML = "Validando...";

    try {

        // 🔐 LOGIN
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        const uid = userCredential.user.uid;

        // 🔎 BUSCAR USUARIO
        const q = query(
            collection(db, "usuarios"),
            where("uid", "==", uid)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            mensaje.style.color = "red";
            mensaje.innerHTML = "Usuario no registrado";
            return;
        }

        const userData = snapshot.docs[0].data();

        // 🚨 USUARIO INACTIVO
        if (!userData.estado) {
            mensaje.style.color = "red";
            mensaje.innerHTML = "Usuario pendiente de activación";
            return;
        }

        const empresaId = userData.empresaId;

        // 🔎 BUSCAR EMPRESA
        const empresaRef = await getDoc(doc(db, "empresas", empresaId));

        if (!empresaRef.exists()) {
            mensaje.style.color = "red";
            mensaje.innerHTML = "Empresa no encontrada";
            return;
        }

        const empresa = empresaRef.data();

        // 🚨 EMPRESA PENDIENTE
        if (empresa.estado === "pendiente") {
            mensaje.style.color = "orange";
            mensaje.innerHTML = "Empresa pendiente de aprobación";
            return;
        }

        if (empresa.estado === false) {
            mensaje.style.color = "red";
            mensaje.innerHTML = "Empresa inactiva";
            return;
        }

        // ✅ LOGIN OK
        mensaje.style.color = "green";
        mensaje.innerHTML = "Acceso correcto";

        window.location.href = `empresa.html?id=${empresaId}`;

    } catch (error) {

        console.error(error);

        mensaje.style.color = "red";
        mensaje.innerHTML = "Error de login";

    }

});


// =========================
// MODAL EMPRESA
// =========================

window.abrirModalEmpresa = function () {
    document.getElementById("modalEmpresa").style.display = "block";
};

window.cerrarModalEmpresa = function () {
    document.getElementById("modalEmpresa").style.display = "none";
};


// =========================
// CREAR EMPRESA PUBLICA
// =========================

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

        await addDoc(collection(db, "empresas"), {
            ruc,
            razonSocial,
            direccion,
            correo,
            telefono,
            estado: "pendiente",
            fechaCreacion: new Date()
        });

        alert("Solicitud enviada. Pendiente de aprobación.");

        cerrarModalEmpresa();

    } catch (error) {
        console.error(error);
        alert("Error al crear empresa");
    }

};
