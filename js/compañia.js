export function iniciarCompania(){

    const botones =
        document.querySelectorAll(".tab");

    const paneles =
        document.querySelectorAll(".panel-tab");



    botones.forEach(boton=>{

        boton.addEventListener("click",()=>{

            botones.forEach(b=>{

                b.classList.remove("activo");

            });


            paneles.forEach(panel=>{

                panel.classList.add("oculto");

            });



            boton.classList.add("activo");



            const nombre =
                boton.dataset.tab;



            document
            .getElementById(nombre)
            .classList
            .remove("oculto");

        });

    });

}
