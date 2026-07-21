import {
    auth,
    db
}
from "../firebase-config.js";

import {
    clasificarMarcaciones
}
from "./clasificar-marcaciones.js";


import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";




/*=====================================================
ESTADO DEL MÓDULO
=====================================================*/

let empresaId = null;

let fechaCalendarioFeriados = new Date();

let anioSeleccionadoFeriados =
    new Date().getFullYear();

let feriadosEmpresa = [];

let feriadosFiltrados = [];

let feriadoSeleccionado = null;

let colaboradoresFeriado = [];

let sucursalesFeriado = [];

let areasFeriado = [];

let subareasFeriado = [];

let alcanceExcepcionActual = "SUCURSAL";

let excepcionesSeleccionadas = {

    SUCURSAL:new Set(),

    AREA:new Set(),

    SUBAREA:new Set(),

    COLABORADOR:new Set()

};

let cancelarEscuchaFeriados = null;

let moduloFeriadosIniciado = false;

let asignacionesHorariosFeriado = [];

let excepcionesHorariosFeriado = [];

let horariosCatalogoFeriado = [];

let marcacionesFeriado = [];

let diasTrabajadosFeriadoSeleccionado = [];



/*=====================================================
CATÁLOGO OFICIAL PERÚ 2026
=====================================================*/

/*
    Los feriados nacionales se cargan automáticamente.

    El día no laborable se carga por separado y queda
    pendiente de configuración empresarial.
*/
/*
    Este catálogo contiene exclusivamente las fechas
    oficiales configuradas para 2026.

    No debe utilizar el año actual porque algunas fechas,
    como Semana Santa, cambian cada año.
*/

const ANIO_CATALOGO_FERIADOS = 2026;


const FERIADOS_OFICIALES_PERU_2026 = [

    {
        codigo:"PE-2026-01-01",
        nombre:"Año Nuevo",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-01-01`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-01-01`,
        tipo:"FERIADO_NACIONAL"
    },
    
    {
        codigo:"PE-2026-01-02",
        nombre:"Día no laborable para el sector público",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-01-02`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-01-02`,
        tipo:"DIA_NO_LABORABLE"
    },

    {
        codigo:"PE-2026-04-02",
        nombre:"Jueves Santo",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-04-02`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-04-02`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-04-03",
        nombre:"Viernes Santo",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-04-03`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-04-03`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-05-01",
        nombre:"Día del Trabajo",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-05-01`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-05-01`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-06-07",
        nombre:"Batalla de Arica y Día de la Bandera",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-06-07`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-06-07`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-06-29",
        nombre:"San Pedro y San Pablo",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-06-29`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-06-29`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-07-23",
        nombre:"Día de la Fuerza Aérea del Perú",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-07-23`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-07-23`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-07-27",
        nombre:"Día no laborable",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-07-27`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-07-27`,
        tipo:"DIA_NO_LABORABLE"
    },

    {
        codigo:"PE-2026-07-28",
        nombre:"Fiestas Patrias",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-07-28`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-07-29`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-08-06",
        nombre:"Batalla de Junín",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-08-06`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-08-06`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-08-30",
        nombre:"Santa Rosa de Lima",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-08-30`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-08-30`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-10-08",
        nombre:"Combate de Angamos",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-10-08`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-10-08`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-11-01",
        nombre:"Día de Todos los Santos",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-11-01`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-11-01`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-12-08",
        nombre:"Inmaculada Concepción",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-12-08`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-12-08`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-12-09",
        nombre:"Batalla de Ayacucho",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-12-09`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-12-09`,
        tipo:"FERIADO_NACIONAL"
    },

    {
        codigo:"PE-2026-12-25",
        nombre:"Navidad",
        fechaInicio:`${ANIO_CATALOGO_FERIADOS}-12-25`,
        fechaFin:`${ANIO_CATALOGO_FERIADOS}-12-25`,
        tipo:"FERIADO_NACIONAL"
    }

];



/*=====================================================
ELEMENTOS HTML
=====================================================*/

let selectorAnioFeriados;

let buscarFeriado;

let filtroTipoFeriado;

let listaFeriados;

let tituloMesFeriados;

let feriadosDiasMes;

let btnMesAnteriorFeriados;

let btnMesSiguienteFeriados;

let btnHoyFeriados;

let btnNuevoFeriado;

let btnSincronizarFeriados;


/* RESUMEN */

let cantidadFeriadosNacionales;

let cantidadDiasNoLaborables;

let cantidadFeriadosEmpresa;

let cantidadFeriadosPendientes;


/* DETALLE */

let feriadoSinSeleccion;

let feriadoDetalleContenido;

let detalleFeriadoTipo;

let detalleFeriadoNombre;

let detalleFeriadoFecha;

let detalleFeriadoOrigen;

let detalleFeriadoAmbito;

let detalleFeriadoRemunerado;

let detalleFeriadoCompensable;

let detalleFeriadoEstado;

let detalleFeriadoRegla;

let detalleFeriadoDescripcionRegla;

let cantidadDescansanFeriado;

let cantidadTrabajanFeriado;

let cantidadPendientesFeriado;

let detalleFeriadoTratamiento;

let btnVerColaboradoresFeriado;

let btnConfigurarFeriado;

let btnEditarFeriado;

let btnDesactivarFeriado;


/* MODAL FERIADO */

let modalFeriado;

let cerrarModalFeriado;

let cancelarModalFeriado;

let tituloModalFeriado;

let subtituloModalFeriado;

let formularioFeriado;

let feriadoId;

let nombreFeriado;

let tipoFeriado;

let ambitoFeriado;

let fechaInicioFeriado;

let fechaFinFeriado;

let contenedorDepartamentoFeriado;

let departamentoFeriado;

let contenedorUbicacionLocalFeriado;

let provinciaFeriado;

let distritoFeriado;

let descansoRemuneradoFeriado;

let compensableFeriado;

let permitirMarcacionFeriado;

let descripcionFeriado;

let guardarFeriado;


/* CONFIGURACIÓN */

let modalConfigurarFeriado;

let cerrarConfigurarFeriado;

let cancelarConfigurarFeriado;

let tituloConfigurarFeriado;

let fechaConfigurarFeriado;

let reglaGeneralFeriado;

let buscarExcepcionFeriado;

let listaExcepcionesFeriado;

let cantidadExcepcionesSeleccionadas;

let btnLimpiarExcepcionesFeriado;

let tratamientoTrabajoFeriado;

let noRegistrarFaltaFeriado;

let identificarFeriadoLaborado;

let guardarConfiguracionFeriado;


/* COLABORADORES */

let modalColaboradoresFeriado;

let cerrarColaboradoresFeriado;

let cerrarListadoColaboradoresFeriado;

let tituloColaboradoresFeriado;

let subtituloColaboradoresFeriado;

let buscarColaboradorFeriado;

let filtroResultadoFeriado;

let tablaColaboradoresFeriado;


/* DESCANSO SUSTITUTORIO */

let modalDescansoSustitutorio;

let cerrarDescansoSustitutorio;

let cancelarDescansoSustitutorio;

let feriadoTrabajadoId;

let fechaFeriadoTrabajado;

let colaboradorDescansoId;

let avatarColaboradorDescanso;

let nombreColaboradorDescanso;

let documentoColaboradorDescanso;

let fechaDescansoSustitutorio;

let observacionDescansoSustitutorio;

let guardarDescansoSustitutorio;

let colaboradorDescansoSeleccionado = null;

let anularDescansoSustitutorio;

let descansosSustitutoriosFeriado = [];

let descansoSustitutorioSeleccionado = null;



/*=====================================================
INICIAR FERIADOS
=====================================================*/

export async function iniciarFeriados(){

    console.log("✅ INICIANDO MÓDULO FERIADOS");

    obtenerElementosFeriados();


    if(
        !listaFeriados ||
        !feriadosDiasMes
    ){

        console.error(
            "No se encontraron los elementos de feriados."
        );

        return;

    }


    empresaId =
        sessionStorage.getItem("empresaId");


    if(!empresaId){

        await obtenerEmpresaDesdeUsuario();

    }


    if(!empresaId){

        mostrarError(
            "No se pudo identificar la empresa."
        );

        return;

    }


    fechaCalendarioFeriados =
        new Date();

    anioSeleccionadoFeriados =
        fechaCalendarioFeriados.getFullYear();


    cargarSelectorAnios();


    if(!moduloFeriadosIniciado){

        registrarEventosFeriados();

        moduloFeriadosIniciado = true;

    }


    await cargarDatosOrganizacion();

    escucharFeriados();

}



/*=====================================================
OBTENER EMPRESA
=====================================================*/

async function obtenerEmpresaDesdeUsuario(){

    const usuario =
        auth.currentUser;


    if(!usuario) return;


    const referencia =
        doc(
            db,
            "usuarios",
            usuario.uid
        );


    const resultado =
        await getDoc(referencia);


    if(!resultado.exists()) return;


    empresaId =
        resultado.data().empresaId || null;


    if(empresaId){

        sessionStorage.setItem(
            "empresaId",
            empresaId
        );

    }

}



/*=====================================================
OBTENER ELEMENTOS
=====================================================*/

