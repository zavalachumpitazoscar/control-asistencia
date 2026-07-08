import { iniciarInformacion } from "./compañia/informacion.js";
import { iniciarSucursales } from "./compañia/sucursales.js";
import { iniciarAreas } from "./compañia/areas.js";
import { iniciarSubareas } from "./compañia/subareas.js";


export function iniciarCompania() {

    const botones =
        document.querySelectorAll(".tab");

    botones.forEach(boton => {

        boton.addEventListener("click", () => {

            botones.forEach(b =>

                b.classList.remove("activo")

            );

            boton.classList.add("activo");

            cargarTab(
                boton.dataset.tab
            );

        });

    });

    // Al abrir Compañía se carga Información
    cargarTab("informacion");

}



async function cargarTab(tab) {

    const contenedor =
        document.getElementById("contenidoCompania");

    try {

        const respuesta =
            await fetch(
                `vistas/compañia/${tab}.html`
            );

        const html =
            await respuesta.text();

        contenedor.innerHTML =
            html;

        switch(tab){

            case "informacion":

                iniciarInformacion();

            break;

            case "sucursales":

                iniciarSucursales();

            break;

            case "areas":

                iniciarAreas();

            break;

            case "subareas":

                iniciarSubareas();

            break;

        }

    }

    catch (error) {

        contenedor.innerHTML = `
            <h2>No se pudo cargar la pestaña.</h2>
        `;

        console.error(error);

    }

}
