import {
    db
}
from "../firebase-config.js";


import {
    collection,
    addDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


export function iniciarCargaMasivaColaboradores({
    empresaId,
    botonCargaMasiva
}){

    if(!botonCargaMasiva){

        console.warn(
            "No se encontró el botón de carga masiva."
        );

        return;

    }


    botonCargaMasiva.onclick = ()=>{

        Swal.fire({

            icon:"info",

            title:"Carga masiva de colaboradores",

            text:
            "Aquí se implementará la selección e importación del archivo Excel.",

            confirmButtonText:"Aceptar"

        });

    };

}