function obtenerElementosFeriados(){

    selectorAnioFeriados =
        document.getElementById("selectorAnioFeriados");

    buscarFeriado =
        document.getElementById("buscarFeriado");

    filtroTipoFeriado =
        document.getElementById("filtroTipoFeriado");

    listaFeriados =
        document.getElementById("listaFeriados");

    tituloMesFeriados =
        document.getElementById("tituloMesFeriados");

    feriadosDiasMes =
        document.getElementById("feriadosDiasMes");

    btnMesAnteriorFeriados =
        document.getElementById("btnMesAnteriorFeriados");

    btnMesSiguienteFeriados =
        document.getElementById("btnMesSiguienteFeriados");

    btnHoyFeriados =
        document.getElementById("btnHoyFeriados");

    btnNuevoFeriado =
        document.getElementById("btnNuevoFeriado");

    btnSincronizarFeriados =
        document.getElementById("btnSincronizarFeriados");


    cantidadFeriadosNacionales =
        document.getElementById("cantidadFeriadosNacionales");

    cantidadDiasNoLaborables =
        document.getElementById("cantidadDiasNoLaborables");

    cantidadFeriadosEmpresa =
        document.getElementById("cantidadFeriadosEmpresa");

    cantidadFeriadosPendientes =
        document.getElementById("cantidadFeriadosPendientes");


    feriadoSinSeleccion =
        document.getElementById("feriadoSinSeleccion");

    feriadoDetalleContenido =
        document.getElementById("feriadoDetalleContenido");

    detalleFeriadoTipo =
        document.getElementById("detalleFeriadoTipo");

    detalleFeriadoNombre =
        document.getElementById("detalleFeriadoNombre");

    detalleFeriadoFecha =
        document.getElementById("detalleFeriadoFecha");

    detalleFeriadoOrigen =
        document.getElementById("detalleFeriadoOrigen");

    detalleFeriadoAmbito =
        document.getElementById("detalleFeriadoAmbito");

    detalleFeriadoRemunerado =
        document.getElementById("detalleFeriadoRemunerado");

    detalleFeriadoCompensable =
        document.getElementById("detalleFeriadoCompensable");

    detalleFeriadoEstado =
        document.getElementById("detalleFeriadoEstado");

    detalleFeriadoRegla =
        document.getElementById("detalleFeriadoRegla");

    detalleFeriadoDescripcionRegla =
        document.getElementById(
            "detalleFeriadoDescripcionRegla"
        );

    cantidadDescansanFeriado =
        document.getElementById("cantidadDescansanFeriado");

    cantidadTrabajanFeriado =
        document.getElementById("cantidadTrabajanFeriado");

    cantidadPendientesFeriado =
        document.getElementById("cantidadPendientesFeriado");

    detalleFeriadoTratamiento =
        document.getElementById("detalleFeriadoTratamiento");

    btnVerColaboradoresFeriado =
        document.getElementById("btnVerColaboradoresFeriado");

    btnConfigurarFeriado =
        document.getElementById("btnConfigurarFeriado");

    btnEditarFeriado =
        document.getElementById("btnEditarFeriado");

    btnDesactivarFeriado =
        document.getElementById("btnDesactivarFeriado");


    modalFeriado =
        document.getElementById("modalFeriado");

    cerrarModalFeriado =
        document.getElementById("cerrarModalFeriado");

    cancelarModalFeriado =
        document.getElementById("cancelarModalFeriado");

    tituloModalFeriado =
        document.getElementById("tituloModalFeriado");

    subtituloModalFeriado =
        document.getElementById("subtituloModalFeriado");

    formularioFeriado =
        document.getElementById("formularioFeriado");

    feriadoId =
        document.getElementById("feriadoId");

    nombreFeriado =
        document.getElementById("nombreFeriado");

    tipoFeriado =
        document.getElementById("tipoFeriado");

    ambitoFeriado =
        document.getElementById("ambitoFeriado");

    fechaInicioFeriado =
        document.getElementById("fechaInicioFeriado");

    fechaFinFeriado =
        document.getElementById("fechaFinFeriado");

    contenedorDepartamentoFeriado =
        document.getElementById("contenedorDepartamentoFeriado");

    departamentoFeriado =
        document.getElementById("departamentoFeriado");

    contenedorUbicacionLocalFeriado =
        document.getElementById(
            "contenedorUbicacionLocalFeriado"
        );

    provinciaFeriado =
        document.getElementById("provinciaFeriado");

    distritoFeriado =
        document.getElementById("distritoFeriado");

    descansoRemuneradoFeriado =
        document.getElementById("descansoRemuneradoFeriado");

    compensableFeriado =
        document.getElementById("compensableFeriado");

    permitirMarcacionFeriado =
        document.getElementById("permitirMarcacionFeriado");

    descripcionFeriado =
        document.getElementById("descripcionFeriado");

    guardarFeriado =
        document.getElementById("guardarFeriado");


    modalConfigurarFeriado =
        document.getElementById("modalConfigurarFeriado");

    cerrarConfigurarFeriado =
        document.getElementById("cerrarConfigurarFeriado");

    cancelarConfigurarFeriado =
        document.getElementById("cancelarConfigurarFeriado");

    tituloConfigurarFeriado =
        document.getElementById("tituloConfigurarFeriado");

    fechaConfigurarFeriado =
        document.getElementById("fechaConfigurarFeriado");

    reglaGeneralFeriado =
        document.getElementById("reglaGeneralFeriado");

    buscarExcepcionFeriado =
        document.getElementById("buscarExcepcionFeriado");

    listaExcepcionesFeriado =
        document.getElementById("listaExcepcionesFeriado");

    cantidadExcepcionesSeleccionadas =
        document.getElementById(
            "cantidadExcepcionesSeleccionadas"
        );

    btnLimpiarExcepcionesFeriado =
        document.getElementById(
            "btnLimpiarExcepcionesFeriado"
        );

    tratamientoTrabajoFeriado =
        document.getElementById("tratamientoTrabajoFeriado");

    noRegistrarFaltaFeriado =
        document.getElementById("noRegistrarFaltaFeriado");

    identificarFeriadoLaborado =
        document.getElementById("identificarFeriadoLaborado");

    guardarConfiguracionFeriado =
        document.getElementById(
            "guardarConfiguracionFeriado"
        );


    modalColaboradoresFeriado =
        document.getElementById("modalColaboradoresFeriado");

    cerrarColaboradoresFeriado =
        document.getElementById("cerrarColaboradoresFeriado");

    cerrarListadoColaboradoresFeriado =
        document.getElementById(
            "cerrarListadoColaboradoresFeriado"
        );

    tituloColaboradoresFeriado =
        document.getElementById("tituloColaboradoresFeriado");

    subtituloColaboradoresFeriado =
        document.getElementById("subtituloColaboradoresFeriado");

    buscarColaboradorFeriado =
        document.getElementById("buscarColaboradorFeriado");

    filtroResultadoFeriado =
        document.getElementById("filtroResultadoFeriado");

    tablaColaboradoresFeriado =
        document.getElementById("tablaColaboradoresFeriado");

    modalDescansoSustitutorio =
    document.getElementById(
        "modalDescansoSustitutorio"
    );


cerrarDescansoSustitutorio =
    document.getElementById(
        "cerrarDescansoSustitutorio"
    );


cancelarDescansoSustitutorio =
    document.getElementById(
        "cancelarDescansoSustitutorio"
    );


feriadoTrabajadoId =
    document.getElementById(
        "feriadoTrabajadoId"
    );

fechaFeriadoTrabajado =
    document.getElementById(
        "fechaFeriadoTrabajado"
    );

colaboradorDescansoId =
    document.getElementById(
        "colaboradorDescansoId"
    );


avatarColaboradorDescanso =
    document.getElementById(
        "avatarColaboradorDescanso"
    );


nombreColaboradorDescanso =
    document.getElementById(
        "nombreColaboradorDescanso"
    );


documentoColaboradorDescanso =
    document.getElementById(
        "documentoColaboradorDescanso"
    );


fechaDescansoSustitutorio =
    document.getElementById(
        "fechaDescansoSustitutorio"
    );


observacionDescansoSustitutorio =
    document.getElementById(
        "observacionDescansoSustitutorio"
    );


guardarDescansoSustitutorio =
    document.getElementById(
        "guardarDescansoSustitutorio"
    );

anularDescansoSustitutorio =
    document.getElementById(
        "anularDescansoSustitutorio"
    );

}



/*=====================================================
EVENTOS
=====================================================*/

function registrarEventosFeriados(){

    btnMesAnteriorFeriados.onclick = ()=>{

        fechaCalendarioFeriados =
            new Date(
                fechaCalendarioFeriados.getFullYear(),
                fechaCalendarioFeriados.getMonth() - 1,
                1
            );

        actualizarAnioPorCalendario();

        renderizarModuloFeriados();

    };


    btnMesSiguienteFeriados.onclick = ()=>{

        fechaCalendarioFeriados =
            new Date(
                fechaCalendarioFeriados.getFullYear(),
                fechaCalendarioFeriados.getMonth() + 1,
                1
            );

        actualizarAnioPorCalendario();

        renderizarModuloFeriados();

    };


    btnHoyFeriados.onclick = ()=>{

        fechaCalendarioFeriados =
            new Date();

        actualizarAnioPorCalendario();

        renderizarModuloFeriados();

    };


    selectorAnioFeriados.onchange = ()=>{

        anioSeleccionadoFeriados =
            Number(selectorAnioFeriados.value);

        fechaCalendarioFeriados =
            new Date(
                anioSeleccionadoFeriados,
                fechaCalendarioFeriados.getMonth(),
                1
            );

        filtrarFeriados();

    };


    buscarFeriado.oninput =
        filtrarFeriados;

    filtroTipoFeriado.onchange =
        filtrarFeriados;


    btnNuevoFeriado.onclick = ()=>{

        abrirNuevoFeriado();

    };


    btnSincronizarFeriados.onclick = ()=>{

        sincronizarFeriadosOficiales2026();

    };


    tipoFeriado.onchange =
        actualizarCamposUbicacionFeriado;

    ambitoFeriado.onchange =
        actualizarCamposUbicacionFeriado;


    fechaInicioFeriado.onchange = ()=>{

        if(
            !fechaFinFeriado.value ||
            fechaFinFeriado.value <
            fechaInicioFeriado.value
        ){

            fechaFinFeriado.value =
                fechaInicioFeriado.value;

        }

    };


    guardarFeriado.onclick =
        guardarFormularioFeriado;


    cerrarModalFeriado.onclick =
        cerrarFormularioFeriado;

    cancelarModalFeriado.onclick =
        cerrarFormularioFeriado;


    btnEditarFeriado.onclick = ()=>{

        if(feriadoSeleccionado){

            abrirEditarFeriado(
                feriadoSeleccionado
            );

        }

    };


    btnDesactivarFeriado.onclick =
        cambiarEstadoFeriado;


    btnConfigurarFeriado.onclick =
        abrirConfiguracionFeriado;


    cerrarConfigurarFeriado.onclick =
        cerrarModalConfiguracion;

    cancelarConfigurarFeriado.onclick =
        cerrarModalConfiguracion;


    guardarConfiguracionFeriado.onclick =
        guardarConfiguracion;


    document
    .querySelectorAll(".feriado-alcance-btn")
    .forEach(boton=>{

        boton.onclick = ()=>{

            document
            .querySelectorAll(".feriado-alcance-btn")
            .forEach(item=>
                item.classList.remove("activo")
            );

            boton.classList.add("activo");

            alcanceExcepcionActual =
                boton.dataset.alcance;

            buscarExcepcionFeriado.value = "";

            actualizarPlaceholderExcepciones();

            renderizarExcepciones();

        };

    });


    buscarExcepcionFeriado.oninput =
        renderizarExcepciones;


    btnLimpiarExcepcionesFeriado.onclick = ()=>{

        excepcionesSeleccionadas[
            alcanceExcepcionActual
        ].clear();

        renderizarExcepciones();

        actualizarCantidadExcepciones();

    };


    btnVerColaboradoresFeriado.onclick =
        abrirListadoColaboradores;


    cerrarColaboradoresFeriado.onclick =
        cerrarListadoColaboradores;

    cerrarListadoColaboradoresFeriado.onclick =
        cerrarListadoColaboradores;


buscarColaboradorFeriado.oninput =
    renderizarTablaColaboradores;


filtroResultadoFeriado.onchange =
    renderizarTablaColaboradores;

    registrarCierrePorFondo(
        modalFeriado,
        cerrarFormularioFeriado
    );

    registrarCierrePorFondo(
        modalConfigurarFeriado,
        cerrarModalConfiguracion
    );

    registrarCierrePorFondo(
        modalColaboradoresFeriado,
        cerrarListadoColaboradores
    );

    registrarCierrePorFondo(
    modalDescansoSustitutorio,
    cerrarModalDescansoSustitutorio
);


    if(cerrarDescansoSustitutorio){

    cerrarDescansoSustitutorio.onclick =
        cerrarModalDescansoSustitutorio;

}


if(cancelarDescansoSustitutorio){

    cancelarDescansoSustitutorio.onclick =
        cerrarModalDescansoSustitutorio;

}


if(guardarDescansoSustitutorio){

    guardarDescansoSustitutorio.onclick =
        guardarDescansoSustitutorioFirestore;

}

if(anularDescansoSustitutorio){

    anularDescansoSustitutorio.onclick =
        anularDescansoSustitutorioFirestore;

}

}



