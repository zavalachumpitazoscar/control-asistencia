import { app } from "./firebase.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

const params =
new URLSearchParams(window.location.search);

const empresaId =
params.get("id");

document
.getElementById("btnCrearUsuario")
.addEventListener(
    "click",
    crearUsuario
);

cargarEmpresa();
cargarUsuarios();

async function cargarEmpresa(){

    try {

        console.log("Cargando empresa...");

        const empresaRef = doc(db, "empresas", empresaId);
        const empresaSnap = await getDoc(empresaRef);

        if(!empresaSnap.exists()){
            console.log("Empresa no existe");
            return;
        }

        const empresa = empresaSnap.data();

        document.getElementById("nombreEmpresa").textContent = empresa.razonSocial;

    } catch (error) {
        console.error("ERROR CARGANDO EMPRESA:", error);
    }
}


async function crearUsuario(){

    const nombre = document.getElementById("nombreUsuario").value.trim();
    const correo = document.getElementById("correoUsuario").value.trim();
    const password = document.getElementById("passwordUsuario").value.trim();
    const rol = document.getElementById("rolUsuario").value;

    if(!nombre || !correo || !password){
        alert("Complete todos los campos");
        return;
    }

    try {

        console.log("Creando usuario en AUTH...");

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            correo,
            password
        );

        const uid = userCredential.user.uid;

        console.log("CREADO EN AUTH:", uid);

        await addDoc(collection(db, "usuarios"), {
            uid,
            empresaId,
            nombre,
            correo,
            rol,
            estado: true,
            ultimoAcceso: null,
            fechaCreacion: new Date()
        });

        alert("Usuario creado correctamente");

        document.getElementById("nombreUsuario").value = "";
        document.getElementById("correoUsuario").value = "";
        document.getElementById("passwordUsuario").value = "";

        cargarUsuarios();

    } catch (error) {

        console.error("ERROR:", error);
        alert(error.message);

    }
}


const uid = userCredential.user.uid;

await addDoc(collection(db, "usuarios"), {
    uid: uid,
    empresaId,
    nombre,
    correo,
    rol,
    estado: true,
    ultimoAcceso: null,
    fechaCreacion: new Date()
});

        alert(
            "Usuario creado"
        );

        document
        .getElementById("nombreUsuario")
        .value = "";

        document
        .getElementById("correoUsuario")
        .value = "";

        document
        .getElementById("passwordUsuario")
        .value = "";

        cargarUsuarios();
        

    }
    catch(error){

        console.error(error);

        alert(
            "Error al crear usuario"
        );

    }

}

async function cargarUsuarios(){

    const tabla =
    document.getElementById(
        "tablaUsuarios"
    );

    tabla.innerHTML = "";

    const q =
    query(
        collection(
            db,
            "usuarios"
        ),
        where(
            "empresaId",
            "==",
            empresaId
        )
    );

    const snapshot =
    await getDocs(q);

    snapshot.forEach(docSnap=>{

        const usuario =
        docSnap.data();

        tabla.innerHTML += `
            <tr>
                <td>${usuario.nombre}</td>
                <td>${usuario.correo}</td>
                <td>${usuario.rol}</td>

                <td>
    <span class="${
        usuario.estado
        ? "estado-activo"
        : "estado-inactivo"
    }">
        ${
            usuario.estado
            ? "Activo"
            : "Inactivo"
        }
    </span>
</td>

                <td>

                    <button
class="btn-editar"
onclick="editarUsuario('${docSnap.id}')">
✏️ Editar
</button>

                    <button
class="${
    usuario.estado
    ? 'btn-desactivar'
    : 'btn-activar'
}"
onclick="cambiarEstado(
'${docSnap.id}',
${usuario.estado}
)">

                    ${
                        usuario.estado
                        ? "Desactivar"
                        : "Activar"
                    }

                    </button>

                </td>

            </tr>
        `;

    });

}

window.cambiarEstado =
async function(id,estadoActual){

    try{

        await updateDoc(
            doc(
                db,
                "usuarios",
                id
            ),
            {
                estado: !estadoActual
            }
        );

        cargarUsuarios();

    }
    catch(error){

        console.error(error);

        alert(
            "Error al actualizar estado"
        );

    }

}

window.editarUsuario =
async function(id){

    const usuarioRef =
    doc(
        db,
        "usuarios",
        id
    );

    const usuarioSnap =
    await getDoc(
        usuarioRef
    );

    if(!usuarioSnap.exists()){
        return;
    }

    const usuario =
    usuarioSnap.data();

    document.getElementById(
        "editId"
    ).value = id;

    document.getElementById(
        "editNombre"
    ).value =
    usuario.nombre;

    document.getElementById(
        "editCorreo"
    ).value =
    usuario.correo;

    document.getElementById(
        "editRol"
    ).value =
    usuario.rol;

    document.getElementById(
        "editEstado"
    ).value =
    usuario.estado.toString();

    document.getElementById("modalUsuario").classList.add("show");

}

window.cerrarModal =
function(){

    document.getElementById("modalUsuario").classList.remove("show");

}

window.guardarEdicion =
async function(){

    const id =
    document.getElementById(
        "editId"
    ).value;

    try{

        await updateDoc(
            doc(
                db,
                "usuarios",
                id
            ),
            {
                nombre:
                document.getElementById(
                    "editNombre"
                ).value,

                correo:
                document.getElementById(
                    "editCorreo"
                ).value,

                rol:
                document.getElementById(
                    "editRol"
                ).value,

                estado:
                document.getElementById(
                    "editEstado"
                ).value === "true"
            }
        );

        cerrarModal();

        cargarUsuarios();

        alert(
            "Usuario actualizado"
        );

    }
    catch(error){

        console.error(error);

        alert(
            "Error al actualizar"
        );

    }

}


