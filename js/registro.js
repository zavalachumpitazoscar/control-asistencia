import {
    createUserWithEmailAndPassword,
    deleteUser
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    auth,
    db
}
from "./firebase-config.js";

const btnRegistrar =
    document.getElementById("btnRegistrar");

const toast =
    document.getElementById("toast");

function mostrarToast(tipo, mensaje) {

    toast.className = "toast " + tipo;
    toast.textContent = mensaje;
    toast.classList.add("mostrar");

    setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 3000);

}

btnRegistrar.addEventListener("click", async () => {

    const nombre =
        document.getElementById("nombre").value.trim();

    const correo =
        document.getElementById("correo").value.trim();

    const password =
        document.getElementById("password").value.trim();

    if (!nombre || !correo || !password) {

        mostrarToast(
            "error",
            "Completa todos los campos."
        );

        return;
    }

    btnRegistrar.disabled = true;
    btnRegistrar.classList.add("cargando");
    btnRegistrar.innerHTML = "Registrando...";

    let credencial = null;

    try {

        // Crear usuario en Authentication
        credencial =
            await createUserWithEmailAndPassword(
                auth,
                correo,
                password
            );

        console.log("Usuario creado:", credencial.user.uid);

        // Crear documento en Firestore
        await setDoc(
            doc(
                db,
                "usuarios",
                credencial.user.uid
            ),
            {
                uid: credencial.user.uid,
                nombreCompleto: nombre,
                correo: correo,
                estado: "ACTIVO",
                rol: "USUARIO",
                fechaRegistro: serverTimestamp()
            }
        );

        console.log("Documento creado en Firestore");

        mostrarToast(
            "exito",
            "Cuenta creada correctamente."
        );

        setTimeout(() => {

            window.location.href = "index.html";

        }, 2000);

    }
    catch (error) {

        console.error(error);
        console.error(error.code);
        console.error(error.message);

        // Si el usuario ya fue creado en Authentication
        // pero falló Firestore, lo eliminamos.
        if (credencial && credencial.user) {

            try {

                await deleteUser(credencial.user);

            } catch (e) {

                console.error("No se pudo eliminar el usuario:", e);

            }

        }

        switch (error.code) {

            case "auth/email-already-in-use":
                mostrarToast(
                    "error",
                    "Ese correo ya está registrado."
                );
                break;

            case "auth/invalid-email":
                mostrarToast(
                    "error",
                    "Correo inválido."
                );
                break;

            case "auth/weak-password":
                mostrarToast(
                    "error",
                    "La contraseña debe tener al menos 6 caracteres."
                );
                break;

            case "permission-denied":
            case "firestore/permission-denied":
                mostrarToast(
                    "error",
                    "Firestore no permite escribir. Revisa las reglas."
                );
                break;

            default:
                mostrarToast(
                    "error",
                    error.message
                );

        }

    }
    finally {

        btnRegistrar.disabled = false;
        btnRegistrar.classList.remove("cargando");
        btnRegistrar.innerHTML = "Registrarse";

    }

});