/*=====================================================
SELECTOR DE AÑOS
=====================================================*/

function cargarSelectorAnios(){

    const anioActual =
        new Date().getFullYear();

    let opciones = "";


    for(
        let anio = anioActual - 2;
        anio <= anioActual + 3;
        anio++
    ){

        opciones +=
        `
            <option value="${anio}">
                ${anio}
            </option>
        `;

    }


    selectorAnioFeriados.innerHTML =
        opciones;

    selectorAnioFeriados.value =
        anioSeleccionadoFeriados;

}



/*=====================================================
CARGAR ORGANIZACIÓN
=====================================================*/

async function cargarDatosOrganizacion(){

const consultas = [

    obtenerColeccionEmpresa("colaboradores"),

    obtenerColeccionEmpresa("sucursales"),

    obtenerColeccionEmpresa("areas"),

    obtenerColeccionEmpresa("subareas"),

    obtenerColeccionEmpresa(
        "descansosSustitutoriosFeriados"
    ),

    obtenerColeccionEmpresa(
        "asignacionesHorarios"
    ),

    obtenerColeccionEmpresa(
        "excepcionesHorarios"
    ),

    obtenerColeccionEmpresa(
    "excepcionesHorarios"
),

obtenerColeccionEmpresa(
    "horarios"
),

obtenerColeccionEmpresa(
    "marcaciones"
)

];


const [
    colaboradoresResultado,
    sucursalesResultado,
    areasResultado,
    subareasResultado,
    descansosResultado,
    asignacionesResultado,
    excepcionesHorariosResultado,
    horariosResultado,
    marcacionesResultado
] = await Promise.all(consultas);


    colaboradoresFeriado =
        colaboradoresResultado;

    sucursalesFeriado =
        sucursalesResultado;

    areasFeriado =
        areasResultado;

    subareasFeriado =
        subareasResultado;

    descansosSustitutoriosFeriado =
    descansosResultado;

    asignacionesHorariosFeriado =
    asignacionesResultado;


excepcionesHorariosFeriado =
    excepcionesHorariosResultado;

    horariosCatalogoFeriado =
    horariosResultado;

marcacionesFeriado =
    marcacionesResultado;
}



async function obtenerColeccionEmpresa(
    nombreColeccion
){

    try{

        const resultado =
            await getDocs(
                query(
                    collection(
                        db,
                        nombreColeccion
                    ),
                    where(
                        "empresaId",
                        "==",
                        empresaId
                    )
                )
            );


        return resultado.docs.map(
            documento=>({

                id:documento.id,

                ...documento.data()

            })
        );

    }
    catch(error){

        console.error(
            `Error cargando ${nombreColeccion}:`,
            error
        );

        return [];

    }

}



/*=====================================================
ESCUCHAR FERIADOS
=====================================================*/

function escucharFeriados(){

    if(cancelarEscuchaFeriados){

        cancelarEscuchaFeriados();

    }


    const consulta =
        query(
            collection(
                db,
                "feriados"
            ),
            where(
                "empresaId",
                "==",
                empresaId
            )
        );


    cancelarEscuchaFeriados =
        onSnapshot(
            consulta,
            resultado=>{

                feriadosEmpresa =
                    resultado.docs.map(
                        documento=>({

                            id:documento.id,

                            ...documento.data()

                        })
                    );


                feriadosEmpresa.sort(
                    (a,b)=>
                        (a.fechaInicio || "")
                        .localeCompare(
                            b.fechaInicio || ""
                        )
                );


                filtrarFeriados();

            },
            error=>{

                console.error(
                    "Error escuchando feriados:",
                    error
                );

            }
        );

}



/*=====================================================
SINCRONIZAR FERIADOS OFICIALES
=====================================================*/

async function sincronizarFeriadosOficiales2026(){

    const confirmacion =
        await Swal.fire({

            title:"Sincronizar feriados 2026",

            text:
                "Se agregarán los feriados oficiales que todavía no existan.",

            icon:"question",

            showCancelButton:true,

            confirmButtonText:"Sincronizar",

            cancelButtonText:"Cancelar",

            confirmButtonColor:"#2563eb"

        });


    if(!confirmacion.isConfirmed) return;


    btnSincronizarFeriados.disabled = true;

    btnSincronizarFeriados.innerHTML =
    `
        <i class="bi bi-hourglass-split"></i>
        Sincronizando...
    `;


    try{

        for(
            const feriado
            of FERIADOS_OFICIALES_PERU_2026
        ){

            const idDocumento =
                `${empresaId}_${feriado.codigo}`
                .replaceAll("/","-");

let referenciaFeriado =
    doc(
        db,
        "feriados",
        idDocumento
    );


let documentoExistente =
    await getDoc(
        referenciaFeriado
    );


/*
    Compatibilidad con el identificador anterior
    utilizado para Año Nuevo.
*/

if(
    !documentoExistente.exists()
    &&
    feriado.codigo ===
    "PE-2026-01-01"
){

    const referenciaAnterior =
        doc(
            db,
            "feriados",
            `${empresaId}_PE-01-01`
        );


    const documentoAnterior =
        await getDoc(
            referenciaAnterior
        );


    if(documentoAnterior.exists()){

        referenciaFeriado =
            referenciaAnterior;

        documentoExistente =
            documentoAnterior;

    }

}

/*
    Si ya existe, conservamos toda su configuración:
    regla general, excepciones, tratamiento y estado.
*/

if(documentoExistente.exists()){

    const datosExistentes =
        documentoExistente.data();


    const esFeriadoNacional =
        feriado.tipo ===
        "FERIADO_NACIONAL";


    /*
        Actualizamos únicamente el tratamiento inicial
        pendiente de los feriados nacionales.

        No modificamos excepciones, regla general,
        estado ni otras decisiones del cliente.
    */

    if(
        esFeriadoNacional
        &&
        (
            !datosExistentes.tratamientoTrabajo
            ||
            datosExistentes.tratamientoTrabajo ===
            "PENDIENTE"
        )
    ){

        await updateDoc(
            referenciaFeriado,
            {

                tratamientoTrabajo:
                    "PAGO_ADICIONAL",

                descansoRemunerado:
                    true,

                fechaActualizacion:
                    serverTimestamp()

            }
        );

    }


    continue;

}


            const esDiaNoLaborable =
                feriado.tipo ===
                "DIA_NO_LABORABLE";


await setDoc(
    referenciaFeriado,
    {

                    empresaId,

                    codigoOficial:
                        feriado.codigo,

                    nombre:
                        feriado.nombre,

                    fechaInicio:
                        feriado.fechaInicio,

                    fechaFin:
                        feriado.fechaFin,

                    anio:     ANIO_CATALOGO_FERIADOS,

                    tipo:
                        feriado.tipo,

                    ambito:"NACIONAL",

                    origen:"OFICIAL",

                    descansoRemunerado:
                        !esDiaNoLaborable,

                    compensable:
                        esDiaNoLaborable,

                    permitirMarcacion:true,

                    bloqueado:true,

                    estado:"ACTIVO",

                    configurado:
                        !esDiaNoLaborable,

                    reglaGeneral:
                        esDiaNoLaborable
                        ? "POR_CONFIGURAR"
                        : "TODOS_DESCANSAN",

tratamientoTrabajo:
    esDiaNoLaborable
    ?
    "PENDIENTE"
    :
    "PAGO_ADICIONAL",

                    noRegistrarFalta:true,

                    identificarFeriadoLaborado:true,

                    excepciones:{

                        sucursales:[],

                        areas:[],

                        subareas:[],

                        colaboradores:[]

                    },

fechaCreacion:
    serverTimestamp(),

fechaActualizacion:
    serverTimestamp()

        }
    );

        }


        await mostrarExito(
            "Los feriados oficiales fueron sincronizados."
        );

    }
    catch(error){

        console.error(
            "Error sincronizando feriados:",
            error
        );

        mostrarError(
            "No se pudieron sincronizar los feriados."
        );

    }
    finally{

        btnSincronizarFeriados.disabled = false;

        btnSincronizarFeriados.innerHTML =
        `
            <i class="bi bi-arrow-repeat"></i>
            Sincronizar feriados
        `;

    }

}



/*=====================================================
FILTRAR FERIADOS
=====================================================*/

function filtrarFeriados(){

    const texto =
        buscarFeriado.value
        .trim()
        .toLowerCase();

    const tipo =
        filtroTipoFeriado.value;


    feriadosFiltrados =
        feriadosEmpresa.filter(
            feriado=>{

                const perteneceAnio =
                    Number(feriado.anio) ===
                    anioSeleccionadoFeriados;

                const coincideTexto =
                    !texto ||
                    (
                        feriado.nombre ||
                        ""
                    )
                    .toLowerCase()
                    .includes(texto);

                const coincideTipo =
                    !tipo ||
                    feriado.tipo === tipo;


                return (
                    perteneceAnio &&
                    coincideTexto &&
                    coincideTipo
                );

            }
        );


    renderizarModuloFeriados();

}



/*=====================================================
RENDERIZAR MÓDULO
=====================================================*/

function renderizarModuloFeriados(){

    renderizarResumenFeriados();

    renderizarListaFeriados();

    renderizarCalendarioFeriados();


    if(feriadoSeleccionado){

        const actualizado =
            feriadosEmpresa.find(
                item=>
                    item.id ===
                    feriadoSeleccionado.id
            );


        if(actualizado){

            feriadoSeleccionado =
                actualizado;

            renderizarDetalleFeriado();

        }

    }

}



/*=====================================================
RESUMEN
=====================================================*/

