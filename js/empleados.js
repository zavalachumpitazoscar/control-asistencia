import { iniciarColaboradores } from "./empleados/colaboradores.js";
import { iniciarHorarios } from "./empleados/horarios.js";
import { iniciarPermisos } from "./empleados/permisos.js";
import { iniciarFeriados } from "./empleados/feriados.js";

export function iniciarEmpleados(
    tabInicial = "colaboradores"
){

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


/*
    Marcar como activa la pestaña solicitada.
*/

botones.forEach(boton=>{

    boton.classList.toggle(
        "activo",
        boton.dataset.tab ===
        tabInicial
    );

});


/*
    Cargar la pestaña solicitada.
*/

cargarTab(
    tabInicial
);
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

            case "feriados":

                iniciarFeriados();

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
