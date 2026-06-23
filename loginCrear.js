import { getFirestore, collection, addDoc } 
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const db = getFirestore(app);

window.crearEmpresaPublica = async function () {

    const ruc = document.getElementById("rucEmpresa").value.trim();
    const razonSocial = document.getElementById("razonSocialEmpresa").value.trim();
    const direccion = document.getElementById("direccionEmpresa").value.trim();
    const correo = document.getElementById("correoEmpresa").value.trim();
    const telefono = document.getElementById("telefonoEmpresa").value.trim();

    if (!ruc || !razonSocial || !correo) {
        alert("Complete los campos");
        return;
    }

    try {

        await addDoc(collection(db, "empresas"), {
            ruc,
            razonSocial,
            direccion,
            correo,
            telefono,
            estado: "pendiente", // 🔥 CLAVE
            fechaCreacion: new Date()
        });

        alert("Solicitud enviada. Está pendiente de aprobación.");

        cerrarModalEmpresa();

    } catch (error) {
        console.error(error);
        alert("Error al enviar solicitud");
    }
};