function renderizarResumenFeriados(){

    const feriadosAnio =
        feriadosEmpresa.filter(
            feriado=>
                Number(feriado.anio) ===
                anioSeleccionadoFeriados
        );


    cantidadFeriadosNacionales.textContent =
        feriadosAnio.filter(
            item=>
                item.tipo ===
                "FERIADO_NACIONAL"
        ).length;


    cantidadDiasNoLaborables.textContent =
        feriadosAnio.filter(
            item=>
                item.tipo ===
                "DIA_NO_LABORABLE"
        ).length;


    cantidadFeriadosEmpresa.textContent =
        feriadosAnio.filter(
            item=>
                item.origen ===
                "EMPRESA"
        ).length;


    cantidadFeriadosPendientes.textContent =
        feriadosAnio.filter(
            item=>
                item.reglaGeneral ===
                    "POR_CONFIGURAR" ||
                item.configurado === false
        ).length;

}



/*=====================================================
LISTA
=====================================================*/

function renderizarListaFeriados(){

    if(feriadosFiltrados.length === 0){

        listaFeriados.innerHTML =
        `
            <div class="feriados-lista-vacia">

                <i class="bi bi-calendar-x"></i>

                <p>
                    No hay feriados registrados para este año.
                </p>

            </div>
        `;

        return;

    }


    listaFeriados.innerHTML =
        feriadosFiltrados
        .map(feriado=>{

            const activo =
                feriadoSeleccionado?.id ===
                feriado.id
                ? "activo"
                : "";

            const estado =
                (
                    feriado.estado ||
                    "ACTIVO"
                ).toLowerCase();

            const fecha =
                convertirFechaLocal(
                    feriado.fechaInicio
                );

            const mes =
                new Intl.DateTimeFormat(
                    "es-PE",
                    {
                        month:"short"
                    }
                )
                .format(fecha)
                .replace(".","");


            return `
                <button
                    type="button"
                    class="feriado-lista-item ${activo}"
                    data-feriado-id="${feriado.id}"
                >

                    <div class="feriado-lista-fecha">

                        <strong>
                            ${fecha.getDate()}
                        </strong>

                        <span>
                            ${mes}
                        </span>

                    </div>

                    <div class="feriado-lista-datos">

                        <strong>
                            ${escaparHTML(
                                feriado.nombre
                            )}
                        </strong>

                        <span>
                            ${obtenerNombreTipo(
                                feriado.tipo
                            )}
                        </span>

                    </div>

                    <span
                        class="feriado-lista-estado ${estado}"
                    >
                        ${formatearEstado(
                            feriado.estado
                        )}
                    </span>

                </button>
            `;

        })
        .join("");


    listaFeriados
    .querySelectorAll(".feriado-lista-item")
    .forEach(boton=>{

        boton.onclick = ()=>{

            seleccionarFeriado(
                boton.dataset.feriadoId
            );

        };

    });

}



/*=====================================================
CALENDARIO
=====================================================*/

function renderizarCalendarioFeriados(){

    const anio =
        fechaCalendarioFeriados.getFullYear();

    const mes =
        fechaCalendarioFeriados.getMonth();


    tituloMesFeriados.textContent =
        new Intl.DateTimeFormat(
            "es-PE",
            {
                month:"long",
                year:"numeric"
            }
        )
        .format(
            new Date(anio,mes,1)
        );


    const primerDia =
        new Date(anio,mes,1);

    const ultimoDia =
        new Date(anio,mes + 1,0);

    const desplazamiento =
        (primerDia.getDay() + 6) % 7;

    const cantidadDias =
        ultimoDia.getDate();

    const totalCeldas =
        Math.ceil(
            (
                desplazamiento +
                cantidadDias
            ) / 7
        ) * 7;

    const hoy =
        obtenerFechaISO(new Date());

    let html = "";


    for(
        let indice = 0;
        indice < totalCeldas;
        indice++
    ){

        const dia =
            indice -
            desplazamiento +
            1;


        if(
            dia < 1 ||
            dia > cantidadDias
        ){

            html +=
            `
                <div class="feriado-dia fuera-mes"></div>
            `;

            continue;

        }


        const fecha =
            formarFechaISO(
                anio,
                mes + 1,
                dia
            );


        const eventos =
            obtenerFeriadosDeFecha(
                fecha
            );


        html +=
        `
            <div
                class="
                    feriado-dia
                    ${fecha === hoy ? "hoy" : ""}
                "
                data-fecha="${fecha}"
            >

                <span class="feriado-dia-numero">
                    ${dia}
                </span>

                <span
                    class="feriado-dia-agregar"
                    title="Agregar fecha"
                >
                    <i class="bi bi-plus"></i>
                </span>

                <div class="feriado-dia-eventos">

                    ${eventos
                        .map(
                            crearEventoCalendario
                        )
                        .join("")
                    }

                </div>

            </div>
        `;

    }


    feriadosDiasMes.innerHTML =
        html;


    registrarEventosCalendario();

}



/*=====================================================
EVENTOS DEL CALENDARIO
=====================================================*/

function registrarEventosCalendario(){

    feriadosDiasMes
    .querySelectorAll(
        ".feriado-dia:not(.fuera-mes)"
    )
    .forEach(dia=>{

        dia.onclick = evento=>{

            if(
                evento.target.closest(
                    ".feriado-evento"
                )
            ){

                return;

            }


            abrirNuevoFeriado(
                dia.dataset.fecha
            );

        };

    });


    feriadosDiasMes
    .querySelectorAll(".feriado-evento")
    .forEach(evento=>{

        evento.onclick = event=>{

            event.stopPropagation();

            seleccionarFeriado(
                evento.dataset.feriadoId
            );

        };

    });

}



/*=====================================================
OBTENER FERIADOS POR FECHA
=====================================================*/

function obtenerFeriadosDeFecha(fecha){

    return feriadosEmpresa.filter(
        feriado=>
            feriado.fechaInicio <= fecha &&
            feriado.fechaFin >= fecha &&
            Number(feriado.anio) ===
                fechaCalendarioFeriados.getFullYear()
    );

}



/*=====================================================
CREAR EVENTO
=====================================================*/

function crearEventoCalendario(
    feriado
){

    return `
        <button
            type="button"
            class="
                feriado-evento
                ${obtenerClaseTipo(feriado.tipo)}
                ${
                    feriado.estado === "INACTIVO"
                    ? "inactivo"
                    : ""
                }
            "
            data-feriado-id="${feriado.id}"
            title="${escaparHTML(feriado.nombre)}"
        >

            <span>
                ${escaparHTML(feriado.nombre)}
            </span>

            <small>
                ${obtenerNombreTipo(
                    feriado.tipo
                )}
            </small>

        </button>
    `;

}



/*=====================================================
SELECCIONAR FERIADO
=====================================================*/

function seleccionarFeriado(
    feriadoSeleccionadoId
){

    const encontrado =
        feriadosEmpresa.find(
            item=>
                item.id ===
                feriadoSeleccionadoId
        );


    if(!encontrado) return;


    feriadoSeleccionado =
        encontrado;


    renderizarListaFeriados();

    renderizarDetalleFeriado();

}



/*=====================================================
RENDERIZAR DETALLE
=====================================================*/

function renderizarDetalleFeriado(){

    if(!feriadoSeleccionado) return;


    feriadoSinSeleccion.style.display =
        "none";

    feriadoDetalleContenido.classList.add(
        "activo"
    );


    detalleFeriadoTipo.textContent =
        obtenerNombreTipo(
            feriadoSeleccionado.tipo
        );

    detalleFeriadoNombre.textContent =
        feriadoSeleccionado.nombre;

    detalleFeriadoFecha.textContent =
        obtenerTextoRangoFechas(
            feriadoSeleccionado.fechaInicio,
            feriadoSeleccionado.fechaFin
        );

    detalleFeriadoOrigen.textContent =
        feriadoSeleccionado.origen === "OFICIAL"
        ? "Oficial"
        : "Empresa";

    detalleFeriadoAmbito.textContent =
        formatearAmbito(
            feriadoSeleccionado.ambito
        );

    detalleFeriadoRemunerado.textContent =
        feriadoSeleccionado.descansoRemunerado
        ? "Sí"
        : "No";

    detalleFeriadoCompensable.textContent =
        feriadoSeleccionado.compensable
        ? "Sí"
        : "No";

    detalleFeriadoEstado.textContent =
        formatearEstado(
            feriadoSeleccionado.estado
        );

    detalleFeriadoRegla.textContent =
        obtenerTextoRegla(
            feriadoSeleccionado.reglaGeneral
        );

    detalleFeriadoDescripcionRegla.textContent =
        obtenerDescripcionRegla(
            feriadoSeleccionado.reglaGeneral
        );

    detalleFeriadoTratamiento.textContent =
        obtenerTextoTratamiento(
            feriadoSeleccionado
            .tratamientoTrabajo
        );


    const resultados =
        calcularAplicacionColaboradores();


    cantidadDescansanFeriado.textContent =
        resultados.filter(
            item=>
                item.resultado ===
                "DESCANSA"
        ).length;

    cantidadTrabajanFeriado.textContent =
        resultados.filter(
            item=>
                item.resultado ===
                "TRABAJA"
        ).length;

    cantidadPendientesFeriado.textContent =
        resultados.filter(
            item=>
                item.resultado ===
                "PENDIENTE"
        ).length;


    /*
        Los feriados oficiales no permiten editar
        nombre, tipo ni fechas.
    */

    btnEditarFeriado.style.display =
        feriadoSeleccionado.bloqueado
        ? "none"
        : "inline-flex";


    btnDesactivarFeriado.innerHTML =
        feriadoSeleccionado.estado ===
        "INACTIVO"
        ? `
            <i class="bi bi-toggle-on"></i>
            Activar
        `
        : `
            <i class="bi bi-toggle-off"></i>
            Desactivar
        `;

}



/*=====================================================
NUEVO FERIADO
=====================================================*/

function abrirNuevoFeriado(
    fecha = null
){

    formularioFeriado.reset();

    feriadoId.value = "";

    tituloModalFeriado.textContent =
        "Nuevo feriado";

    subtituloModalFeriado.textContent =
        "Registra una fecha especial para la empresa.";


    const fechaInicial =
        fecha ||
        obtenerFechaISO(new Date());


    fechaInicioFeriado.value =
        fechaInicial;

    fechaFinFeriado.value =
        fechaInicial;

    descansoRemuneradoFeriado.checked =
        true;

    permitirMarcacionFeriado.checked =
        true;

    compensableFeriado.checked =
        false;


    actualizarCamposUbicacionFeriado();

    modalFeriado.classList.add("activo");

}



/*=====================================================
EDITAR FERIADO
=====================================================*/

