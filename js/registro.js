import {
    createUserWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    doc,
    setDoc
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

function mostrarToast(tipo,mensaje){

    toast.className="toast "+tipo;

    toast.textContent=mensaje;

    toast.classList.add("mostrar");

    setTimeout(()=>{

        toast.classList.remove("mostrar");

    },3000);

}

btnRegistrar.addEventListener(
    "click",
    async () => {

        const nombre =
            document.getElementById("nombre").value;

        const correo =
            document.getElementById("correo").value;

        const password =
            document.getElementById("password").value;

        if(
    nombre.trim()==="" ||
    correo.trim()==="" ||
    password.trim()===""
){

    mostrarToast(
        "error",
        "Completa todos los campos."
    );

    return;

}

btnRegistrar.classList.add("cargando");
btnRegistrar.innerHTML="Registrando...";
btnRegistrar.disabled=true;

        try {

            const credencial =
                await createUserWithEmailAndPassword(
                    auth,
                    correo,
                    password
                );

            await setDoc(
                doc(
                    db,
                    "usuarios",
                    credencial.user.uid
                ),
                {
                    nombreCompleto: nombre,
                    correo: correo,
                    estado: "INACTIVO",
                    rol: "CLIENTE",
                    fechaRegistro:
                        new Date().toISOString()
                }
            );

mostrarToast(
    "exito",
    "Cuenta creada. Espera la activación del administrador."
);

setTimeout(()=>{

    window.location="index.html";

},2000);
        }
catch(error){

    btnRegistrar.classList.remove("cargando");
    btnRegistrar.innerHTML="Registrarse";
    btnRegistrar.disabled=false;

    if(error.code==="auth/email-already-in-use"){

        mostrarToast(
            "error",
            "Ese correo ya está registrado."
        );

    }else if(error.code==="auth/invalid-email"){

        mostrarToast(
            "error",
            "Correo electrónico inválido."
        );

    }else if(error.code==="auth/weak-password"){

        mostrarToast(
            "error",
            "La contraseña debe tener al menos 6 caracteres."
        );

    }else{

        mostrarToast(
            "error",
            "Ocurrió un error. Inténtalo nuevamente."
        );

    }

}

    }
);
