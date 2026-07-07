import {
    signInWithEmailAndPassword,
    signOut
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase-config.js";

const btnLogin = document.getElementById("btnLogin");

const toast =
    document.getElementById("toast");

function mostrarToast(tipo,mensaje){

    toast.className="toast "+tipo;

    toast.textContent=mensaje;

    toast.classList.add("mostrar");

    setTimeout(()=>{

        toast.classList.remove("mostrar");

    },3000);

}

function mostrarCarga(texto = "Ingresando...") {

    btnLogin.classList.add("cargando");

    btnLogin.innerHTML = texto;

    btnLogin.disabled = true;

}

function ocultarCarga() {

    btnLogin.classList.remove("cargando");

    btnLogin.innerHTML = "Ingresar";

    btnLogin.disabled = false;

}

btnLogin.addEventListener("click", async () => {

    mostrarCarga();

    const correo =
        document.getElementById("correo").value;

    const password =
        document.getElementById("password").value;

    if(
    correo.trim()==="" ||
    password.trim()===""
){

    ocultarCarga();

    mostrarToast(
        "error",
        "Ingresa tu correo y contraseña."
    );

    return;

}

    try {

        const credencial =
            await signInWithEmailAndPassword(
                auth,
                correo,
                password
            );

        const uid = credencial.user.uid;

        const usuarioRef =
            doc(db, "usuarios", uid);

        const usuarioSnap =
            await getDoc(usuarioRef);

        if (!usuarioSnap.exists()) {
            
            ocultarCarga();

            alert("Usuario no encontrado");

            await signOut(auth);

            return;
        }

        const usuario =
            usuarioSnap.data();

if (usuario.estado !== "ACTIVO") {

    ocultarCarga();

    mostrarToast(
        "info",
        "Tu cuenta está registrada, pero aún no ha sido activada por el administrador."
    );

    await signOut(auth);

    return;
}

        if (usuario.rol === "ADMIN") {
        window.location.href = "admin.html";
        } else {
        window.location.href = "cliente.html";
        }

        // luego aquí irá cliente.html o admin.html

    }
catch(error){

    ocultarCarga();

    if(
        error.code==="auth/invalid-credential" ||
        error.code==="auth/wrong-password" ||
        error.code==="auth/user-not-found"
    ){

        mostrarToast(
            "error",
            "Correo o contraseña incorrectos."
        );

    }else if(error.code==="auth/invalid-email"){

        mostrarToast(
            "error",
            "Correo electrónico inválido."
        );

    }else{

        mostrarToast(
            "error",
            "Ocurrió un error. Inténtalo nuevamente."
        );

    }

}

});
