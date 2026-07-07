const botones =
document.querySelectorAll(".item");


const contenedor =
document.getElementById("contenedorVista");


const titulo =
document.querySelector(".topbar h1");





botones.forEach(btn=>{


    btn.addEventListener("click",()=>{


        botones.forEach(b=>
            b.classList.remove("activo")
        );


        btn.classList.add("activo");



        const vista =
        btn.dataset.vista;



        titulo.textContent =
        btn.textContent.trim();



        cargarVista(vista);


    });


});







async function cargarVista(vista){


try{


const respuesta =
await fetch(
`vistas/${vista}.html`
);



const html =
await respuesta.text();



contenedor.innerHTML =
html;



}
catch(error){


contenedor.innerHTML=
`

<h2>
Vista no encontrada
</h2>

`;



console.error(error);


}



}




// cargar dashboard al iniciar

cargarVista("dashboard");
