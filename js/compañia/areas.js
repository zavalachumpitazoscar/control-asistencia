import {
    db
}
from "../firebase-config.js";


import {

    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot

}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



export function iniciarAreas(){



const empresaId =
sessionStorage.getItem("empresaId");



if(!empresaId){

    console.error("No se encontró la empresa.");

    return;

}




const btnNuevaArea =
document.getElementById("btnNuevaArea");


const modalArea =
document.getElementById("modalArea");


const cerrarArea =
document.getElementById("cerrarArea");


const guardarArea =
document.getElementById("guardarArea");


const listaAreas =
document.getElementById("listaAreas");



let modoEdicion = false;


let idAreaEditando = null;





//=================================
// NUEVA AREA
//=================================


if(btnNuevaArea){


btnNuevaArea.onclick = ()=>{


    modoEdicion = false;

    idAreaEditando = null;



    document.getElementById("nombreArea").value="";

    document.getElementById("descripcionArea").value="";



    document.querySelector("#modalArea h3").textContent =
    "Nueva área";


    guardarArea.textContent =
    "Guardar";



    modalArea.style.display="flex";


};



}





//=================================
// CERRAR MODAL
//=================================


if(cerrarArea){


cerrarArea.onclick = ()=>{


    modalArea.style.display="none";


};


}







//=================================
// GUARDAR
//=================================


guardarArea.onclick = async()=>{


const nombre =
document.getElementById("nombreArea")
.value.trim();



const descripcion =
document.getElementById("descripcionArea")
.value.trim();





if(nombre===""){


    Swal.fire({

        icon:"warning",

        title:"Ingrese un nombre para el área"

    });


    return;

}






try{


if(!modoEdicion){



await addDoc(

collection(db,"areas"),


{


empresaId,


nombre,


descripcion,


estado:"ACTIVA",


fechaRegistro:new Date()


}


);



}

else{



await updateDoc(


doc(

db,

"areas",

idAreaEditando

),


{


nombre,


descripcion


}



);



}






const mensaje =

modoEdicion

?

"Área actualizada"

:

"Área creada";






modoEdicion=false;


idAreaEditando=null;





document.getElementById("nombreArea").value="";

document.getElementById("descripcionArea").value="";



modalArea.style.display="none";





Swal.fire({


icon:"success",


title:mensaje,


timer:1500,


showConfirmButton:false



});





}



catch(error){


console.error(error);



Swal.fire({


icon:"error",


title:"No fue posible guardar el área"


});



}



};








//=================================
// LISTAR AREAS
//=================================


const consulta =


query(


collection(db,"areas"),


where(

"empresaId",

"==",

empresaId

)


);






onSnapshot(

consulta,


(snapshot)=>{



listaAreas.innerHTML="";





if(snapshot.empty){



listaAreas.innerHTML=`


<div class="sin-sucursales">


<i class="bi bi-diagram-3"></i>


<h3>

No existen áreas

</h3>


<p>

Crea la primera área de la empresa.

</p>


</div>


`;



return;


}






snapshot.forEach(documento=>{



const area =
documento.data();





listaAreas.innerHTML += `



<div class="area-card">



<div class="area-header">


<div>


<h3>

${area.nombre}

</h3>



<span class="badge-estado ${
area.estado==="ACTIVA"
?
"activa"
:
"inactiva"
}">


${area.estado}


</span>


</div>


</div>





<div class="area-descripcion">


${area.descripcion || "Sin descripción"}


</div>





<div class="area-footer">



<div class="colaboradores-area">


<i class="bi bi-people"></i>


0 colaboradores


</div>






<div class="acciones-area">



<button

class="btnEditarArea"


data-id="${documento.id}"


data-nombre="${area.nombre}"


data-descripcion="${area.descripcion || ""}"


>


<i class="bi bi-pencil-square"></i>


Editar


</button>






<button

class="btnEstadoArea"


data-id="${documento.id}"


data-estado="${area.estado}"


>


<i class="bi ${
area.estado==="ACTIVA"
?
"bi-lock-fill"
:
"bi-unlock-fill"

}"></i>



${
area.estado==="ACTIVA"
?
"Desactivar"
:
"Activar"

}



</button>



</div>



</div>





</div>



`;



});







//=================================
// EDITAR
//=================================


document

.querySelectorAll(".btnEditarArea")

.forEach(boton=>{


boton.onclick=()=>{



modoEdicion=true;



idAreaEditando =
boton.dataset.id;




document.querySelector("#modalArea h3")
.textContent="Editar área";



guardarArea.textContent="Actualizar";


document.getElementById("nombreArea").value =

boton.dataset.nombre;



document.getElementById("descripcionArea").value =

boton.dataset.descripcion;





modalArea.style.display="flex";



};



});









//=================================
// ESTADO
//=================================


document

.querySelectorAll(".btnEstadoArea")

.forEach(boton=>{


boton.onclick=async()=>{



const id =
boton.dataset.id;



const estadoActual =
boton.dataset.estado;



const nuevoEstado =

estadoActual==="ACTIVA"

?

"INACTIVA"

:

"ACTIVA";





const respuesta = await Swal.fire({



title:

estadoActual==="ACTIVA"

?

"¿Desactivar área?"

:

"¿Activar área?",



text:

estadoActual==="ACTIVA"

?

"Los colaboradores no podrán asignarse a esta área."

:

"El área estará disponible nuevamente.",

icon:"warning",

showCancelButton:true,

confirmButtonText:

estadoActual==="ACTIVA"

?

"Sí, desactivar"

:

"Sí, activar",


cancelButtonText:"Cancelar",

reverseButtons:true

});

if(!respuesta.isConfirmed)

return;

try{

await updateDoc(


doc(

db,

"areas",

id

),


{


estado:nuevoEstado


}



);






Swal.fire({


icon:"success",


title:

nuevoEstado==="ACTIVA"

?

"Área activada"

:

"Área desactivada",


timer:1500,


showConfirmButton:false



});

}

catch(error){

console.error(error);

Swal.fire({

icon:"error",

title:"No fue posible actualizar el estado"
});
}
};
});
}
);



}
