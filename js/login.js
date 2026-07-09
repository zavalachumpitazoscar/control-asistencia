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



const btnLogin =
    document.getElementById("btnLogin");


const toast =
    document.getElementById("toast");



let ingresando=false;



function mostrarToast(tipo,mensaje){


    toast.className =
        "toast " + tipo;


    toast.textContent =
        mensaje;


    toast.classList.add(
        "mostrar"
    );


    setTimeout(()=>{

        toast.classList.remove(
            "mostrar"
        );

    },3000);


}




function mostrarCarga(){


    btnLogin.disabled=true;


    btnLogin.classList.add(
        "cargando"
    );


    btnLogin.innerHTML =
    `
    <span>
        Verificando...
    </span>
    `;


}




function ocultarCarga(){


    btnLogin.disabled=false;


    btnLogin.classList.remove(
        "cargando"
    );


    btnLogin.innerHTML =
        "Ingresar";


}





btnLogin.addEventListener(

"click",

async()=>{


    if(ingresando){

        return;

    }


    const correo =

        document
        .getElementById("correo")
        .value
        .trim();



    const password =

        document
        .getElementById("password")
        .value;



    if(
        correo === "" ||
        password === ""
    ){


        mostrarToast(

            "error",

            "Ingrese correo y contraseña."

        );


        return;

    }



    ingresando=true;


    mostrarCarga();



    try{


        const credencial =

            await signInWithEmailAndPassword(

                auth,

                correo,

                password

            );



        const uid =

            credencial.user.uid;



        const referencia =

            doc(

                db,

                "usuarios",

                uid

            );



        const documento =

            await getDoc(
                referencia
            );




        if(!documento.exists()){


            await signOut(auth);


            mostrarToast(

                "error",

                "No existe información de la empresa."

            );


            return;

        }




// Guardar información de la sesión

const usuario =
    documento.data();

sessionStorage.setItem(
    "empresaId",
    usuario.empresaId
);

sessionStorage.setItem(
    "uid",
    usuario.uid
);

sessionStorage.setItem(
    "rol",
    usuario.rol
);

sessionStorage.setItem(
    "principal",
    usuario.principal
);

sessionStorage.setItem(
    "nombre",
    usuario.nombre || ""
);

sessionStorage.setItem(
    "correo",
    usuario.correo || ""
);

        // Validar estado

        if(usuario.estado !== "ACTIVO"){



            await signOut(auth);



            mostrarToast(

                "info",

                "La cuenta se encuentra inactiva."

            );



            return;

        }





        // Validar tipo de cuenta






        mostrarToast(

            "exito",

            "Bienvenido nuevamente."

        );




        setTimeout(()=>{

            window.location.href =
                "inicio.html";


        },1000);





    }


    catch(error){


        console.error(error);



        switch(error.code){



            case "auth/invalid-credential":


            case "auth/wrong-password":


            case "auth/user-not-found":


                mostrarToast(

                    "error",

                    "Correo o contraseña incorrectos."

                );

            break;




            case "auth/invalid-email":


                mostrarToast(

                    "error",

                    "Correo electrónico inválido."

                );


            break;




            default:


                mostrarToast(

                    "error",

                    "No se pudo iniciar sesión."

                );


        }


    }


    finally{


        ingresando=false;


        ocultarCarga();


    }



}

);