function abrirEditarFeriado(
    feriado
){

    if(feriado.bloqueado){

        mostrarAdvertencia(
            "Los datos oficiales no pueden editarse."
        );

        return;

    }


    formularioFeriado.reset();


    feriadoId.value =
        feriado.id;

    tituloModalFeriado.textContent =
        "Editar feriado";

    subtituloModalFeriado.textContent =
        "Actualiza la fecha empresarial seleccionada.";

    nombreFeriado.value =
        feriado.nombre || "";

    tipoFeriado.value =
        feriado.tipo || "";

    ambitoFeriado.value =
        feriado.ambito || "EMPRESA";

    fechaInicioFeriado.value =
        feriado.fechaInicio || "";

    fechaFinFeriado.value =
        feriado.fechaFin || "";

    departamentoFeriado.value =
        feriado.departamento || "";

    provinciaFeriado.value =
        feriado.provincia || "";

    distritoFeriado.value =
        feriado.distrito || "";

    descansoRemuneradoFeriado.checked =
        feriado.descansoRemunerado === true;

    compensableFeriado.checked =
        feriado.compensable === true;

    permitirMarcacionFeriado.checked =
        feriado.permitirMarcacion !== false;

    descripcionFeriado.value =
        feriado.descripcion || "";


    actualizarCamposUbicacionFeriado();

    modalFeriado.classList.add("activo");

}



/*=====================================================
CAMPOS DE UBICACIÓN
=====================================================*/

function actualizarCamposUbicacionFeriado(){

    const ambito =
        ambitoFeriado.value;


    contenedorDepartamentoFeriado
    .classList.remove("activo");

    contenedorUbicacionLocalFeriado
    .classList.remove("activo");


    if(
        ambito === "REGIONAL" ||
        ambito === "LOCAL"
    ){

        contenedorDepartamentoFeriado
        .classList.add("activo");

    }


    if(ambito === "LOCAL"){

        contenedorUbicacionLocalFeriado
        .classList.add("activo");

    }

}



/*=====================================================
GUARDAR FERIADO
=====================================================*/

async function guardarFormularioFeriado(){

    const nombre =
        nombreFeriado.value.trim();

    const tipo =
        tipoFeriado.value;

    const ambito =
        ambitoFeriado.value;

    const fechaInicio =
        fechaInicioFeriado.value;

    const fechaFin =
        fechaFinFeriado.value;


    if(!nombre){

        mostrarAdvertencia(
            "Ingresa el nombre del feriado."
        );

        nombreFeriado.focus();

        return;

    }


    if(!tipo){

        mostrarAdvertencia(
            "Selecciona el tipo de fecha."
        );

        tipoFeriado.focus();

        return;

    }


    if(!fechaInicio || !fechaFin){

        mostrarAdvertencia(
            "Selecciona las fechas del feriado."
        );

        return;

    }


    if(fechaFin < fechaInicio){

        mostrarAdvertencia(
            "La fecha final no puede ser menor que la inicial."
        );

        return;

    }


    if(
        existeCruceFeriado(
            fechaInicio,
            fechaFin,
            feriadoId.value
        )
    ){

        mostrarAdvertencia(
            "Ya existe un feriado registrado dentro de ese periodo."
        );

        return;

    }


    const datos = {

        empresaId,

        nombre,

        tipo,

        ambito,

        fechaInicio,

        fechaFin,

        anio:Number(
            fechaInicio.substring(0,4)
        ),

        departamento:
            departamentoFeriado.value ||
            null,

        provincia:
            provinciaFeriado.value.trim() ||
            null,

        distrito:
            distritoFeriado.value.trim() ||
            null,

        descansoRemunerado:
            descansoRemuneradoFeriado.checked,

        compensable:
            compensableFeriado.checked,

        permitirMarcacion:
            permitirMarcacionFeriado.checked,

        descripcion:
            descripcionFeriado.value.trim(),

        origen:"EMPRESA",

        bloqueado:false,

        estado:
            feriadoSeleccionado?.estado ||
            "ACTIVO",

        configurado:true,

        reglaGeneral:
            feriadoSeleccionado?.reglaGeneral ||
            "TODOS_DESCANSAN",

        tratamientoTrabajo:
            feriadoSeleccionado?.tratamientoTrabajo ||
            "PENDIENTE",

        noRegistrarFalta:true,

        identificarFeriadoLaborado:true,

        excepciones:
            feriadoSeleccionado?.excepciones ||
            {
                sucursales:[],
                areas:[],
                subareas:[],
                colaboradores:[]
            },

actualizadoPor:
    auth.currentUser?.uid
    ||
    null,

anuladoPor:
    null,

fechaAnulacion:
    null,

fechaActualizacion:
    serverTimestamp()

    };


    guardarFeriado.disabled = true;


    try{

        if(feriadoId.value){

            await updateDoc(
                doc(
                    db,
                    "feriados",
                    feriadoId.value
                ),
                datos
            );

        }
        else{

            await addDoc(
                collection(
                    db,
                    "feriados"
                ),
                {

                    ...datos,

actualizadoPor:
    auth.currentUser?.uid
    ||
    null,

                    fechaCreacion:
                        serverTimestamp()

                }
            );

        }


        cerrarFormularioFeriado();

        await mostrarExito(
            feriadoId.value
            ? "Feriado actualizado correctamente."
            : "Feriado registrado correctamente."
        );

    }
    catch(error){

        console.error(
            "Error guardando feriado:",
            error
        );

        mostrarError(
            "No se pudo guardar el feriado."
        );

    }
    finally{

        guardarFeriado.disabled = false;

    }

}



/*=====================================================
VALIDAR CRUCES
=====================================================*/

function existeCruceFeriado(
    inicio,
    fin,
    idExcluir
){

    return feriadosEmpresa.some(
        feriado=>{

            if(feriado.id === idExcluir){

                return false;

            }


            if(feriado.estado === "INACTIVO"){

                return false;

            }


            return (
                inicio <= feriado.fechaFin &&
                fin >= feriado.fechaInicio
            );

        }
    );

}



/*=====================================================
CAMBIAR ESTADO
=====================================================*/

async function cambiarEstadoFeriado(){

    if(!feriadoSeleccionado) return;


    const nuevoEstado =
        feriadoSeleccionado.estado ===
        "INACTIVO"
        ? "ACTIVO"
        : "INACTIVO";


    const confirmacion =
        await Swal.fire({

            title:
                nuevoEstado === "ACTIVO"
                ? "¿Activar feriado?"
                : "¿Desactivar feriado?",

            text:
                nuevoEstado === "ACTIVO"
                ? "La fecha volverá a aplicarse en el control de asistencia."
                : "La fecha dejará de afectar temporalmente la asistencia.",

            icon:"question",

            showCancelButton:true,

            confirmButtonText:
                nuevoEstado === "ACTIVO"
                ? "Activar"
                : "Desactivar",

            cancelButtonText:"Cancelar"

        });


    if(!confirmacion.isConfirmed) return;


    await updateDoc(
        doc(
            db,
            "feriados",
            feriadoSeleccionado.id
        ),
        {

            estado:nuevoEstado,

            fechaActualizacion:
                serverTimestamp()

        }
    );


    await mostrarExito(
        nuevoEstado === "ACTIVO"
        ? "Feriado activado."
        : "Feriado desactivado."
    );

}



/*=====================================================
CONFIGURACIÓN DEL FERIADO
=====================================================*/

function abrirConfiguracionFeriado(){

    if(!feriadoSeleccionado) return;


    tituloConfigurarFeriado.textContent =
        feriadoSeleccionado.nombre;

    fechaConfigurarFeriado.textContent =
        obtenerTextoRangoFechas(
            feriadoSeleccionado.fechaInicio,
            feriadoSeleccionado.fechaFin
        );


    reglaGeneralFeriado.value =
        feriadoSeleccionado.reglaGeneral ||
        "TODOS_DESCANSAN";

    tratamientoTrabajoFeriado.value =
        feriadoSeleccionado.tratamientoTrabajo ||
        "PENDIENTE";

    noRegistrarFaltaFeriado.checked =
        feriadoSeleccionado.noRegistrarFalta !==
        false;

    identificarFeriadoLaborado.checked =
        feriadoSeleccionado
        .identificarFeriadoLaborado !==
        false;


    excepcionesSeleccionadas = {

        SUCURSAL:new Set(
            feriadoSeleccionado
            .excepciones?.sucursales ||
            []
        ),

        AREA:new Set(
            feriadoSeleccionado
            .excepciones?.areas ||
            []
        ),

        SUBAREA:new Set(
            feriadoSeleccionado
            .excepciones?.subareas ||
            []
        ),

        COLABORADOR:new Set(
            feriadoSeleccionado
            .excepciones?.colaboradores ||
            []
        )

    };


    alcanceExcepcionActual =
        "SUCURSAL";

    document
    .querySelectorAll(".feriado-alcance-btn")
    .forEach(boton=>{

        boton.classList.toggle(
            "activo",
            boton.dataset.alcance ===
            "SUCURSAL"
        );

    });


    actualizarPlaceholderExcepciones();

    renderizarExcepciones();

    actualizarCantidadExcepciones();


    modalConfigurarFeriado.classList.add(
        "activo"
    );

}



/*=====================================================
RENDERIZAR EXCEPCIONES
=====================================================*/

function renderizarExcepciones(){

    const elementos =
        obtenerElementosAlcance(
            alcanceExcepcionActual
        );

    const texto =
        buscarExcepcionFeriado.value
        .trim()
        .toLowerCase();


    const filtrados =
        elementos.filter(
            elemento=>
                obtenerNombreElemento(
                    elemento,
                    alcanceExcepcionActual
                )
                .toLowerCase()
                .includes(texto)
        );


    if(filtrados.length === 0){

        listaExcepcionesFeriado.innerHTML =
        `
            <div class="feriado-excepciones-vacio">

                <i class="bi bi-inboxes"></i>

                <p>
                    No hay elementos para mostrar.
                </p>

            </div>
        `;

        return;

    }


    listaExcepcionesFeriado.innerHTML =
        filtrados
        .map(elemento=>{

            const nombre =
                obtenerNombreElemento(
                    elemento,
                    alcanceExcepcionActual
                );

            const descripcion =
                obtenerDescripcionElemento(
                    elemento,
                    alcanceExcepcionActual
                );

            const marcado =
                excepcionesSeleccionadas[
                    alcanceExcepcionActual
                ].has(elemento.id)
                ? "checked"
                : "";

            return `
                <label class="feriado-excepcion-item">

                    <input
                        type="checkbox"
                        value="${elemento.id}"
                        ${marcado}
                    >

                    <div class="feriado-excepcion-datos">

                        <strong>
                            ${escaparHTML(nombre)}
                        </strong>

                        <span>
                            ${escaparHTML(descripcion)}
                        </span>

                    </div>

                </label>
            `;

        })
        .join("");


    listaExcepcionesFeriado
    .querySelectorAll(
        'input[type="checkbox"]'
    )
    .forEach(check=>{

        check.onchange = ()=>{

            const conjunto =
                excepcionesSeleccionadas[
                    alcanceExcepcionActual
                ];


            if(check.checked){

                conjunto.add(check.value);

            }
            else{

                conjunto.delete(check.value);

            }


            actualizarCantidadExcepciones();

        };

    });

}



