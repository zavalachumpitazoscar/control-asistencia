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

    if(!empresaId){

        console.error(
            "No se recibió empresaId para la carga masiva."
        );

        return;

    }


    if(!botonCargaMasiva){

        console.error(
            "No se recibió el botón de carga masiva."
        );

        return;

    }


    botonCargaMasiva.onclick = ()=>{

        Swal.fire({

            icon:"info",

            title:
            "Carga masiva de colaboradores",

            html:`

                <p>
                    Próximamente podrás importar colaboradores mediante un archivo Excel.
                </p>

                <p style="margin-top:10px;color:#64748b;font-size:13px;">

                    Empresa vinculada:
                    <strong>${empresaId}</strong>

                </p>

            `,

            confirmButtonText:
            "Aceptar"

        });

    };

}
