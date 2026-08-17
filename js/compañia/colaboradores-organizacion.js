import { db } from "../firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const CAMPOS_ID = {
    sucursal: "sucursalId",
    area: "areaId",
    subarea: "subareaId"
};

function textoSeguro(valor){
    return String(valor ?? "").replace(/[&<>'"]/g, caracter => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"
    })[caracter]);
}

function datosColaborador(documento){
    const datos = documento.data();
    const personales = datos.datosPersonales || {};
    const documentoIdentidad = datos.documentoIdentidad || {};
    const organizacion = datos.organizacion || {};
    return {
        id: documento.id,
        nombre: `${personales.apellidos || datos.apellidos || ""} ${personales.nombres || datos.nombres || ""}`.trim() || "Colaborador sin nombre",
        documento: documentoIdentidad.numeroDocumento || datos.numeroDocumento || datos.documento || "Sin documento",
        cargo: datos.informacionAdicional?.cargoProfesion || datos.cargoProfesion || "Sin cargo registrado",
        estado: datos.estado || "ACTIVO",
        organizacion
    };
}

function abrirListado(tipo, nombreUnidad, colaboradores){
    let pagina = 1;
    let busqueda = "";
    const porPagina = 10;
    const tituloTipo = tipo === "sucursal" ? "Sucursal" : tipo === "area" ? "Área" : "Subárea";

    Swal.fire({
        title: `${tituloTipo}: ${textoSeguro(nombreUnidad)}`,
        html: `
            <div class="listado-colaboradores-organizacion">
                <label class="busqueda-colaboradores-organizacion">
                    <i class="bi bi-search"></i>
                    <input id="buscarColaboradorOrganizacion" type="search" placeholder="Buscar por nombre, documento o cargo">
                </label>
                <div id="filasColaboradoresOrganizacion"></div>
                <footer>
                    <span id="rangoColaboradoresOrganizacion"></span>
                    <div>
                        <button id="anteriorColaboradoresOrganizacion" type="button"><i class="bi bi-chevron-left"></i></button>
                        <b id="paginaColaboradoresOrganizacion"></b>
                        <button id="siguienteColaboradoresOrganizacion" type="button"><i class="bi bi-chevron-right"></i></button>
                    </div>
                </footer>
            </div>`,
        width: 720,
        confirmButtonText: "Cerrar",
        confirmButtonColor: "#2563eb",
        didOpen: () => {
            const contenedor = document.getElementById("filasColaboradoresOrganizacion");
            const campo = document.getElementById("buscarColaboradorOrganizacion");
            const anterior = document.getElementById("anteriorColaboradoresOrganizacion");
            const siguiente = document.getElementById("siguienteColaboradoresOrganizacion");

            const renderizar = () => {
                const termino = busqueda.toLocaleLowerCase("es");
                const filtrados = colaboradores.filter(item => `${item.nombre} ${item.documento} ${item.cargo}`.toLocaleLowerCase("es").includes(termino));
                const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
                pagina = Math.min(pagina, paginas);
                const inicio = (pagina - 1) * porPagina;
                const visibles = filtrados.slice(inicio, inicio + porPagina);
                contenedor.innerHTML = visibles.length ? visibles.map(item => `
                    <article class="fila-colaborador-organizacion">
                        <span>${textoSeguro(item.nombre.split(" ").slice(0,2).map(p=>p[0]).join("").toUpperCase())}</span>
                        <div><strong>${textoSeguro(item.nombre)}</strong><small>${textoSeguro(item.documento)} · ${textoSeguro(item.cargo)}</small></div>
                        <em class="${String(item.estado).toUpperCase() === "ACTIVO" ? "activo" : ""}">${textoSeguro(item.estado)}</em>
                    </article>`).join("") : `<div class="sin-colaboradores-organizacion"><i class="bi bi-people"></i><p>No se encontraron colaboradores.</p></div>`;
                document.getElementById("rangoColaboradoresOrganizacion").textContent = filtrados.length ? `${inicio + 1}-${Math.min(inicio + porPagina, filtrados.length)} de ${filtrados.length}` : "0 colaboradores";
                document.getElementById("paginaColaboradoresOrganizacion").textContent = `${pagina} / ${paginas}`;
                anterior.disabled = pagina === 1;
                siguiente.disabled = pagina === paginas;
            };
            campo.addEventListener("input", () => { busqueda = campo.value.trim(); pagina = 1; renderizar(); });
            anterior.addEventListener("click", () => { if(pagina > 1){ pagina--; renderizar(); } });
            siguiente.addEventListener("click", () => { pagina++; renderizar(); });
            renderizar();
        }
    });
}

export async function activarListadoColaboradores({ empresaId, selector, tipo }){
    const botones = [...document.querySelectorAll(selector)];
    if(!botones.length) return;
    botones.forEach(boton => { boton.disabled = true; boton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Cargando…'; });
    try{
        const instantanea = await getDocs(query(collection(db,"colaboradores"), where("empresaId","==",empresaId)));
        const colaboradores = instantanea.docs.map(datosColaborador);
        const campoId = CAMPOS_ID[tipo];
        botones.forEach(boton => {
            const asignados = colaboradores.filter(item => (item.organizacion?.[campoId] || item[campoId]) === boton.dataset.id);
            const cantidad = asignados.length;
            boton.disabled = false;
            boton.innerHTML = `<i class="bi bi-people"></i> ${cantidad} ${cantidad === 1 ? "colaborador" : "colaboradores"}`;
            boton.onclick = () => abrirListado(tipo, boton.closest("article, .sucursal-card, .area-card, .subarea-card")?.querySelector("h3")?.textContent?.trim() || "Sin nombre", asignados);
        });
    }catch(error){
        console.error("No se pudieron cargar los colaboradores de la unidad.", error);
        botones.forEach(boton => { boton.disabled = false; boton.innerHTML = '<i class="bi bi-exclamation-circle"></i> Ver colaboradores'; });
    }
}
