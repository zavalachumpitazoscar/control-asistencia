import {
    consultarColeccionEmpresa,
    construirRegistrosResumen
}
from "./resumen-asistencia.js";


let selectorMes;
let buscarResumen;
let cuerpoResumen;
let btnActualizar;
let registrosMensuales = [];
let mesCargado = "";
let cargando = false;


const coleccionesMensuales = [
    "colaboradores",
    "marcaciones",
    "asignacionesHorarios",
    "horarios",
    "excepcionesHorarios",
    "ajustesAsistenciaDiaria",
    "aprobacionesHorasExtra",
    "permisos",
    "feriados",
    "descansosSustitutoriosFeriados"
];


export function iniciarResumenMensualAsistencia(){

    selectorMes = document.getElementById("selectorMesAsistencia");
    buscarResumen = document.getElementById("buscarResumenMensualAsistencia");
    cuerpoResumen = document.getElementById("cuerpoResumenMensualAsistencia");
    btnActualizar = document.getElementById("btnActualizarResumenMensual");

    if(!selectorMes || !cuerpoResumen){
        return;
    }

    selectorMes.value = obtenerMesActual();

    selectorMes.addEventListener("change", ()=>cargarResumenMensual());
    buscarResumen?.addEventListener("input", renderizarResumenMensual);
    btnActualizar?.addEventListener("click", ()=>cargarResumenMensual(true));

    document.addEventListener("asistencia:cambio-tab", evento=>{
        if(evento.detail?.tab === "mensual" && mesCargado !== selectorMes.value){
            cargarResumenMensual();
        }
    });

    [
        "asistencia:horario-dia-actualizado",
        "asistencia:horas-extra-actualizadas",
        "asistencia:ajuste-diario-actualizado",
        "asistencia:marcacion-manual-registrada",
        "asistencia:marcaciones-importadas"
    ].forEach(nombre=>{
        document.addEventListener(nombre, ()=>{
            mesCargado = "";
        });
    });
}


async function cargarResumenMensual(forzar = false){

    const mes = selectorMes?.value;
    const empresaId = sessionStorage.getItem("empresaId");

    if(!mes || !empresaId || cargando){
        return;
    }

    if(!forzar && mesCargado === mes){
        renderizarResumenMensual();
        return;
    }

    cargando = true;
    establecerCarga(true);
    mostrarMensaje("Calculando el resumen mensual...");

    try{
        const resultados = await Promise.all(
            coleccionesMensuales.map(nombre=>
                consultarColeccionEmpresa(nombre, empresaId)
            )
        );

        const [
            colaboradores,
            marcaciones,
            asignaciones,
            horarios,
            excepciones,
            ajustesAsistencia,
            aprobacionesHorasExtra,
            permisos,
            feriados,
            descansosSustitutorios
        ] = resultados;

        const fechas = obtenerFechasCalculables(mes);
        const consolidado = new Map();

        fechas.forEach(fecha=>{
            const registrosDia = construirRegistrosResumen({
                fecha,
                colaboradores,
                marcaciones,
                asignaciones,
                horarios,
                excepciones,
                ajustesAsistencia,
                aprobacionesHorasExtra,
                permisos,
                feriados,
                descansosSustitutorios
            });

            registrosDia.forEach(registro=>
                acumularRegistro(consolidado, registro)
            );
        });

        registrosMensuales = Array.from(consolidado.values())
            .sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
        mesCargado = mes;

        actualizarDescripcion(mes, fechas.length);
        renderizarResumenMensual();
    }
    catch(error){
        console.error("Error cargando resumen mensual:", error);
        mostrarMensaje("No se pudo calcular el resumen mensual.");
    }
    finally{
        cargando = false;
        establecerCarga(false);
    }
}


function acumularRegistro(consolidado, registro){

    if(!consolidado.has(registro.colaboradorId)){
        consolidado.set(registro.colaboradorId, {
            colaboradorId:registro.colaboradorId,
            nombre:registro.nombre,
            documento:registro.documento,
            diasProgramados:0,
            asistencias:0,
            tardanzas:0,
            ausencias:0,
            permisos:0,
            minutosTrabajados:0,
            minutosJustificados:0,
            minutosExtraAprobados:0
        });
    }

    const total = consolidado.get(registro.colaboradorId);
    const programado = registro.horarios?.length > 0;

    if(programado){
        total.diasProgramados++;
    }

    if(esAsistencia(registro.estado)){
        total.asistencias++;
    }

    if(["TARDANZA","TARDANZA_CON_PERMISO"].includes(registro.estado)){
        total.tardanzas++;
    }

    if(registro.estado === "AUSENTE"){
        total.ausencias++;
    }

    if(registro.permisoDia){
        total.permisos++;
    }

    total.minutosTrabajados += numeroSeguro(registro.minutosTrabajados);
    total.minutosJustificados += numeroSeguro(registro.minutosJustificadosPermiso);

    const aprobacion = registro.aprobacionHorasExtra;
    if(String(aprobacion?.decision || "").toUpperCase() === "APROBADO"){
        total.minutosExtraAprobados += numeroSeguro(aprobacion.minutosAprobados);
    }
}