/*=====================================================
GUARDAR CONFIGURACIÓN
=====================================================*/

async function guardarConfiguracion(){

    if(!feriadoSeleccionado) return;


    const datos = {

        reglaGeneral:
            reglaGeneralFeriado.value,

        tratamientoTrabajo:
            tratamientoTrabajoFeriado.value,

        noRegistrarFalta:
            noRegistrarFaltaFeriado.checked,

        identificarFeriadoLaborado:
            identificarFeriadoLaborado.checked,

        configurado:
            reglaGeneralFeriado.value !==
            "POR_CONFIGURAR",

        excepciones:{

            sucursales:[
                ...excepcionesSeleccionadas
                .SUCURSAL
            ],

            areas:[
                ...excepcionesSeleccionadas
                .AREA
            ],

            subareas:[
                ...excepcionesSeleccionadas
                .SUBAREA
            ],

            colaboradores:[
                ...excepcionesSeleccionadas
                .COLABORADOR
            ]

        },

        fechaActualizacion:
            serverTimestamp(),

        actualizadoPor:
            auth.currentUser?.uid ||
            null

    };


    try{

        await updateDoc(
            doc(
                db,
                "feriados",
                feriadoSeleccionado.id
            ),
            datos
        );


        cerrarModalConfiguracion();

        await mostrarExito(
            "Configuración guardada correctamente."
        );

    }
    catch(error){

        console.error(
            "Error guardando configuración:",
            error
        );

        mostrarError(
            "No se pudo guardar la configuración."
        );

    }

}



/*=====================================================
CALCULAR APLICACIÓN POR COLABORADOR
=====================================================*/

function calcularAplicacionColaboradores(){

    if(!feriadoSeleccionado){

        return [];

    }


    const regla =
        feriadoSeleccionado.reglaGeneral ||
        "POR_CONFIGURAR";

    const excepciones =
        feriadoSeleccionado.excepciones ||
        {};


    return colaboradoresFeriado.map(
        colaborador=>{

            let resultado;


            if(regla === "POR_CONFIGURAR"){

                resultado =
                    "PENDIENTE";

            }
            else{

                resultado =
                    regla === "TODOS_DESCANSAN"
                    ? "DESCANSA"
                    : "TRABAJA";


                const esExcepcion =
                    colaboradorEsExcepcion(
                        colaborador,
                        excepciones
                    );


                if(esExcepcion){

                    resultado =
                        resultado === "DESCANSA"
                        ? "TRABAJA"
                        : "DESCANSA";

                }

            }


            return {

                colaborador,

                resultado,

                regla:
                    colaboradorEsExcepcion(
                        colaborador,
                        excepciones
                    )
                    ? "Excepción"
                    : "Regla general"

            };

        }
    );

}



/*=====================================================
DETERMINAR EXCEPCIÓN
=====================================================*/

function colaboradorEsExcepcion(
    colaborador,
    excepciones
){

    const sucursalId =
        colaborador.organizacion?.sucursalId ||
        colaborador.sucursalId ||
        "";

    const areaId =
        colaborador.organizacion?.areaId ||
        colaborador.areaId ||
        "";

    const subareaId =
        colaborador.organizacion?.subareaId ||
        colaborador.subareaId ||
        "";


    return (

        (
            excepciones.sucursales ||
            []
        ).includes(sucursalId)

        ||

        (
            excepciones.areas ||
            []
        ).includes(areaId)

        ||

        (
            excepciones.subareas ||
            []
        ).includes(subareaId)

        ||

        (
            excepciones.colaboradores ||
            []
        ).includes(colaborador.id)

    );

}



/*=====================================================
LISTADO DE COLABORADORES
=====================================================*/

async function abrirListadoColaboradores(){

    console.log(
        "ABRIENDO LISTADO DE COLABORADORES"
    );

    
    if(!feriadoSeleccionado){

        return;

    }


    /*
        Recargar colaboradores, organización y descansos
        antes de construir el listado.
    */

    await cargarDatosOrganizacion();


    console.log(
        "Colaboradores cargados para feriado:",
        colaboradoresFeriado.length
    );


    tituloColaboradoresFeriado.textContent =
        feriadoSeleccionado.nombre;


    subtituloColaboradoresFeriado.textContent =
        obtenerTextoRangoFechas(
            feriadoSeleccionado.fechaInicio,
            feriadoSeleccionado.fechaFin
        );


    buscarColaboradorFeriado.value =
        "";


    filtroResultadoFeriado.value =
        "";


    renderizarTablaColaboradores();


    modalColaboradoresFeriado.classList.add(
        "activo"
    );

}



/*=====================================================
TABLA DE COLABORADORES
=====================================================*/

function renderizarTablaColaboradores(){

    const texto =
        buscarColaboradorFeriado.value
        .trim()
        .toLowerCase();

    const filtro =
        filtroResultadoFeriado.value;

    const resultados =
        calcularAplicacionColaboradores()
        .filter(item=>{

            const nombre =
                obtenerNombreColaborador(
                    item.colaborador
                ).toLowerCase();

            const documento =
                obtenerDocumentoColaborador(
                    item.colaborador
                ).toLowerCase();

            const coincideTexto =
                !texto ||
                nombre.includes(texto) ||
                documento.includes(texto);

            const coincideResultado =
                !filtro ||
                item.resultado === filtro;


            return (
                coincideTexto &&
                coincideResultado
            );

        });


    if(resultados.length === 0){

        tablaColaboradoresFeriado.innerHTML =
        `
            <tr>

                <td
                    colspan="6"
                    class="tabla-feriados-vacia"
                >
                    No hay colaboradores para mostrar.
                </td>

            </tr>
        `;

        return;

    }


    tablaColaboradoresFeriado.innerHTML =
        resultados
        .map(item=>{

            const colaborador =
                item.colaborador;


            const descansoAsignado =
    descansosSustitutoriosFeriado.find(
        descanso=>

            descanso.feriadoId ===
            feriadoSeleccionado.id

            &&

            descanso.colaboradorId ===
            colaborador.id

            &&

            String(
                descanso.estado ||
                "ACTIVO"
            )
            .toUpperCase() ===
            "ACTIVO"

    )
    ||
    null;

            const sucursalId =
                colaborador.organizacion?.sucursalId ||
                colaborador.sucursalId;

            const areaId =
                colaborador.organizacion?.areaId ||
                colaborador.areaId;


            return `
                <tr>

                    <td>

                        <strong>
                            ${escaparHTML(
                                obtenerNombreColaborador(
                                    colaborador
                                )
                            )}
                        </strong>

                        <br>

                        <small>
                            ${escaparHTML(
                                obtenerDocumentoColaborador(
                                    colaborador
                                )
                            )}
                        </small>

                    </td>

                    <td>
                        ${escaparHTML(
                            obtenerNombrePorId(
                                sucursalesFeriado,
                                sucursalId
                            )
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            obtenerNombrePorId(
                                areasFeriado,
                                areaId
                            )
                        )}
                    </td>

                    <td>
                        ${item.regla}
                    </td>

                    <td>

                        <span
                            class="
                                feriado-resultado-badge
                                ${item.resultado.toLowerCase()}
                            "
                        >
                            ${formatearResultado(
                                item.resultado
                            )}
                        </span>

                    </td>

<td>

    <span class="feriado-tratamiento-badge">

        ${
            item.resultado ===
            "TRABAJA"
            ?
            obtenerTextoTratamiento(
                feriadoSeleccionado
                .tratamientoTrabajo
            )
            :
            "No corresponde"
        }

    </span>


    ${
        item.resultado ===
        "TRABAJA"

        &&

        (
            descansoAsignado

            ||

            feriadoSeleccionado
            .tratamientoTrabajo ===
            "DESCANSO_SUSTITUTORIO"

            ||

            feriadoSeleccionado
            .tratamientoTrabajo ===
            "PAGO_Y_DESCANSO"
        )
        ?
        `
            <button
                type="button"
                class="
    btn-registrar-descanso-sustitutorio
    ${descansoAsignado ? "tiene-descanso" : ""}
"
                data-colaborador-id="${escaparHTML(
                    colaborador.id
                )}"
                data-descanso-id="${escaparHTML(
                    descansoAsignado?.id
                    ||
                    ""
                )}"
            >

                <i class="bi bi-calendar-plus"></i>

                ${
                    descansoAsignado
                    ?
                    `Reprogramar: ${escaparHTML(
                        descansoAsignado.fechaDescanso
                    )}`
                    :
                    "Registrar descanso"
                }

            </button>
        `
        :
        ""
    }

</td>
                </tr>
            `;

        })
        .join("");


    tablaColaboradoresFeriado
.querySelectorAll(
    ".btn-registrar-descanso-sustitutorio"
)
.forEach(boton=>{

    boton.onclick = ()=>{

        const colaborador =
            colaboradoresFeriado.find(
                item=>
                    item.id ===
                    boton.dataset.colaboradorId
            );

        const descanso =
    descansosSustitutoriosFeriado.find(
        item=>
            item.id ===
            boton.dataset.descansoId
    )
    ||
    null;


        if(colaborador){

abrirDescansoSustitutorio(
    colaborador,
    descanso
);

        }

    };

});

}



/*=====================================================
ELEMENTOS DE EXCEPCIÓN
=====================================================*/

function obtenerElementosAlcance(
    alcance
){

    if(alcance === "SUCURSAL"){

        return sucursalesFeriado;

    }

    if(alcance === "AREA"){

        return areasFeriado;

    }

    if(alcance === "SUBAREA"){

        return subareasFeriado;

    }

    return colaboradoresFeriado;

}



function obtenerNombreElemento(
    elemento,
    alcance
){

    if(alcance === "COLABORADOR"){

        return obtenerNombreColaborador(
            elemento
        );

    }


    return (
        elemento.nombre ||
        elemento.descripcion ||
        elemento.razonSocial ||
        "Sin nombre"
    );

}



function obtenerDescripcionElemento(
    elemento,
    alcance
){

    if(alcance === "COLABORADOR"){

        return obtenerDocumentoColaborador(
            elemento
        );

    }


    if(alcance === "AREA"){

        return "Área de la empresa";

    }


    if(alcance === "SUBAREA"){

        return "Subárea de la empresa";

    }


    return "Sucursal de la empresa";

}



/*=====================================================
AUXILIARES DE INTERFAZ
=====================================================*/

function actualizarPlaceholderExcepciones(){

    const nombres = {

        SUCURSAL:"Buscar sucursal...",

        AREA:"Buscar área...",

        SUBAREA:"Buscar subárea...",

        COLABORADOR:"Buscar colaborador..."

    };


    buscarExcepcionFeriado.placeholder =
        nombres[alcanceExcepcionActual];

}



function actualizarCantidadExcepciones(){

    const cantidad =

        excepcionesSeleccionadas.SUCURSAL.size +

        excepcionesSeleccionadas.AREA.size +

        excepcionesSeleccionadas.SUBAREA.size +

        excepcionesSeleccionadas.COLABORADOR.size;


    cantidadExcepcionesSeleccionadas.textContent =
        cantidad;

}



