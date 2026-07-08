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

    }

    catch (error) {

        contenedor.innerHTML = `

            <h2>No se pudo cargar la pestaña.</h2>

        `;

        console.error(error);

    }

}
