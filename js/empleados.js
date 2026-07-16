import { iniciarColaboradores } from "./empleados/colaboradores.js";
import { iniciarHorarios } from "./empleados/horarios.js";
import { iniciarPermisos } from "./empleados/permisos.js";


export function iniciarEmpleados(){

    const botones =
    document.querySelectorAll(".tab");


    botones.forEach(boton=>{

        boton.addEventListener("click",()=>{

            botones.forEach(b=>

                b.classList.remove("activo")

            );

            boton.classList.add("activo");

            cargarTab(

                boton.dataset.tab

            );

        });

    });


    // Al abrir Empleados se carga Colaboradores

    cargarTab("colaboradores");

}



async function cargarTab(tab){

    const contenedor =
    document.getElementById("contenidoEmpleados");


    try{

        const respuesta =
        await fetch(

            `vistas/empleados/${tab}.html`

        );


        const html =
        await respuesta.text();


        contenedor.innerHTML =
        html;


        switch(tab){

            case "colaboradores":

                iniciarColaboradores();

            break;


            case "horarios":

                iniciarHorarios();

            break;

            case "permisos":

                iniciarPermisos();

            break;

        }

    }

    catch(error){

        contenedor.innerHTML=`

            <h2>

                No se pudo cargar la pestaña.

            </h2>

        `;

        console.error(error);

    }

}