function actualizarAnioPorCalendario(){

    anioSeleccionadoFeriados =
        fechaCalendarioFeriados.getFullYear();

    selectorAnioFeriados.value =
        anioSeleccionadoFeriados;

}



/*=====================================================
CERRAR MODALES
=====================================================*/

function cerrarFormularioFeriado(){

    modalFeriado.classList.remove("activo");

}



function cerrarModalConfiguracion(){

    modalConfigurarFeriado.classList.remove(
        "activo"
    );

}



function cerrarListadoColaboradores(){

    modalColaboradoresFeriado.classList.remove(
        "activo"
    );

}



function registrarCierrePorFondo(
    modal,
    funcionCerrar
){

    if(!modal) return;


    modal.onclick = evento=>{

        if(evento.target === modal){

            funcionCerrar();

        }

    };

}



/*=====================================================
NOMBRES Y FORMATEOS
=====================================================*/

function obtenerNombreTipo(
    tipo
){

    const nombres = {

        FERIADO_NACIONAL:
            "Feriado nacional",

        DIA_NO_LABORABLE:
            "Día no laborable",

        FERIADO_REGIONAL:
            "Feriado regional",

        FERIADO_LOCAL:
            "Feriado local",

        DIA_INSTITUCIONAL:
            "Día institucional",

        CIERRE_EXTRAORDINARIO:
            "Cierre extraordinario"

    };


    return nombres[tipo] || "Fecha especial";

}



function obtenerClaseTipo(
    tipo
){

    const clases = {

        FERIADO_NACIONAL:
            "feriado-nacional",

        DIA_NO_LABORABLE:
            "dia-no-laborable",

        FERIADO_REGIONAL:
            "feriado-regional",

        FERIADO_LOCAL:
            "feriado-local",

        DIA_INSTITUCIONAL:
            "dia-institucional",

        CIERRE_EXTRAORDINARIO:
            "cierre-extraordinario"

    };


    return clases[tipo] || "dia-institucional";

}



function obtenerTextoRegla(
    regla
){

    const reglas = {

        TODOS_DESCANSAN:
            "Toda la empresa descansa",

        TODOS_TRABAJAN:
            "Toda la empresa trabaja normalmente",

        POR_CONFIGURAR:
            "Pendiente de configurar"

    };


    return reglas[regla] ||
        "Pendiente de configurar";

}



function obtenerDescripcionRegla(
    regla
){

    if(regla === "TODOS_DESCANSAN"){

        return (
            "Los colaboradores descansarán, salvo quienes " +
            "estén registrados como excepción."
        );

    }


    if(regla === "TODOS_TRABAJAN"){

        return (
            "Los colaboradores trabajarán normalmente, salvo " +
            "quienes estén registrados como excepción."
        );

    }


    return (
        "Todavía no se ha definido quién descansa y quién trabaja."
    );

}

/*=====================================================
ABRIR DESCANSO SUSTITUTORIO
=====================================================*/

function abrirDescansoSustitutorio(
    colaborador,
    descansoExistente = null
){

    if(
        !feriadoSeleccionado
        ||
        !colaborador
    ){

        return;

    }


    const tratamiento =
        feriadoSeleccionado
        .tratamientoTrabajo
        ||
        "PENDIENTE";


    if(
        tratamiento !==
        "DESCANSO_SUSTITUTORIO"

        &&

        tratamiento !==
        "PAGO_Y_DESCANSO"
    ){

        mostrarAdvertencia(
            "Este feriado no está configurado con descanso sustitutorio."
        );

        return;

    }


    colaboradorDescansoSeleccionado =
        colaborador;

    descansoSustitutorioSeleccionado =
    descansoExistente;


    feriadoTrabajadoId.value =
        feriadoSeleccionado.id;


    colaboradorDescansoId.value =
        colaborador.id;


    const nombre =
        obtenerNombreColaborador(
            colaborador
        );


    const documento =
        obtenerDocumentoColaborador(
            colaborador
        );


    avatarColaboradorDescanso.textContent =
        obtenerInicialesFeriado(
            nombre
        );


    nombreColaboradorDescanso.textContent =
        nombre;


    documentoColaboradorDescanso.textContent =
        documento
        ?
        `Documento: ${documento}`
        :
        "Sin documento";


    const fechaMinima =
        sumarDiasFechaISO(
            feriadoSeleccionado.fechaFin,
            1
        );


    fechaDescansoSustitutorio.min =
        fechaMinima;


fechaDescansoSustitutorio.value =
    descansoExistente
    ?.fechaDescanso
    ||
    fechaMinima;


observacionDescansoSustitutorio.value =
    descansoExistente
    ?.observacion
    ||
    "";


anularDescansoSustitutorio.style.display =
    descansoExistente
    ?
    "inline-flex"
    :
    "none";


guardarDescansoSustitutorio.innerHTML =
    descansoExistente
    ?
    `
        <i class="bi bi-check-lg"></i>
        Guardar cambios
    `
    :
    `
        <i class="bi bi-check-lg"></i>
        Guardar descanso
    `;

    modalDescansoSustitutorio.classList.add(
        "activo"
    );

}


/*=====================================================
CERRAR DESCANSO SUSTITUTORIO
=====================================================*/

function cerrarModalDescansoSustitutorio(){

    modalDescansoSustitutorio
    ?.classList
    .remove(
        "activo"
    );


    descansoSustitutorioSeleccionado =
    null;
    
    colaboradorDescansoSeleccionado =
        null;


    if(feriadoTrabajadoId){

        feriadoTrabajadoId.value =
            "";

    }


    if(colaboradorDescansoId){

        colaboradorDescansoId.value =
            "";

    }


    if(fechaDescansoSustitutorio){

        fechaDescansoSustitutorio.value =
            "";

    }


    if(observacionDescansoSustitutorio){

        observacionDescansoSustitutorio.value =
            "";

    }

    if(anularDescansoSustitutorio){

    anularDescansoSustitutorio.style.display =
        "none";

}
    

}


/*=====================================================
GUARDAR DESCANSO SUSTITUTORIO
=====================================================*/

async function guardarDescansoSustitutorioFirestore(){

    if(
        !feriadoSeleccionado
        ||
        !colaboradorDescansoSeleccionado
    ){

        mostrarAdvertencia(
            "No se encontró el feriado o colaborador."
        );

        return;

    }


    const fechaDescanso =
        fechaDescansoSustitutorio.value;


    if(!fechaDescanso){

        mostrarAdvertencia(
            "Selecciona la fecha del descanso sustitutorio."
        );

        fechaDescansoSustitutorio.focus();

        return;

    }

    const coincideConOtroFeriado =
    feriadosEmpresa.some(
        feriado=>

            String(
                feriado.estado ||
                "ACTIVO"
            )
            .toUpperCase() ===
            "ACTIVO"

            &&

            feriado.fechaInicio <=
            fechaDescanso

            &&

            feriado.fechaFin >=
            fechaDescanso

    );


if(coincideConOtroFeriado){

    mostrarAdvertencia(
        "La fecha seleccionada corresponde a otro feriado. Selecciona un día laborable."
    );

    return;

}


    if(
        fechaDescanso <=
        feriadoSeleccionado.fechaFin
    ){

        mostrarAdvertencia(
            "El descanso sustitutorio debe ser posterior al feriado trabajado."
        );

        return;

    }


    const colaborador =
        colaboradorDescansoSeleccionado;


    const horariosFechaDescanso =
    obtenerHorariosEfectivosDescanso({

        colaboradorId:
            colaborador.id,

        fecha:
            fechaDescanso,

        asignaciones:
            asignacionesHorariosFeriado,

        excepciones:
            excepcionesHorariosFeriado

    });


if(
    horariosFechaDescanso.length ===
    0
){

    mostrarAdvertencia(
        "La fecha seleccionada no corresponde a un día laborable del colaborador. Elige una fecha en la que tenga horario asignado."
    );

    return;

}


/*
    Evitar que el colaborador tenga más de un descanso
    sustitutorio activo en la misma fecha.
*/

const descansoDuplicado =
    descansosSustitutoriosFeriado.find(
        descanso=>

            descanso.empresaId ===
            empresaId

            &&

            descanso.colaboradorId ===
            colaborador.id

            &&

            descanso.fechaDescanso ===
            fechaDescanso

            &&

            String(
                descanso.estado ||
                "ACTIVO"
            )
            .toUpperCase() ===
            "ACTIVO"

            &&

            descanso.id !==
            descansoSustitutorioSeleccionado?.id
    );


if(descansoDuplicado){

    mostrarAdvertencia(
        "El colaborador ya tiene otro descanso sustitutorio registrado en esta fecha."
    );

    return;

}

    

    const idDocumento =
        `${empresaId}_${feriadoSeleccionado.id}_${colaborador.id}`
        .replaceAll(
            "/",
            "-"
        );

    const referenciaDescanso =
    doc(
        db,
        "descansosSustitutoriosFeriados",
        idDocumento
    );


const documentoDescanso =
    await getDoc(
        referenciaDescanso
    );


    const datos = {

        empresaId,

        feriadoId:
            feriadoSeleccionado.id,

        feriadoNombre:
            feriadoSeleccionado.nombre,

        fechaFeriadoInicio:
            feriadoSeleccionado.fechaInicio,

        fechaFeriadoFin:
            feriadoSeleccionado.fechaFin,

        colaboradorId:
            colaborador.id,

        colaboradorNombre:
            obtenerNombreColaborador(
                colaborador
            ),

        colaboradorDocumento:
            obtenerDocumentoColaborador(
                colaborador
            ),

        fechaDescanso,

        tratamiento:
            feriadoSeleccionado
            .tratamientoTrabajo,

        observacion:
            observacionDescansoSustitutorio
            .value
            .trim(),

estado:
    "ACTIVO",

actualizadoPor:
    auth.currentUser?.uid
    ||
    null,

anuladoPor:
    null,

fechaAnulacion:
    null,

fechaActualizacion:
    serverTimestamp()

    };

if(!documentoDescanso.exists()){

    datos.creadoPor =
        auth.currentUser?.uid
        ||
        null;

    datos.fechaCreacion =
        serverTimestamp();

}

    guardarDescansoSustitutorio.disabled =
        true;

    const estabaEditando =
    Boolean(
        descansoSustitutorioSeleccionado
    );

    try{

await setDoc(
    referenciaDescanso,
    datos,
    {
        merge:true
    }
);

 /*
        Volver a cargar los descansos para que
        la tabla muestre el registro actualizado.
    */

    await cargarDatosOrganizacion();


    cerrarModalDescansoSustitutorio();


    renderizarTablaColaboradores();



await mostrarExito(
    estabaEditando
    ?
    "Descanso sustitutorio actualizado correctamente."
    :
    "Descanso sustitutorio registrado correctamente."
);

    }
    catch(error){

        console.error(
            "Error guardando descanso sustitutorio:",
            error
        );


        mostrarError(
            "No se pudo guardar el descanso sustitutorio."
        );

    }
    finally{

        guardarDescansoSustitutorio.disabled =
            false;

    }

}

