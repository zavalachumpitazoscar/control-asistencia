import {
    auth,
    db
}
from "../firebase-config.js";


import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



/*=====================================================
VARIABLES GENERALES
=====================================================*/

let empresaId = null;

let colaboradoresPermisos = [];

let colaboradoresFiltradosPermisos = [];

let colaboradorPermisoSeleccionado = null;

let permisosColaborador = [];

let permisoSeleccionado = null;

let fechaCalendarioPermisos = new Date();

let cancelarEscuchaPermisos = null;



/*=====================================================
ELEMENTOS HTML
=====================================================*/

let cantidadColaboradoresPermisos;

let buscarColaboradorPermiso;

let listaColaboradoresPermisos;

let permisosSinColaborador;

let permisosCalendarioContenido;

let permisosAvatarColaborador;

let permisosNombreColaborador;

let permisosDocumentoColaborador;

let btnHistorialPermisos;

let btnNuevoPermiso;

let btnMesAnteriorPermisos;

let btnMesSiguientePermisos;

let btnHoyPermisos;

let tituloMesPermisos;

let permisosDiasMes;


/* MODAL FORMULARIO */

let modalPermiso;

let cerrarModalPermiso;

let cancelarModalPermiso;

let tituloModalPermiso;

let subtituloModalPermiso;

let formularioPermiso;

let permisoId;

let modalPermisoAvatar;

let modalPermisoColaborador;

let modalPermisoDocumento;

let tipoPermiso;

let fechaInicioPermiso;

let fechaFinPermiso;

let contenedorMedioDiaPermiso;

let mitadDiaPermiso;

let contenedorHorasPermiso;

let horaInicioPermiso;

let horaFinPermiso;

let motivoPermiso;

let observacionesPermiso;

let documentoPermiso;

let archivoPermisoSeleccionado;

let estadoPermiso;

let guardarPermiso;


/* MODAL DETALLE */

let modalDetallePermiso;

let cerrarDetallePermiso;

let detallePermisoTipo;

let detallePermisoFechas;

let detallePermisoEstado;

let detallePermisoDuracion;

let detallePermisoMotivo;

let detallePermisoObservaciones;

let detallePermisoDocumento;

let btnAnularPermiso;

let btnRechazarPermiso;

let btnEditarPermiso;

let btnAprobarPermiso;



/*=====================================================
INICIAR MÓDULO
=====================================================*/

export async function iniciarPermisos(){

    obtenerElementosPermisos();

    if(
        !listaColaboradoresPermisos ||
        !permisosDiasMes
    ){

        console.error(
            "No se encontraron los elementos del módulo de permisos."
        );

        return;

    }


    empresaId =
        sessionStorage.getItem("empresaId");


    if(!empresaId){

        const usuario = auth.currentUser;

        if(usuario){

            const referenciaUsuario =
                doc(
                    db,
                    "usuarios",
                    usuario.uid
                );

            const documentoUsuario =
                await getDoc(referenciaUsuario);

            if(documentoUsuario.exists()){

                empresaId =
                    documentoUsuario.data().empresaId || null;

                if(empresaId){

                    sessionStorage.setItem(
                        "empresaId",
                        empresaId
                    );

                }

            }

        }

    }


    if(!empresaId){

        console.error(
            "No se encontró el empresaId."
        );

        mostrarAlertaError(
            "No se pudo identificar la empresa."
        );

        return;

    }


    fechaCalendarioPermisos =
        new Date();

    registrarEventosPermisos();

    await cargarColaboradoresPermisos();

}



/*=====================================================
OBTENER ELEMENTOS
=====================================================*/

function obtenerElementosPermisos(){

    cantidadColaboradoresPermisos =
        document.getElementById(
            "cantidadColaboradoresPermisos"
        );

    buscarColaboradorPermiso =
        document.getElementById(
            "buscarColaboradorPermiso"
        );

    listaColaboradoresPermisos =
        document.getElementById(
            "listaColaboradoresPermisos"
        );

    permisosSinColaborador =
        document.getElementById(
            "permisosSinColaborador"
        );

    permisosCalendarioContenido =
        document.getElementById(
            "permisosCalendarioContenido"
        );

    permisosAvatarColaborador =
        document.getElementById(
            "permisosAvatarColaborador"
        );

    permisosNombreColaborador =
        document.getElementById(
            "permisosNombreColaborador"
        );

    permisosDocumentoColaborador =
        document.getElementById(
            "permisosDocumentoColaborador"
        );

    btnHistorialPermisos =
        document.getElementById(
            "btnHistorialPermisos"
        );

    btnNuevoPermiso =
        document.getElementById(
            "btnNuevoPermiso"
        );

    btnMesAnteriorPermisos =
        document.getElementById(
            "btnMesAnteriorPermisos"
        );

    btnMesSiguientePermisos =
        document.getElementById(
            "btnMesSiguientePermisos"
        );

    btnHoyPermisos =
        document.getElementById(
            "btnHoyPermisos"
        );

    tituloMesPermisos =
        document.getElementById(
            "tituloMesPermisos"
        );

    permisosDiasMes =
        document.getElementById(
            "permisosDiasMes"
        );


    /* MODAL FORMULARIO */

    modalPermiso =
        document.getElementById(
            "modalPermiso"
        );

    cerrarModalPermiso =
        document.getElementById(
            "cerrarModalPermiso"
        );

    cancelarModalPermiso =
        document.getElementById(
            "cancelarModalPermiso"
        );

    tituloModalPermiso =
        document.getElementById(
            "tituloModalPermiso"
        );

    subtituloModalPermiso =
        document.getElementById(
            "subtituloModalPermiso"
        );

    formularioPermiso =
        document.getElementById(
            "formularioPermiso"
        );

    permisoId =
        document.getElementById(
            "permisoId"
        );

    modalPermisoAvatar =
        document.getElementById(
            "modalPermisoAvatar"
        );

    modalPermisoColaborador =
        document.getElementById(
            "modalPermisoColaborador"
        );

    modalPermisoDocumento =
        document.getElementById(
            "modalPermisoDocumento"
        );

    tipoPermiso =
        document.getElementById(
            "tipoPermiso"
        );

    fechaInicioPermiso =
        document.getElementById(
            "fechaInicioPermiso"
        );

    fechaFinPermiso =
        document.getElementById(
            "fechaFinPermiso"
        );

    contenedorMedioDiaPermiso =
        document.getElementById(
            "contenedorMedioDiaPermiso"
        );

    mitadDiaPermiso =
        document.getElementById(
            "mitadDiaPermiso"
        );

    contenedorHorasPermiso =
        document.getElementById(
            "contenedorHorasPermiso"
        );

    horaInicioPermiso =
        document.getElementById(
            "horaInicioPermiso"
        );

    horaFinPermiso =
        document.getElementById(
            "horaFinPermiso"
        );

    motivoPermiso =
        document.getElementById(
            "motivoPermiso"
        );

    observacionesPermiso =
        document.getElementById(
            "observacionesPermiso"
        );

    documentoPermiso =
        document.getElementById(
            "documentoPermiso"
        );

    archivoPermisoSeleccionado =
        document.getElementById(
            "archivoPermisoSeleccionado"
        );

    estadoPermiso =
        document.getElementById(
            "estadoPermiso"
        );

    guardarPermiso =
        document.getElementById(
            "guardarPermiso"
        );


    /* MODAL DETALLE */

    modalDetallePermiso =
        document.getElementById(
            "modalDetallePermiso"
        );

    cerrarDetallePermiso =
        document.getElementById(
            "cerrarDetallePermiso"
        );

    detallePermisoTipo =
        document.getElementById(
            "detallePermisoTipo"
        );

    detallePermisoFechas =
        document.getElementById(
            "detallePermisoFechas"
        );

    detallePermisoEstado =
        document.getElementById(
            "detallePermisoEstado"
        );

    detallePermisoDuracion =
        document.getElementById(
            "detallePermisoDuracion"
        );

    detallePermisoMotivo =
        document.getElementById(
            "detallePermisoMotivo"
        );

    detallePermisoObservaciones =
        document.getElementById(
            "detallePermisoObservaciones"
        );

    detallePermisoDocumento =
        document.getElementById(
            "detallePermisoDocumento"
        );

    btnAnularPermiso =
        document.getElementById(
            "btnAnularPermiso"
        );

    btnRechazarPermiso =
        document.getElementById(
            "btnRechazarPermiso"
        );

    btnEditarPermiso =
        document.getElementById(
            "btnEditarPermiso"
        );

    btnAprobarPermiso =
        document.getElementById(
            "btnAprobarPermiso"
        );

}



