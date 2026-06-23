import { app } from "./firebase.js";

import {
    getAuth,
    signInWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const auth = getAuth(app);

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const mensaje =
        document.getElementById("mensaje");

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        mensaje.style.color = "green";
        mensaje.innerHTML = "Acceso correcto";

        window.location.href = "dashboard.html";

    }
    catch(error){

        mensaje.style.color = "red";

        mensaje.innerHTML =
            "Correo o contraseña incorrectos";

        console.error(error);

    }

});