async function anularDescansoSustitutorioFirestore(){

    if(!descansoSustitutorioSeleccionado){

        return;

    }


    const confirmacion =
        await Swal.fire({

            title:
                "¿Anular descanso sustitutorio?",

            text:
                "La fecha volverá a calcularse como un día normal de asistencia.",

            icon:
                "warning",

            showCancelButton:
                true,

            confirmButtonText:
                "Sí, anular",

            cancelButtonText:
                "Cancelar",

            confirmButtonColor:
                "#dc2626"

        });


    if(!confirmacion.isConfirmed){

        return;

    }


    try{

        await updateDoc(
            doc(
                db,
                "descansosSustitutoriosFeriados",
                descansoSustitutorioSeleccionado.id
            ),
            {

                estado:
                    "ANULADO",

                anuladoPor:
                    auth.currentUser?.uid
                    ||
                    null,

                fechaAnulacion:
                    serverTimestamp(),

                fechaActualizacion:
                    serverTimestamp()

            }
        );


        cerrarModalDescansoSustitutorio();

        await cargarDatosOrganizacion();

        renderizarTablaColaboradores();


        await mostrarExito(
            "Descanso sustitutorio anulado."
        );

    }
    catch(error){

        console.error(
            "Error anulando descanso sustitutorio:",
            error
        );


        mostrarError(
            "No se pudo anular el descanso sustitutorio."
        );

    }

}




/*=====================================================
OBTENER INICIALES
=====================================================*/

function obtenerInicialesFeriado(
    nombre
){

    return String(
        nombre ||
        ""
    )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(
        0,
        2
    )
    .map(
        palabra=>
            palabra.charAt(0)
            .toUpperCase()
    )
    .join("")
    ||
    "--";

}

function obtenerTextoTratamiento(
    tratamiento
){

    const tratamientos = {

        PENDIENTE:
            "Pendiente de definir",

        PAGO_ADICIONAL:
            "Pago adicional",

        DESCANSO_SUSTITUTORIO:
            "Descanso sustitutorio",

        PAGO_Y_DESCANSO:
            "Pago adicional y descanso",

        JORNADA_NORMAL:
            "Jornada normal"

    };


    return tratamientos[tratamiento] ||
        "Pendiente de definir";

}



function formatearEstado(
    estado
){

    return estado === "INACTIVO"
        ? "Inactivo"
        : "Activo";

}



function formatearAmbito(
    ambito
){

    const nombres = {

        NACIONAL:"Nacional",

        REGIONAL:"Regional",

        LOCAL:"Local",

        EMPRESA:"Empresa"

    };


    return nombres[ambito] || "Empresa";

}



function formatearResultado(
    resultado
){

    const resultados = {

        DESCANSA:"Descansa",

        TRABAJA:"Trabaja",

        PENDIENTE:"Pendiente"

    };


    return resultados[resultado] || resultado;

}



/*=====================================================
DATOS DEL COLABORADOR
=====================================================*/

function obtenerNombreColaborador(
    colaborador
){

    const nombres =
        colaborador.datosPersonales?.nombres ||
        colaborador.nombres ||
        colaborador.nombre ||
        "";

    const apellidos =
        colaborador.datosPersonales?.apellidos ||
        colaborador.apellidos ||
        colaborador.apellido ||
        "";


    return (
        `${nombres} ${apellidos}`
        .replace(/\s+/g," ")
        .trim() ||
        "Sin nombre"
    );

}



function obtenerDocumentoColaborador(
    colaborador
){

    return String(
        colaborador.documento?.numero ||
        colaborador.numeroDocumento ||
        colaborador.dni ||
        "Sin documento"
    );

}



function obtenerNombrePorId(
    lista,
    id
){

    if(!id) return "Sin asignar";


    const elemento =
        lista.find(
            item=>item.id === id
        );


    return (
        elemento?.nombre ||
        elemento?.descripcion ||
        "Sin asignar"
    );

}



/*=====================================================
FECHAS
=====================================================*/

function formarFechaISO(
    anio,
    mes,
    dia
){

    return (
        `${anio}-` +
        `${String(mes).padStart(2,"0")}-` +
        `${String(dia).padStart(2,"0")}`
    );

}



function obtenerFechaISO(
    fecha
){

    return formarFechaISO(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        fecha.getDate()
    );

}



function convertirFechaLocal(
    fechaISO
){

    const [
        anio,
        mes,
        dia
    ] = fechaISO
        .split("-")
        .map(Number);


    return new Date(
        anio,
        mes - 1,
        dia
    );

}


/*=====================================================
SUMAR DÍAS A UNA FECHA ISO
=====================================================*/

function sumarDiasFechaISO(
    fechaISO,
    cantidadDias
){

    const fecha =
        convertirFechaLocal(
            fechaISO
        );


    fecha.setDate(
        fecha.getDate() +
        cantidadDias
    );


    return formarFechaISO(

        fecha.getFullYear(),

        fecha.getMonth() + 1,

        fecha.getDate()

    );

}



/*=====================================================
OBTENER HORARIOS EFECTIVOS DEL DESCANSO
=====================================================*/

function obtenerHorariosEfectivosDescanso({

    colaboradorId,
    fecha,
    asignaciones,
    excepciones

}){

    let horarioIds = [];


    asignaciones
    .filter(
        asignacion=>

            String(
                asignacion.estado ||
                "ACTIVO"
            )
            .toUpperCase() !==
            "INACTIVO"

            &&

            Array.isArray(
                asignacion.colaboradorIds
            )

            &&

            asignacion.colaboradorIds.includes(
                colaboradorId
            )
    )
    .forEach(asignacion=>{

        horarioIds.push(
            ...obtenerHorariosAsignacionDescanso(
                asignacion,
                fecha
            )
        );

    });


    horarioIds = [

        ...new Set(
            horarioIds.filter(Boolean)
        )

    ];


    const excepcion =
        excepciones.find(
            item=>

                item.colaboradorId ===
                colaboradorId

                &&

                item.fecha ===
                fecha

                &&

                String(
                    item.estado ||
                    "ACTIVO"
                )
                .toUpperCase() !==
                "INACTIVO"
        );


    if(!excepcion){

        return horarioIds;

    }


    if(
        excepcion.tipo ===
        "SIN_HORARIO"
    ){

        return [];

    }


    if(
        excepcion.tipo ===
        "REEMPLAZAR"
    ){

        return [

            ...new Set(
                (
                    excepcion.horarioIds ||
                    []
                )
                .filter(Boolean)
            )

        ];

    }


    if(
        excepcion.tipo ===
        "AGREGAR"
    ){

        return [

            ...new Set([

                ...horarioIds,

                ...(
                    excepcion.horarioIds ||
                    []
                )

            ].filter(Boolean))

        ];

    }


    return horarioIds;

}



/*=====================================================
OBTENER HORARIOS DE UNA ASIGNACIÓN
=====================================================*/

function obtenerHorariosAsignacionDescanso(
    asignacion,
    fecha
){

    if(
        asignacion.tipoAsignacion ===
        "DIARIA"
    ){

        return (
            asignacion.fechaInicio ===
            fecha
        )
        ?
        [
            asignacion.horarioId
        ].filter(Boolean)
        :
        [];

    }


    if(
        asignacion.tipoAsignacion ===
        "MENSUAL"
    ){

        return (
            asignacion.programacion ||
            []
        )
        .filter(
            item=>
                item.fecha ===
                fecha
        )
        .map(
            item=>
                item.horarioId
        )
        .filter(Boolean);

    }


    if(
        asignacion.tipoAsignacion ===
        "SEMANAL"
    ){

        return obtenerHorariosSemanalesDescanso(
            asignacion,
            fecha
        );

    }


    return [];

}



/*=====================================================
OBTENER HORARIOS DE ASIGNACIÓN SEMANAL
=====================================================*/

function obtenerHorariosSemanalesDescanso(
    asignacion,
    fecha
){

    if(
        !asignacion.fechaInicio

        ||

        !asignacion.fechaFin

        ||

        fecha <
        asignacion.fechaInicio

        ||

        fecha >
        asignacion.fechaFin
    ){

        return [];

    }


    const inicio =
        convertirFechaLocal(
            asignacion.fechaInicio
        );


    const seleccionada =
        convertirFechaLocal(
            fecha
        );


    const diferenciaDias =
        Math.floor(
            (
                seleccionada -
                inicio
            )
            /
            86400000
        );


    const numeroSemana =
        Math.floor(
            diferenciaDias /
            7
        );


    const intervalo =
        Number(
            asignacion.intervaloSemanas ||
            1
        );


    if(
        numeroSemana %
        intervalo !==
        0
    ){

        return [];

    }


    const nombresDias = [

        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado"

    ];


    const nombreDia =
        nombresDias[
            seleccionada.getDay()
        ];


    const horarioIds =
        asignacion.programacionSemanal
        ?.[nombreDia];


    return Array.isArray(
        horarioIds
    )
    ?
    horarioIds.filter(Boolean)
    :
    [];

}



function obtenerTextoRangoFechas(
    inicio,
    fin
){

    const formato =
        new Intl.DateTimeFormat(
            "es-PE",
            {
                day:"numeric",
                month:"long",
                year:"numeric"
            }
        );


    const inicioTexto =
        formato.format(
            convertirFechaLocal(inicio)
        );


    if(inicio === fin){

        return inicioTexto;

    }


    return (
        `${inicioTexto} al ` +
        formato.format(
            convertirFechaLocal(fin)
        )
    );

}



/*=====================================================
ESCAPAR HTML
=====================================================*/

function escaparHTML(
    valor
){

    return String(valor ?? "")

    .replaceAll("&","&amp;")

    .replaceAll("<","&lt;")

    .replaceAll(">","&gt;")

    .replaceAll('"',"&quot;")

    .replaceAll("'","&#039;");

}



/*=====================================================
ALERTAS
=====================================================*/

function mostrarAdvertencia(
    mensaje
){

    Swal.fire({

        title:"Atención",

        text:mensaje,

        icon:"warning",

        confirmButtonText:"Entendido"

    });

}



function mostrarError(
    mensaje
){

    Swal.fire({

        title:"Error",

        text:mensaje,

        icon:"error",

        confirmButtonText:"Entendido"

    });

}



async function mostrarExito(
    mensaje
){

    await Swal.fire({

        title:"Correcto",

        text:mensaje,

        icon:"success",

        timer:1800,

        timerProgressBar:true,

        confirmButtonText:"Entendido"

    });

}
