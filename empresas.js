import { app } from "firebase.js";

import {
getFirestore,
collection,
addDoc,
getDocs
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const db = getFirestore(app);

const btnGuardar =
document.getElementById("btnGuardar");

btnGuardar.addEventListener(
"click",
guardarEmpresa
);

async function guardarEmpresa(){

```
const ruc =
document.getElementById("ruc").value.trim();

const razonSocial =
document.getElementById("razonSocial").value.trim();

const direccion =
document.getElementById("direccion").value.trim();

const correo =
document.getElementById("correo").value.trim();

const telefono =
document.getElementById("telefono").value.trim();

if(
    !ruc ||
    !razonSocial ||
    !correo
){
    alert("Complete los campos obligatorios");
    return;
}

try{

    await addDoc(
        collection(db,"empresas"),
        {
            ruc,
            razonSocial,
            direccion,
            correo,
            telefono,
            estado:true,
            fechaCreacion:new Date()
        }
    );

    alert("Empresa guardada correctamente");

    document.getElementById("ruc").value = "";
    document.getElementById("razonSocial").value = "";
    document.getElementById("direccion").value = "";
    document.getElementById("correo").value = "";
    document.getElementById("telefono").value = "";

    cargarEmpresas();

}
catch(error){

    console.error(error);

    alert("Error al guardar empresa");

}
```

}

async function cargarEmpresas(){

```
const tabla =
document.getElementById("tablaEmpresas");

tabla.innerHTML = "";

try{

    const snapshot =
    await getDocs(
        collection(db,"empresas")
    );

    snapshot.forEach(doc=>{

        const empresa = doc.data();

        tabla.innerHTML += `
            <tr>
                <td>${empresa.ruc || ""}</td>
                <td>${empresa.razonSocial || ""}</td>
                <td>${empresa.correo || ""}</td>
                <td>
                    ${empresa.estado ? "Activo" : "Inactivo"}
                </td>
                <td>
                    <button onclick="abrirEmpresa('${doc.id}')">
                        Administrar
                    </button>
                </td>
            </tr>
        `;

    });

}
catch(error){

    console.error(error);

    alert("Error al cargar empresas");

}
```

}

window.abrirEmpresa = function(id){

```
window.location.href =
`empresa.html?id=${id}`;
```

}

cargarEmpresas();
