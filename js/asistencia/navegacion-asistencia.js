/*=====================================================
VARIABLES
=====================================================*/

let botonesTabs = [];

let contenidosTabs = [];


/*=====================================================
INICIAR NAVEGACIÓN
=====================================================*/

export function iniciarNavegacionAsistencia(){

    botonesTabs =
        Array.from(
            document.querySelectorAll(
                ".asistencia-tab"
            )
        );


    contenidosTabs =
        Array.from(
            document.querySelectorAll(
                "[data-contenido-tab]"
            )
        );


    if(botonesTabs.length === 0){

        console.warn(
            "No se encontraron pestañas de asistencia."
        );

        return;

    }


    botonesTabs.forEach(boton=>{

        boton.addEventListener(
            "click",
            ()=>{

                const nombreTab =
                    boton.dataset.tab;


                activarTabAsistencia(
                    nombreTab
                );

            }
        );

    });

}



/*=====================================================
ACTIVAR PESTAÑA
=====================================================*/

export function activarTabAsistencia(
    nombreTab
){

    botonesTabs.forEach(boton=>{

        boton.classList.toggle(
            "activo",
            boton.dataset.tab === nombreTab
        );

    });


    contenidosTabs.forEach(contenido=>{

        contenido.classList.toggle(
            "activo",
            contenido.dataset.contenidoTab ===
            nombreTab
        );

    });


    document.dispatchEvent(
        new CustomEvent(
            "asistencia:cambio-tab",
            {
                detail:{
                    tab:nombreTab
                }
            }
        )
    );

}