function esAsistencia(estado){
    return [
        "PRESENTE",
        "TARDANZA",
        "PRESENTE_CON_PERMISO",
        "TARDANZA_CON_PERMISO",
        "TRABAJO_EN_FERIADO",
        "DESCANSO_SUSTITUTORIO_TRABAJADO"
    ].includes(estado);
}


function renderizarResumenMensual(){

    if(!cuerpoResumen){
        return;
    }

    const texto = String(buscarResumen?.value || "").trim().toLowerCase();
    const filtrados = registrosMensuales.filter(registro=>
        !texto
        || registro.nombre.toLowerCase().includes(texto)
        || String(registro.documento || "").includes(texto)
    );

    actualizarTarjetas(filtrados);

    if(filtrados.length === 0){
        mostrarMensaje(
            registrosMensuales.length
                ? "No existen colaboradores para la búsqueda ingresada."
                : "No hay información para el mes seleccionado."
        );
        return;
    }

    cuerpoResumen.innerHTML = filtrados.map(registro=>`
        <tr>
            <td class="mensual-colaborador">
                <strong>${escaparHTML(registro.nombre)}</strong>
                <small>${escaparHTML(registro.documento || "Sin documento")}</small>
            </td>
            <td>${registro.diasProgramados}</td>
            <td>${registro.asistencias}</td>
            <td>${registro.tardanzas}</td>
            <td>${registro.ausencias}</td>
            <td>${registro.permisos}</td>
            <td>${formatearMinutos(registro.minutosTrabajados)}</td>
            <td>${formatearMinutos(registro.minutosJustificados)}</td>
            <td>${formatearMinutos(registro.minutosExtraAprobados)}</td>
        </tr>
    `).join("");
}


function actualizarTarjetas(registros){
    const totales = registros.reduce((total, registro)=>({
        diasProgramados:total.diasProgramados + registro.diasProgramados,
        asistencias:total.asistencias + registro.asistencias,
        tardanzas:total.tardanzas + registro.tardanzas,
        ausencias:total.ausencias + registro.ausencias
    }), {diasProgramados:0,asistencias:0,tardanzas:0,ausencias:0});

    asignarTexto("totalDiasProgramadosMensual", totales.diasProgramados);
    asignarTexto("totalAsistenciasMensual", totales.asistencias);
    asignarTexto("totalTardanzasMensual", totales.tardanzas);
    asignarTexto("totalAusenciasMensual", totales.ausencias);
}


function actualizarDescripcion(mes, diasCalculados){
    const elemento = document.getElementById("descripcionResumenMensual");
    if(!elemento){
        return;
    }
    const [anio, numeroMes] = mes.split("-").map(Number);
    const nombreMes = new Intl.DateTimeFormat("es-PE", {month:"long",year:"numeric"})
        .format(new Date(anio, numeroMes - 1, 1));
    elemento.textContent = `${capitalizar(nombreMes)} · ${diasCalculados} días calendario procesados.`;
}


function obtenerFechasCalculables(mes){
    const [anio, numeroMes] = mes.split("-").map(Number);
    const ultimoDia = new Date(anio, numeroMes, 0).getDate();
    const hoy = new Date();
    let limite = ultimoDia;

    if(anio === hoy.getFullYear() && numeroMes === hoy.getMonth() + 1){
        limite = Math.min(ultimoDia, hoy.getDate());
    }
    else if(new Date(anio, numeroMes - 1, 1) > hoy){
        limite = 0;
    }

    return Array.from({length:limite}, (_,indice)=>
        `${anio}-${String(numeroMes).padStart(2,"0")}-${String(indice + 1).padStart(2,"0")}`
    );
}


function obtenerMesActual(){
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2,"0")}`;
}


function formatearMinutos(valor){
    const minutos = Math.max(0, Math.round(numeroSeguro(valor)));
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
}


function numeroSeguro(valor){
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}


function escaparHTML(valor){
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}


function capitalizar(texto){
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}


function asignarTexto(id, valor){
    const elemento = document.getElementById(id);
    if(elemento){
        elemento.textContent = valor;
    }
}


function mostrarMensaje(mensaje){
    cuerpoResumen.innerHTML = `<tr><td colspan="9" class="asistencia-tabla-vacia">${escaparHTML(mensaje)}</td></tr>`;
}


function establecerCarga(estaCargando){
    if(selectorMes){
        selectorMes.disabled = estaCargando;
    }
    if(btnActualizar){
        btnActualizar.disabled = estaCargando;
        btnActualizar.innerHTML = estaCargando
            ? '<span class="spinner-border spinner-border-sm"></span> Calculando...'
            : '<i class="bi bi-arrow-clockwise"></i> Actualizar mes';
    }
}