/*=====================================================
EVENTOS
=====================================================*/

function registrarEventosPermisos(){

    if(buscarColaboradorPermiso){

        buscarColaboradorPermiso.addEventListener(
            "input",
            filtrarColaboradoresPermisos
        );

    }


    if(btnMesAnteriorPermisos){

        btnMesAnteriorPermisos.onclick = ()=>{

            fechaCalendarioPermisos =
                new Date(
                    fechaCalendarioPermisos.getFullYear(),
                    fechaCalendarioPermisos.getMonth() - 1,
                    1
                );

            renderizarCalendarioPermisos();

        };

    }


    if(btnMesSiguientePermisos){

        btnMesSiguientePermisos.onclick = ()=>{

            fechaCalendarioPermisos =
                new Date(
                    fechaCalendarioPermisos.getFullYear(),
                    fechaCalendarioPermisos.getMonth() + 1,
                    1
                );

            renderizarCalendarioPermisos();

        };

    }


    if(btnHoyPermisos){

        btnHoyPermisos.onclick = ()=>{

            fechaCalendarioPermisos =
                new Date();

            renderizarCalendarioPermisos();

        };

    }


    if(btnNuevoPermiso){

        btnNuevoPermiso.onclick = ()=>{

            if(!colaboradorPermisoSeleccionado){

                mostrarAlertaAdvertencia(
                    "Selecciona un colaborador."
                );

                return;

            }

            abrirNuevoPermiso();

        };

    }


    if(btnHistorialPermisos){

        btnHistorialPermisos.onclick =
            mostrarHistorialPermisos;

    }


    if(cerrarModalPermiso){

        cerrarModalPermiso.onclick =
            cerrarFormularioPermiso;

    }


    if(cancelarModalPermiso){

        cancelarModalPermiso.onclick =
            cerrarFormularioPermiso;

    }


    if(cerrarDetallePermiso){

        cerrarDetallePermiso.onclick =
            cerrarModalDetalle;

    }


    if(guardarPermiso){

        guardarPermiso.onclick =
            guardarFormularioPermiso;

    }


    if(documentoPermiso){

        documentoPermiso.addEventListener(
            "change",
            mostrarArchivoSeleccionado
        );

    }


    document
    .querySelectorAll(
        'input[name="tipoDuracionPermiso"]'
    )
    .forEach(radio=>{

        radio.addEventListener(
            "change",
            actualizarCamposDuracion
        );

    });


    if(fechaInicioPermiso){

        fechaInicioPermiso.addEventListener(
            "change",
            ()=>{

                if(
                    !fechaFinPermiso.value ||
                    fechaFinPermiso.value <
                    fechaInicioPermiso.value
                ){

                    fechaFinPermiso.value =
                        fechaInicioPermiso.value;

                }

            }
        );

    }


    if(btnEditarPermiso){

        btnEditarPermiso.onclick = ()=>{

            if(!permisoSeleccionado) return;

            cerrarModalDetalle();

            abrirEditarPermiso(
                permisoSeleccionado
            );

        };

    }


    if(btnAprobarPermiso){

        btnAprobarPermiso.onclick =
            aprobarPermisoSeleccionado;

    }


    if(btnRechazarPermiso){

        btnRechazarPermiso.onclick =
            rechazarPermisoSeleccionado;

    }


    if(btnAnularPermiso){

        btnAnularPermiso.onclick =
            anularPermisoSeleccionado;

    }


    if(modalPermiso){

        modalPermiso.addEventListener(
            "click",
            evento=>{

                if(evento.target === modalPermiso){

                    cerrarFormularioPermiso();

                }

            }
        );

    }


    if(modalDetallePermiso){

        modalDetallePermiso.addEventListener(
            "click",
            evento=>{

                if(
                    evento.target ===
                    modalDetallePermiso
                ){

                    cerrarModalDetalle();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        evento=>{

            if(evento.key !== "Escape") return;

            cerrarFormularioPermiso();

            cerrarModalDetalle();

        }
    );

}



/*=====================================================
CARGAR COLABORADORES
=====================================================*/

async function cargarColaboradoresPermisos(){

    listaColaboradoresPermisos.innerHTML =
    `
        <div class="permiso-cargando">
            Cargando colaboradores...
        </div>
    `;


    try{

        const consulta =
            query(
                collection(
                    db,
                    "colaboradores"
                ),
                where(
                    "empresaId",
                    "==",
                    empresaId
                )
            );


        const resultado =
            await getDocs(consulta);


        colaboradoresPermisos =
            resultado.docs.map(documento=>{

                const datos =
                    documento.data();

                return {

                    id:documento.id,

                    ...datos,

                    nombreCompleto:
                        obtenerNombreColaborador(
                            datos
                        ),

                    numeroDocumento:
                        obtenerDocumentoColaborador(
                            datos
                        )

                };

            });


        colaboradoresPermisos.sort(
            (a,b)=>
                a.nombreCompleto.localeCompare(
                    b.nombreCompleto,
                    "es",
                    {
                        sensitivity:"base"
                    }
                )
        );


        colaboradoresFiltradosPermisos =
            [...colaboradoresPermisos];


        renderizarListaColaboradoresPermisos();

    }
    catch(error){

        console.error(
            "Error al cargar colaboradores:",
            error
        );

        listaColaboradoresPermisos.innerHTML =
        `
            <div class="permisos-vacio-lista">

                <i class="bi bi-exclamation-circle"></i>

                <p>
                    No se pudieron cargar los colaboradores.
                </p>

            </div>
        `;

    }

}



/*=====================================================
NORMALIZAR DATOS DEL COLABORADOR
=====================================================*/

function obtenerNombreColaborador(datos){

    const nombres =
        datos.datosPersonales?.nombres ||
        datos.nombres ||
        datos.nombre ||
        "";

    const apellidos =
        datos.datosPersonales?.apellidos ||
        datos.apellidos ||
        datos.apellido ||
        "";

    const nombreCompleto =
        `${nombres} ${apellidos}`
        .replace(/\s+/g," ")
        .trim();

    return nombreCompleto || "Sin nombre";

}



function obtenerDocumentoColaborador(datos){

    return (
        datos.documento?.numero ||
        datos.numeroDocumento ||
        datos.dni ||
        datos.documentoIdentidad ||
        "Sin documento"
    );

}



/*=====================================================
FILTRAR COLABORADORES
=====================================================*/

function filtrarColaboradoresPermisos(){

    const texto =
        buscarColaboradorPermiso.value
        .trim()
        .toLowerCase();


    colaboradoresFiltradosPermisos =
        colaboradoresPermisos.filter(
            colaborador=>{

                const nombre =
                    colaborador.nombreCompleto
                    .toLowerCase();

                const documento =
                    colaborador.numeroDocumento
                    .toString()
                    .toLowerCase();

                return (
                    nombre.includes(texto) ||
                    documento.includes(texto)
                );

            }
        );


    renderizarListaColaboradoresPermisos();

}



/*=====================================================
RENDERIZAR COLABORADORES
=====================================================*/

function renderizarListaColaboradoresPermisos(){

    if(cantidadColaboradoresPermisos){

        cantidadColaboradoresPermisos.textContent =
            `${colaboradoresFiltradosPermisos.length} ${
                colaboradoresFiltradosPermisos.length === 1
                ? "colaborador"
                : "colaboradores"
            }`;

    }


    if(
        colaboradoresFiltradosPermisos.length === 0
    ){

        listaColaboradoresPermisos.innerHTML =
        `
            <div class="permisos-vacio-lista">

                <i class="bi bi-people"></i>

                <p>
                    No se encontraron colaboradores.
                </p>

            </div>
        `;

        return;

    }


    listaColaboradoresPermisos.innerHTML =
        colaboradoresFiltradosPermisos
        .map(colaborador=>{

            const activo =
                colaboradorPermisoSeleccionado?.id ===
                colaborador.id
                ? "activo"
                : "";

            return `
                <button
                    type="button"
                    class="colaborador-permiso-item ${activo}"
                    data-colaborador-id="${colaborador.id}"
                >

                    <div class="colaborador-permiso-avatar">

                        ${obtenerIniciales(
                            colaborador.nombreCompleto
                        )}

                    </div>

                    <div class="colaborador-permiso-datos">

                        <strong>
                            ${escaparHTML(
                                colaborador.nombreCompleto
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                colaborador.numeroDocumento
                            )}
                        </span>

                    </div>

                    <i
                        class="
                            bi
                            bi-chevron-right
                            colaborador-permiso-flecha
                        "
                    ></i>

                </button>
            `;

        })
        .join("");


    listaColaboradoresPermisos
    .querySelectorAll(
        ".colaborador-permiso-item"
    )
    .forEach(boton=>{

        boton.addEventListener(
            "click",
            ()=>{

                seleccionarColaboradorPermisos(
                    boton.dataset.colaboradorId
                );

            }
        );

    });

}



/*=====================================================
SELECCIONAR COLABORADOR
=====================================================*/

function seleccionarColaboradorPermisos(
    colaboradorId
){

    const colaborador =
        colaboradoresPermisos.find(
            item=>item.id === colaboradorId
        );


    if(!colaborador) return;


    colaboradorPermisoSeleccionado =
        colaborador;

    permisoSeleccionado = null;

    fechaCalendarioPermisos =
        new Date();


    renderizarListaColaboradoresPermisos();

    mostrarCalendarioColaborador();

    escucharPermisosColaborador();

}



/*=====================================================
MOSTRAR CALENDARIO
=====================================================*/

function mostrarCalendarioColaborador(){

    if(permisosSinColaborador){

        permisosSinColaborador.style.display =
            "none";

    }


    if(permisosCalendarioContenido){

        permisosCalendarioContenido.classList.add(
            "activo"
        );

    }


    permisosAvatarColaborador.textContent =
        obtenerIniciales(
            colaboradorPermisoSeleccionado
            .nombreCompleto
        );

    permisosNombreColaborador.textContent =
        colaboradorPermisoSeleccionado
        .nombreCompleto;

    permisosDocumentoColaborador.textContent =
        colaboradorPermisoSeleccionado
        .numeroDocumento;


    renderizarCalendarioPermisos();

}



/*=====================================================
ESCUCHAR PERMISOS EN TIEMPO REAL
=====================================================*/

function escucharPermisosColaborador(){

    if(cancelarEscuchaPermisos){

        cancelarEscuchaPermisos();

        cancelarEscuchaPermisos = null;

    }


    const consulta =
        query(
            collection(
                db,
                "permisos"
            ),
            where(
                "empresaId",
                "==",
                empresaId
            ),
            where(
                "colaboradorId",
                "==",
                colaboradorPermisoSeleccionado.id
            )
        );


    cancelarEscuchaPermisos =
        onSnapshot(
            consulta,
            resultado=>{

                permisosColaborador =
                    resultado.docs.map(
                        documento=>({

                            id:documento.id,

                            ...documento.data()

                        })
                    );


                permisosColaborador.sort(
                    (a,b)=>
                        (a.fechaInicio || "")
                        .localeCompare(
                            b.fechaInicio || ""
                        )
                );


                renderizarCalendarioPermisos();

            },
            error=>{

                console.error(
                    "Error al escuchar permisos:",
                    error
                );

            }
        );

}



/*=====================================================
RENDERIZAR CALENDARIO
=====================================================*/

function renderizarCalendarioPermisos(){

    if(
        !colaboradorPermisoSeleccionado ||
        !permisosDiasMes
    ){

        return;

    }


    const anio =
        fechaCalendarioPermisos.getFullYear();

    const mes =
        fechaCalendarioPermisos.getMonth();


    tituloMesPermisos.textContent =
        new Intl.DateTimeFormat(
            "es-PE",
            {
                month:"long",
                year:"numeric"
            }
        )
        .format(
            new Date(
                anio,
                mes,
                1
            )
        );


    const primerDiaMes =
        new Date(
            anio,
            mes,
            1
        );


    const ultimoDiaMes =
        new Date(
            anio,
            mes + 1,
            0
        );


    /*
        JavaScript:
        domingo = 0
        lunes = 1

        Nuestro calendario:
        lunes = primera columna
    */

    const desplazamientoInicio =
        (primerDiaMes.getDay() + 6) % 7;


    const totalDiasMes =
        ultimoDiaMes.getDate();


    const totalCeldas =
        Math.ceil(
            (
                desplazamientoInicio +
                totalDiasMes
            ) / 7
        ) * 7;


    const hoy =
        obtenerFechaLocal(
            new Date()
        );


    let html = "";


    for(
        let indice = 0;
        indice < totalCeldas;
        indice++
    ){

        const numeroDia =
            indice -
            desplazamientoInicio +
            1;


        if(
            numeroDia < 1 ||
            numeroDia > totalDiasMes
        ){

            html +=
            `
                <div class="permiso-dia fuera-mes">

                    <span class="permiso-dia-numero"></span>

                </div>
            `;

            continue;

        }


        const fecha =
            formarFechaISO(
                anio,
                mes + 1,
                numeroDia
            );


        const esHoy =
            fecha === hoy
            ? "hoy"
            : "";


        const permisosDia =
            obtenerPermisosDeFecha(
                fecha
            );


        html +=
        `
            <div
                class="permiso-dia ${esHoy}"
                data-fecha="${fecha}"
            >

                <span class="permiso-dia-numero">
                    ${numeroDia}
                </span>

                <span
                    class="permiso-dia-agregar"
                    title="Agregar permiso"
                >
                    <i class="bi bi-plus"></i>
                </span>

                <div class="permiso-dia-eventos">

                    ${permisosDia
                        .map(
                            permiso=>
                                crearHTMLPermisoCalendario(
                                    permiso
                                )
                        )
                        .join("")
                    }

                </div>

            </div>
        `;

    }


    permisosDiasMes.innerHTML =
        html;


    registrarEventosCalendario();

}



/*=====================================================
EVENTOS DEL CALENDARIO
=====================================================*/

function registrarEventosCalendario(){

    permisosDiasMes
    .querySelectorAll(
        ".permiso-dia:not(.fuera-mes)"
    )
    .forEach(dia=>{

        dia.addEventListener(
            "click",
            evento=>{

                if(
                    evento.target.closest(
                        ".permiso-evento"
                    )
                ){

                    return;

                }


                abrirNuevoPermiso(
                    dia.dataset.fecha
                );

            }
        );

    });


    permisosDiasMes
    .querySelectorAll(
        ".permiso-evento"
    )
    .forEach(evento=>{

        evento.addEventListener(
            "click",
            event=>{

                event.stopPropagation();

                abrirDetallePermiso(
                    evento.dataset.permisoId
                );

            }
        );

    });

}



/*=====================================================
OBTENER PERMISOS DE UNA FECHA
=====================================================*/

function obtenerPermisosDeFecha(fecha){

    return permisosColaborador.filter(
        permiso=>{

            if(
                permiso.estado === "ANULADO"
            ){

                /*
                    Se mantiene visible en el calendario,
                    pero con estilo tachado.
                */

            }

            return (
                permiso.fechaInicio <= fecha &&
                permiso.fechaFin >= fecha
            );

        }
    );

}



/*=====================================================
HTML DEL EVENTO
=====================================================*/

function crearHTMLPermisoCalendario(
    permiso
){

    const claseTipo =
        obtenerClaseTipoPermiso(
            permiso.tipoPermiso
        );

    const claseEstado =
        `estado-${(
            permiso.estado ||
            "PENDIENTE"
        ).toLowerCase()}`;

    const nombreTipo =
        permiso.tipoPermisoNombre ||
        obtenerNombreTipoPermiso(
            permiso.tipoPermiso
        );

    return `
        <button
            type="button"
            class="
                permiso-evento
                ${claseTipo}
                ${claseEstado}
            "
            data-permiso-id="${permiso.id}"
            title="${escaparHTML(nombreTipo)}"
        >

            <span>
                ${escaparHTML(nombreTipo)}
            </span>

            <small>
                ${formatearEstado(
                    permiso.estado
                )}
            </small>

        </button>
    `;

}



/*=====================================================
ABRIR NUEVO PERMISO
=====================================================*/

function abrirNuevoPermiso(
    fechaSeleccionada = null
){

    if(!colaboradorPermisoSeleccionado){

        mostrarAlertaAdvertencia(
            "Selecciona un colaborador."
        );

        return;

    }


    limpiarFormularioPermiso();


    permisoSeleccionado = null;

    permisoId.value = "";


    tituloModalPermiso.textContent =
        "Nuevo permiso";

    subtituloModalPermiso.textContent =
        "Registra un permiso para el colaborador seleccionado.";


    cargarResumenColaboradorModal();


    const fecha =
        fechaSeleccionada ||
        obtenerFechaLocal(
            new Date()
        );


    fechaInicioPermiso.value =
        fecha;

    fechaFinPermiso.value =
        fecha;


    abrirModalFormulario();

}



/*=====================================================
ABRIR EDICIÓN
=====================================================*/

function abrirEditarPermiso(
    permiso
){

    if(!permiso) return;


    limpiarFormularioPermiso();


    permisoSeleccionado =
        permiso;


    permisoId.value =
        permiso.id;

    tituloModalPermiso.textContent =
        "Editar permiso";

    subtituloModalPermiso.textContent =
        "Actualiza la información del permiso seleccionado.";


    cargarResumenColaboradorModal();


    tipoPermiso.value =
        permiso.tipoPermiso || "";

    fechaInicioPermiso.value =
        permiso.fechaInicio || "";

    fechaFinPermiso.value =
        permiso.fechaFin || "";


    const tipoDuracion =
        permiso.tipoDuracion ||
        "DIA_COMPLETO";


    const radio =
        document.querySelector(
            `input[name="tipoDuracionPermiso"][value="${tipoDuracion}"]`
        );


    if(radio){

        radio.checked = true;

    }


    mitadDiaPermiso.value =
        permiso.mitadDia ||
        "PRIMERA_MITAD";

    horaInicioPermiso.value =
        permiso.horaInicio || "";

    horaFinPermiso.value =
        permiso.horaFin || "";

    motivoPermiso.value =
        permiso.motivo || "";

    observacionesPermiso.value =
        permiso.observaciones || "";

    estadoPermiso.value =
        (
            permiso.estado === "APROBADO"
            ? "APROBADO"
            : "PENDIENTE"
        );


    if(permiso.documentoNombre){

        archivoPermisoSeleccionado.textContent =
            permiso.documentoNombre;

        archivoPermisoSeleccionado.classList.add(
            "activo"
        );

    }


    actualizarCamposDuracion();

    abrirModalFormulario();

}



/*=====================================================
RESUMEN DEL COLABORADOR EN MODAL
=====================================================*/

function cargarResumenColaboradorModal(){

    modalPermisoAvatar.textContent =
        obtenerIniciales(
            colaboradorPermisoSeleccionado
            .nombreCompleto
        );

    modalPermisoColaborador.textContent =
        colaboradorPermisoSeleccionado
        .nombreCompleto;

    modalPermisoDocumento.textContent =
        colaboradorPermisoSeleccionado
        .numeroDocumento;

}



/*=====================================================
ABRIR / CERRAR FORMULARIO
=====================================================*/

function abrirModalFormulario(){

    modalPermiso.classList.add(
        "activo"
    );

}



function cerrarFormularioPermiso(){

    if(!modalPermiso) return;

    modalPermiso.classList.remove(
        "activo"
    );

}



/*=====================================================
LIMPIAR FORMULARIO
=====================================================*/

function limpiarFormularioPermiso(){

    if(formularioPermiso){

        formularioPermiso.reset();

    }


    if(permisoId){

        permisoId.value = "";

    }


    const radioDiaCompleto =
        document.querySelector(
            'input[name="tipoDuracionPermiso"][value="DIA_COMPLETO"]'
        );


    if(radioDiaCompleto){

        radioDiaCompleto.checked = true;

    }


    if(contenedorMedioDiaPermiso){

        contenedorMedioDiaPermiso.classList.remove(
            "activo"
        );

    }


    if(contenedorHorasPermiso){

        contenedorHorasPermiso.classList.remove(
            "activo"
        );

    }


    if(archivoPermisoSeleccionado){

        archivoPermisoSeleccionado.textContent =
            "";

        archivoPermisoSeleccionado.classList.remove(
            "activo"
        );

    }


    if(documentoPermiso){

        documentoPermiso.value = "";

    }


    if(estadoPermiso){

        estadoPermiso.value =
            "PENDIENTE";

    }

}



/*=====================================================
CAMPOS SEGÚN DURACIÓN
=====================================================*/

function actualizarCamposDuracion(){

    const tipoDuracion =
        obtenerTipoDuracionSeleccionado();


    contenedorMedioDiaPermiso.classList.remove(
        "activo"
    );

    contenedorHorasPermiso.classList.remove(
        "activo"
    );


    if(tipoDuracion === "MEDIO_DIA"){

        contenedorMedioDiaPermiso.classList.add(
            "activo"
        );

    }


    if(tipoDuracion === "HORAS"){

        contenedorHorasPermiso.classList.add(
            "activo"
        );

    }

}



/*=====================================================
ARCHIVO SELECCIONADO
=====================================================*/

function mostrarArchivoSeleccionado(){

    const archivo =
        documentoPermiso.files?.[0];


    if(!archivo){

        archivoPermisoSeleccionado.textContent =
            "";

        archivoPermisoSeleccionado.classList.remove(
            "activo"
        );

        return;

    }


    const extensionesPermitidas = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];


    if(
        !extensionesPermitidas.includes(
            archivo.type
        )
    ){

        documentoPermiso.value = "";

        archivoPermisoSeleccionado.textContent =
            "";

        archivoPermisoSeleccionado.classList.remove(
            "activo"
        );

        mostrarAlertaAdvertencia(
            "Solo se permiten archivos PDF, JPG o PNG."
        );

        return;

    }


    const limiteBytes =
        5 * 1024 * 1024;


    if(archivo.size > limiteBytes){

        documentoPermiso.value = "";

        archivoPermisoSeleccionado.textContent =
            "";

        archivoPermisoSeleccionado.classList.remove(
            "activo"
        );

        mostrarAlertaAdvertencia(
            "El archivo no debe superar los 5 MB."
        );

        return;

    }


    archivoPermisoSeleccionado.textContent =
        `${archivo.name} · ${formatearPesoArchivo(
            archivo.size
        )}`;

    archivoPermisoSeleccionado.classList.add(
        "activo"
    );

}



/*=====================================================
GUARDAR PERMISO
=====================================================*/

async function guardarFormularioPermiso(){

    if(!colaboradorPermisoSeleccionado){

        mostrarAlertaAdvertencia(
            "Selecciona un colaborador."
        );

        return;

    }


    const tipo =
        tipoPermiso.value;

    const fechaInicio =
        fechaInicioPermiso.value;

    const fechaFin =
        fechaFinPermiso.value;

    const tipoDuracion =
        obtenerTipoDuracionSeleccionado();

    const motivo =
        motivoPermiso.value.trim();

    const observaciones =
        observacionesPermiso.value.trim();

    const estado =
        estadoPermiso.value;


    if(!tipo){

        mostrarAlertaAdvertencia(
            "Selecciona el tipo de permiso."
        );

        tipoPermiso.focus();

        return;

    }


    if(!fechaInicio){

        mostrarAlertaAdvertencia(
            "Selecciona la fecha de inicio."
        );

        fechaInicioPermiso.focus();

        return;

    }


    if(!fechaFin){

        mostrarAlertaAdvertencia(
            "Selecciona la fecha de término."
        );

        fechaFinPermiso.focus();

        return;

    }


    if(fechaFin < fechaInicio){

        mostrarAlertaAdvertencia(
            "La fecha de término no puede ser menor que la fecha de inicio."
        );

        fechaFinPermiso.focus();

        return;

    }


    if(!motivo){

        mostrarAlertaAdvertencia(
            "Ingresa el motivo del permiso."
        );

        motivoPermiso.focus();

        return;

    }


    if(
        tipoDuracion === "MEDIO_DIA" &&
        fechaInicio !== fechaFin
    ){

        mostrarAlertaAdvertencia(
            "Un permiso de medio día debe registrarse en una sola fecha."
        );

        return;

    }


    if(tipoDuracion === "HORAS"){

        if(fechaInicio !== fechaFin){

            mostrarAlertaAdvertencia(
                "Un permiso por horas debe registrarse en una sola fecha."
            );

            return;

        }


        if(
            !horaInicioPermiso.value ||
            !horaFinPermiso.value
        ){

            mostrarAlertaAdvertencia(
                "Ingresa la hora inicial y final."
            );

            return;

        }


        if(
            horaFinPermiso.value <=
            horaInicioPermiso.value
        ){

            mostrarAlertaAdvertencia(
                "La hora final debe ser mayor que la hora inicial."
            );

            return;

        }

    }


    const datosValidacion = {

        id:
            permisoId.value || null,

        fechaInicio,

        fechaFin,

        tipoDuracion,

        mitadDia:
            tipoDuracion === "MEDIO_DIA"
            ? mitadDiaPermiso.value
            : null,

        horaInicio:
            tipoDuracion === "HORAS"
            ? horaInicioPermiso.value
            : null,

        horaFin:
            tipoDuracion === "HORAS"
            ? horaFinPermiso.value
            : null,

        estado

    };


    const conflicto =
        buscarConflictoPermiso(
            datosValidacion
        );


    if(conflicto){

        const nombreConflicto =
            conflicto.tipoPermisoNombre ||
            obtenerNombreTipoPermiso(
                conflicto.tipoPermiso
            );

        mostrarAlertaAdvertencia(
            `El colaborador ya tiene "${nombreConflicto}" desde ${formatearFecha(
                conflicto.fechaInicio
            )} hasta ${formatearFecha(
                conflicto.fechaFin
            )}.`
        );

        return;

    }


    const archivo =
        documentoPermiso.files?.[0] ||
        null;


    /*
        Por ahora guardamos los datos del archivo.

        Cuando conectemos Firebase Storage,
        aquí se subirá el archivo y se guardará
        documentoUrl.
    */

    const datosPermiso = {

        empresaId,

        colaboradorId:
            colaboradorPermisoSeleccionado.id,

        colaboradorNombre:
            colaboradorPermisoSeleccionado
            .nombreCompleto,

        colaboradorDocumento:
            colaboradorPermisoSeleccionado
            .numeroDocumento,

        tipoPermiso:
            tipo,

        tipoPermisoNombre:
            obtenerNombreTipoPermiso(
                tipo
            ),

        fechaInicio,

        fechaFin,

        tipoDuracion,

        mitadDia:
            tipoDuracion === "MEDIO_DIA"
            ? mitadDiaPermiso.value
            : null,

        horaInicio:
            tipoDuracion === "HORAS"
            ? horaInicioPermiso.value
            : null,

        horaFin:
            tipoDuracion === "HORAS"
            ? horaFinPermiso.value
            : null,

        motivo,

        observaciones,

        documentoNombre:
            archivo?.name ||
            permisoSeleccionado?.documentoNombre ||
            null,

        documentoTipo:
            archivo?.type ||
            permisoSeleccionado?.documentoTipo ||
            null,

        documentoUrl:
            permisoSeleccionado?.documentoUrl ||
            null,

        estado,

        actualizadoPor:
            auth.currentUser?.uid ||
            null,

        fechaActualizacion:
            serverTimestamp()

    };


    guardarPermiso.disabled = true;

    guardarPermiso.innerHTML =
    `
        <i class="bi bi-hourglass-split"></i>
        Guardando...
    `;


    try{

        if(permisoId.value){

            const referencia =
                doc(
                    db,
                    "permisos",
                    permisoId.value
                );


            await updateDoc(
                referencia,
                datosPermiso
            );


            cerrarFormularioPermiso();


            await mostrarAlertaExito(
                "Permiso actualizado correctamente."
            );

        }
        else{

            await addDoc(
                collection(
                    db,
                    "permisos"
                ),
                {

                    ...datosPermiso,

                    creadoPor:
                        auth.currentUser?.uid ||
                        null,

                    fechaCreacion:
                        serverTimestamp(),

                    aprobadoPor:
                        estado === "APROBADO"
                        ? auth.currentUser?.uid || null
                        : null,

                    fechaAprobacion:
                        estado === "APROBADO"
                        ? serverTimestamp()
                        : null,

                    rechazadoPor:null,

                    fechaRechazo:null,

                    motivoRechazo:null,

                    anuladoPor:null,

                    fechaAnulacion:null,

                    motivoAnulacion:null

                }
            );


            cerrarFormularioPermiso();


            await mostrarAlertaExito(
                "Permiso registrado correctamente."
            );

        }

    }
    catch(error){

        console.error(
            "Error al guardar permiso:",
            error
        );

        mostrarAlertaError(
            "No se pudo guardar el permiso."
        );

    }
    finally{

        guardarPermiso.disabled = false;

        guardarPermiso.innerHTML =
        `
            <i class="bi bi-check-lg"></i>
            Guardar permiso
        `;

    }

}



/*=====================================================
VALIDAR SUPERPOSICIÓN
=====================================================*/

function buscarConflictoPermiso(
    nuevoPermiso
){

    return permisosColaborador.find(
        permiso=>{

            if(
                permiso.id ===
                nuevoPermiso.id
            ){

                return false;

            }


            if(
                permiso.estado === "ANULADO" ||
                permiso.estado === "RECHAZADO"
            ){

                return false;

            }


            const existeCruceFechas =
                nuevoPermiso.fechaInicio <=
                    permiso.fechaFin &&
                nuevoPermiso.fechaFin >=
                    permiso.fechaInicio;


            if(!existeCruceFechas){

                return false;

            }


            /*
                Si ambos abarcan varios días,
                cualquier cruce se considera conflicto.
            */

            const nuevoVariosDias =
                nuevoPermiso.fechaInicio !==
                nuevoPermiso.fechaFin;

            const existenteVariosDias =
                permiso.fechaInicio !==
                permiso.fechaFin;


            if(
                nuevoVariosDias ||
                existenteVariosDias
            ){

                return true;

            }


            /*
                Día completo siempre bloquea todo el día.
            */

            if(
                nuevoPermiso.tipoDuracion ===
                    "DIA_COMPLETO" ||
                permiso.tipoDuracion ===
                    "DIA_COMPLETO"
            ){

                return true;

            }


            /*
                Dos permisos de medio día solo pueden
                coexistir si son mitades diferentes.
            */

            if(
                nuevoPermiso.tipoDuracion ===
                    "MEDIO_DIA" &&
                permiso.tipoDuracion ===
                    "MEDIO_DIA"
            ){

                return (
                    nuevoPermiso.mitadDia ===
                    permiso.mitadDia
                );

            }


            /*
                Medio día y permiso por horas:
                se bloquean por seguridad hasta integrar
                el horario exacto del colaborador.
            */

            if(
                nuevoPermiso.tipoDuracion ===
                    "MEDIO_DIA" ||
                permiso.tipoDuracion ===
                    "MEDIO_DIA"
            ){

                return true;

            }


            /*
                Ambos permisos son por horas.
            */

            if(
                nuevoPermiso.tipoDuracion ===
                    "HORAS" &&
                permiso.tipoDuracion ===
                    "HORAS"
            ){

                return (
                    nuevoPermiso.horaInicio <
                        permiso.horaFin &&
                    nuevoPermiso.horaFin >
                        permiso.horaInicio
                );

            }


            return true;

        }
    );

}



/*=====================================================
DETALLE DEL PERMISO
=====================================================*/

function abrirDetallePermiso(
    id
){

    const permiso =
        permisosColaborador.find(
            item=>item.id === id
        );


    if(!permiso) return;


    permisoSeleccionado =
        permiso;


    detallePermisoTipo.textContent =
        permiso.tipoPermisoNombre ||
        obtenerNombreTipoPermiso(
            permiso.tipoPermiso
        );


    if(
        permiso.fechaInicio ===
        permiso.fechaFin
    ){

        detallePermisoFechas.textContent =
            formatearFecha(
                permiso.fechaInicio
            );

    }
    else{

        detallePermisoFechas.textContent =
            `${formatearFecha(
                permiso.fechaInicio
            )} al ${formatearFecha(
                permiso.fechaFin
            )}`;

    }


    detallePermisoEstado.textContent =
        formatearEstado(
            permiso.estado
        );


    detallePermisoEstado.className = "";

    detallePermisoEstado.classList.add(
        (
            permiso.estado ||
            "PENDIENTE"
        ).toLowerCase()
    );


    detallePermisoDuracion.textContent =
        obtenerTextoDuracion(
            permiso
        );


    detallePermisoMotivo.textContent =
        permiso.motivo ||
        "Sin motivo";


    detallePermisoObservaciones.textContent =
        permiso.observaciones ||
        "Sin observaciones.";


    if(permiso.documentoUrl){

        detallePermisoDocumento.innerHTML =
        `
            <a
                href="${permiso.documentoUrl}"
                target="_blank"
                rel="noopener noreferrer"
            >
                <i class="bi bi-file-earmark-arrow-down"></i>
                ${escaparHTML(
                    permiso.documentoNombre ||
                    "Ver documento"
                )}
            </a>
        `;

    }
    else if(permiso.documentoNombre){

        detallePermisoDocumento.textContent =
            `${permiso.documentoNombre} · Pendiente de almacenamiento`;

    }
    else{

        detallePermisoDocumento.textContent =
            "Sin documento adjunto.";

    }


    actualizarBotonesDetalle(
        permiso
    );


    modalDetallePermiso.classList.add(
        "activo"
    );

}



/*=====================================================
BOTONES SEGÚN ESTADO
=====================================================*/

function actualizarBotonesDetalle(
    permiso
){

    const estado =
        permiso.estado ||
        "PENDIENTE";


    btnAprobarPermiso.style.display =
        estado === "PENDIENTE"
        ? "inline-flex"
        : "none";


    btnRechazarPermiso.style.display =
        estado === "PENDIENTE"
        ? "inline-flex"
        : "none";


    btnEditarPermiso.style.display =
        (
            estado === "PENDIENTE" ||
            estado === "APROBADO"
        )
        ? "inline-flex"
        : "none";


    btnAnularPermiso.style.display =
        (
            estado !== "ANULADO" &&
            estado !== "RECHAZADO"
        )
        ? "inline-flex"
        : "none";

}



/*=====================================================
CERRAR DETALLE
=====================================================*/

function cerrarModalDetalle(){

    if(!modalDetallePermiso) return;

    modalDetallePermiso.classList.remove(
        "activo"
    );

}



/*=====================================================
APROBAR PERMISO
=====================================================*/

async function aprobarPermisoSeleccionado(){

    if(!permisoSeleccionado) return;


    const resultado =
        await Swal.fire({

            title:"¿Aprobar permiso?",

            text:
                "El permiso justificará la asistencia del colaborador.",

            icon:"question",

            showCancelButton:true,

            confirmButtonText:"Sí, aprobar",

            cancelButtonText:"Cancelar",

            confirmButtonColor:"#16a34a"

        });


    if(!resultado.isConfirmed) return;


    try{

        await updateDoc(
            doc(
                db,
                "permisos",
                permisoSeleccionado.id
            ),
            {

                estado:"APROBADO",

                aprobadoPor:
                    auth.currentUser?.uid ||
                    null,

                fechaAprobacion:
                    serverTimestamp(),

                fechaActualizacion:
                    serverTimestamp()

            }
        );


        cerrarModalDetalle();


        await mostrarAlertaExito(
            "Permiso aprobado correctamente."
        );

    }
    catch(error){

        console.error(
            "Error al aprobar permiso:",
            error
        );

        mostrarAlertaError(
            "No se pudo aprobar el permiso."
        );

    }

}



/*=====================================================
RECHAZAR PERMISO
=====================================================*/

async function rechazarPermisoSeleccionado(){

    if(!permisoSeleccionado) return;


    const resultado =
        await Swal.fire({

            title:"Rechazar permiso",

            input:"textarea",

            inputLabel:"Motivo del rechazo",

            inputPlaceholder:
                "Escribe el motivo del rechazo...",

            inputAttributes:{

                maxlength:"300"

            },

            showCancelButton:true,

            confirmButtonText:"Rechazar",

            cancelButtonText:"Cancelar",

            confirmButtonColor:"#c2410c",

            inputValidator:valor=>{

                if(!valor?.trim()){

                    return "Ingresa el motivo del rechazo.";

                }

            }

        });


    if(!resultado.isConfirmed) return;


    try{

        await updateDoc(
            doc(
                db,
                "permisos",
                permisoSeleccionado.id
            ),
            {

                estado:"RECHAZADO",

                rechazadoPor:
                    auth.currentUser?.uid ||
                    null,

                fechaRechazo:
                    serverTimestamp(),

                motivoRechazo:
                    resultado.value.trim(),

                fechaActualizacion:
                    serverTimestamp()

            }
        );


        cerrarModalDetalle();


        await mostrarAlertaExito(
            "Permiso rechazado."
        );

    }
    catch(error){

        console.error(
            "Error al rechazar permiso:",
            error
        );

        mostrarAlertaError(
            "No se pudo rechazar el permiso."
        );

    }

}



/*=====================================================
ANULAR PERMISO
=====================================================*/

async function anularPermisoSeleccionado(){

    if(!permisoSeleccionado) return;


    const resultado =
        await Swal.fire({

            title:"Anular permiso",

            input:"textarea",

            inputLabel:"Motivo de la anulación",

            inputPlaceholder:
                "Escribe el motivo de la anulación...",

            icon:"warning",

            showCancelButton:true,

            confirmButtonText:"Anular permiso",

            cancelButtonText:"Cancelar",

            confirmButtonColor:"#dc2626",

            inputValidator:valor=>{

                if(!valor?.trim()){

                    return "Ingresa el motivo de la anulación.";

                }

            }

        });


    if(!resultado.isConfirmed) return;


    try{

        await updateDoc(
            doc(
                db,
                "permisos",
                permisoSeleccionado.id
            ),
            {

                estado:"ANULADO",

                anuladoPor:
                    auth.currentUser?.uid ||
                    null,

                fechaAnulacion:
                    serverTimestamp(),

                motivoAnulacion:
                    resultado.value.trim(),

                fechaActualizacion:
                    serverTimestamp()

            }
        );


        cerrarModalDetalle();


        await mostrarAlertaExito(
            "Permiso anulado correctamente."
        );

    }
    catch(error){

        console.error(
            "Error al anular permiso:",
            error
        );

        mostrarAlertaError(
            "No se pudo anular el permiso."
        );

    }

}



/*=====================================================
HISTORIAL
=====================================================*/

async function mostrarHistorialPermisos(){

    if(!colaboradorPermisoSeleccionado){

        mostrarAlertaAdvertencia(
            "Selecciona un colaborador."
        );

        return;

    }


    if(permisosColaborador.length === 0){

        await Swal.fire({

            title:"Sin permisos",

            text:
                "El colaborador todavía no tiene permisos registrados.",

            icon:"info",

            confirmButtonText:"Entendido"

        });

        return;

    }


    const permisosOrdenados =
        [...permisosColaborador]
        .sort(
            (a,b)=>
                (b.fechaInicio || "")
                .localeCompare(
                    a.fechaInicio || ""
                )
        );


    const contenido =
        permisosOrdenados
        .map(permiso=>{

            const nombre =
                permiso.tipoPermisoNombre ||
                obtenerNombreTipoPermiso(
                    permiso.tipoPermiso
                );

            const fechas =
                permiso.fechaInicio ===
                permiso.fechaFin
                ? formatearFecha(
                    permiso.fechaInicio
                )
                : `${formatearFecha(
                    permiso.fechaInicio
                )} - ${formatearFecha(
                    permiso.fechaFin
                )}`;

            return `
                <div
                    style="
                        padding:12px 0;
                        border-bottom:1px solid #e2e8f0;
                        text-align:left;
                    "
                >

                    <strong
                        style="
                            display:block;
                            color:#0f172a;
                            margin-bottom:4px;
                        "
                    >
                        ${escaparHTML(nombre)}
                    </strong>

                    <span
                        style="
                            display:block;
                            color:#64748b;
                            font-size:13px;
                            margin-bottom:4px;
                        "
                    >
                        ${fechas}
                    </span>

                    <span
                        style="
                            display:inline-block;
                            padding:4px 8px;
                            border-radius:20px;
                            background:#f1f5f9;
                            color:#475569;
                            font-size:11px;
                            font-weight:700;
                        "
                    >
                        ${formatearEstado(
                            permiso.estado
                        )}
                    </span>

                </div>
            `;

        })
        .join("");


    await Swal.fire({

        title:
            `Historial de ${colaboradorPermisoSeleccionado.nombreCompleto}`,

        html:
        `
            <div
                style="
                    max-height:420px;
                    overflow:auto;
                    padding-right:8px;
                "
            >
                ${contenido}
            </div>
        `,

        width:650,

        confirmButtonText:"Cerrar"

    });

}



/*=====================================================
TIPO DE DURACIÓN
=====================================================*/

function obtenerTipoDuracionSeleccionado(){

    return (
        document.querySelector(
            'input[name="tipoDuracionPermiso"]:checked'
        )?.value ||
        "DIA_COMPLETO"
    );

}



/*=====================================================
NOMBRES DE TIPOS
=====================================================*/

function obtenerNombreTipoPermiso(
    tipo
){

    const nombres = {

        VACACIONES:
            "Vacaciones",

        LICENCIA_MEDICA:
            "Licencia médica",

        LICENCIA_MATERNIDAD:
            "Licencia por maternidad",

        LICENCIA_PATERNIDAD:
            "Licencia por paternidad",

        PERMISO_PERSONAL:
            "Permiso personal",

        COMISION_SERVICIO:
            "Comisión de servicio",

        CAPACITACION:
            "Capacitación",

        DUELO:
            "Licencia por duelo",

        PERMISO_CON_GOCE:
            "Permiso con goce",

        PERMISO_SIN_GOCE:
            "Permiso sin goce",

        TRABAJO_REMOTO:
            "Trabajo remoto",

        OTRO:
            "Otro"

    };


    return nombres[tipo] || "Permiso";

}



/*=====================================================
CLASE CSS SEGÚN TIPO
=====================================================*/

function obtenerClaseTipoPermiso(
    tipo
){

    const clases = {

        VACACIONES:
            "vacaciones",

        LICENCIA_MEDICA:
            "licencia-medica",

        LICENCIA_MATERNIDAD:
            "licencia-maternidad",

        LICENCIA_PATERNIDAD:
            "licencia-paternidad",

        PERMISO_PERSONAL:
            "permiso-personal",

        COMISION_SERVICIO:
            "comision-servicio",

        CAPACITACION:
            "capacitacion",

        TRABAJO_REMOTO:
            "trabajo-remoto",

        DUELO:
            "otro",

        PERMISO_CON_GOCE:
            "permiso-personal",

        PERMISO_SIN_GOCE:
            "otro",

        OTRO:
            "otro"

    };


    return clases[tipo] || "otro";

}



/*=====================================================
TEXTO DE DURACIÓN
=====================================================*/

function obtenerTextoDuracion(
    permiso
){

    if(
        permiso.tipoDuracion ===
        "MEDIO_DIA"
    ){

        return (
            permiso.mitadDia ===
            "SEGUNDA_MITAD"
            ? "Segunda mitad del día"
            : "Primera mitad del día"
        );

    }


    if(
        permiso.tipoDuracion ===
        "HORAS"
    ){

        return (
            `${permiso.horaInicio || "--:--"} a ` +
            `${permiso.horaFin || "--:--"}`
        );

    }


    return "Día completo";

}



/*=====================================================
FORMATEAR ESTADO
=====================================================*/

function formatearEstado(
    estado
){

    const estados = {

        PENDIENTE:
            "Pendiente",

        APROBADO:
            "Aprobado",

        RECHAZADO:
            "Rechazado",

        ANULADO:
            "Anulado"

    };


    return estados[estado] || "Pendiente";

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



function obtenerFechaLocal(
    fecha
){

    return formarFechaISO(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        fecha.getDate()
    );

}



function formatearFecha(
    fechaISO
){

    if(!fechaISO){

        return "Sin fecha";

    }


    const [
        anio,
        mes,
        dia
    ] = fechaISO
        .split("-")
        .map(Number);


    return new Intl.DateTimeFormat(
        "es-PE",
        {
            day:"2-digit",
            month:"2-digit",
            year:"numeric"
        }
    )
    .format(
        new Date(
            anio,
            mes - 1,
            dia
        )
    );

}



/*=====================================================
INICIALES
=====================================================*/

function obtenerIniciales(
    nombre
){

    if(!nombre) return "--";


    const palabras =
        nombre
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if(palabras.length === 1){

        return palabras[0]
            .substring(0,2)
            .toUpperCase();

    }


    return (
        palabras[0][0] +
        palabras[palabras.length - 1][0]
    )
    .toUpperCase();

}



/*=====================================================
PESO DE ARCHIVO
=====================================================*/

function formatearPesoArchivo(
    bytes
){

    if(bytes < 1024){

        return `${bytes} B`;

    }


    if(bytes < 1024 * 1024){

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }


    return `${(
        bytes /
        (
            1024 *
            1024
        )
    ).toFixed(1)} MB`;

}



/*=====================================================
ESCAPAR HTML
=====================================================*/

function escaparHTML(
    valor
){

    return String(
        valor ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}



/*=====================================================
ALERTAS
=====================================================*/

function mostrarAlertaAdvertencia(
    mensaje
){

    if(typeof Swal !== "undefined"){

        Swal.fire({

            title:"Atención",

            text:mensaje,

            icon:"warning",

            confirmButtonText:"Entendido"

        });

        return;

    }


    alert(mensaje);

}



function mostrarAlertaError(
    mensaje
){

    if(typeof Swal !== "undefined"){

        Swal.fire({

            title:"Error",

            text:mensaje,

            icon:"error",

            confirmButtonText:"Entendido"

        });

        return;

    }


    alert(mensaje);

}



async function mostrarAlertaExito(
    mensaje
){

    if(typeof Swal !== "undefined"){

        await Swal.fire({

            title:"Correcto",

            text:mensaje,

            icon:"success",

            confirmButtonText:"Entendido",

            timer:1800,

            timerProgressBar:true

        });

        return;

    }


    alert(mensaje);

}



/*=====================================================
ABRIR PERMISOS DESDE COLABORADORES
=====================================================*/

/*
    Esta función servirá posteriormente cuando
    agreguemos el botón VER en la columna Permisos
    de colaboradores.html.
*/

export async function abrirPermisosColaborador(
    colaboradorId
){

    if(
        colaboradoresPermisos.length === 0
    ){

        await cargarColaboradoresPermisos();

    }


    seleccionarColaboradorPermisos(
        colaboradorId
    );

}
