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
    getDocs
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

        // 🔐 1. LOGIN EN FIREBASE AUTH
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        const uid = userCredential.user.uid;

        // 🔎 2. BUSCAR USUARIO EN FIRESTORE
        const q = query(
            collection(db, "usuarios"),
            where("uid", "==", uid)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            mensaje.style.color = "red";
            mensaje.innerHTML = "Usuario no registrado en sistema";
            return;
        }

        const userData = snapshot.docs[0].data();
        const empresaId = userData.empresaId;

        if (!empresaId) {
            mensaje.style.color = "red";
            mensaje.innerHTML = "Usuario sin empresa asignada";
            return;
        }

        // ✅ 3. LOGIN OK
        mensaje.style.color = "green";
        mensaje.innerHTML = "Acceso correcto";

        console.log("Empresa encontrada:", empresaId);

        // 🚀 4. REDIRECCIÓN DINÁMICA
        window.location.href = `empresa.html?id=${empresaId}`;

    } catch (error) {

        console.error(error);

        mensaje.style.color = "red";
        mensaje.innerHTML = "Correo o contraseña incorrectos";

    }

});
