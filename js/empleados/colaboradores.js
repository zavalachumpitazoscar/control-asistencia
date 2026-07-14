import {
    db
}
from "../firebase-config.js";


import {

    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    getDocs

}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



export function iniciarColaboradores(){


    const empresaId =
    sessionStorage.getItem("empresaId");

    console.log(
    "empresaId usado en colaboradores:",
    empresaId
    );


    if(!empresaId){

        console.error(
            "No se encontró empresaId"
        );

        return;

    }



    const lista =
    document.getElementById(
        "listaColaboradores"
    );

    if(!lista){

    console.error(
        "No se encontró listaColaboradores"
    );

    return;

}


    const buscar =
    document.getElementById(
        "buscarColaborador"
    );


    const seleccionarTodos =
    document.getElementById(
        "seleccionarTodos"
    );


    const btnActivar =
    document.getElementById(
        "btnActivarSeleccion"
    );


    const btnDesactivar =
    document.getElementById(
        "btnDesactivarSeleccion"
    );



    let colaboradores = [];

    let seleccionados = [];

    let paginaActual = 1;

    let sucursales = [];

let areas = [];

let subareas = [];

let colaboradorEditandoId = null;

    

const registrosPorPagina = 20;


const btnEliminar =
document.getElementById(
    "btnEliminarSeleccion"
);


const btnCargaMasiva =
document.getElementById(
    "btnCargaMasiva"
);


const btnNuevo =
document.getElementById(
    "btnNuevoColaborador"
);


const modal =
document.getElementById(
    "modalColaborador"
);


const cerrar =
document.getElementById(
    "cerrarColaborador"
);

const formColaborador =
document.getElementById(
    "formColaborador"
);


const cancelarColaborador =
document.getElementById(
    "cancelarColaborador"
);


const guardarColaborador =
document.getElementById(
    "guardarColaborador"
);


const sucursalColaborador =
document.getElementById(
    "sucursalColaborador"
);


const areaColaborador =
document.getElementById(
    "areaColaborador"
);


const subareaColaborador =
document.getElementById(
    "subareaColaborador"
);

const tabsModal =
document.querySelectorAll(
    ".tab-modal"
);

const contenidosModal =
document.querySelectorAll(
    ".contenido-tab-modal"
);

tabsModal.forEach(tab=>{

    tab.onclick = ()=>{

        const tabSeleccionado =
        tab.dataset.tab;


        tabsModal.forEach(item=>{

            item.classList.remove(
                "activo"
            );

        });


        contenidosModal.forEach(
            contenido=>{

                contenido.classList.remove(
                    "activo"
                );

            }
        );


        tab.classList.add(
            "activo"
        );


        const contenidoActivo =
        document.getElementById(
            tabSeleccionado
        );


        if(contenidoActivo){

            contenidoActivo.classList.add(
                "activo"
            );

        }

    };

});

async function abrirModalColaborador(){

    if(!modal) return;


    colaboradorEditandoId = null;

    subareas = [];


    if(formColaborador){

        formColaborador.reset();

    }


    const titulo =
    document.getElementById(
        "tituloModalColaborador"
    );


    if(titulo){

        titulo.textContent =
        "Nuevo colaborador";

    }


    tabsModal.forEach(tab=>{

        tab.classList.remove(
            "activo"
        );

    });


    contenidosModal.forEach(contenido=>{

        contenido.classList.remove(
            "activo"
        );

    });


    const primeraTab =
    document.querySelector(
        '.tab-modal[data-tab="informacionGeneral"]'
    );


    const informacionGeneral =
    document.getElementById(
        "informacionGeneral"
    );


    primeraTab?.classList.add(
        "activo"
    );


    informacionGeneral?.classList.add(
        "activo"
    );

    
    if(subareaColaborador){

        subareaColaborador.innerHTML = `

            <option value="">
                Seleccionar subárea
            </option>

        `;

        subareaColaborador.disabled = true;

    }


modal.style.display =
"flex";


try{

    await Promise.all([

        cargarSucursales(),

        cargarAreas()

    ]);

}
catch(error){

    console.error(
        "Error al cargar organización:",
        error
    );

}

}

function cerrarModalColaborador(){

    if(!modal) return;


    modal.style.display =
    "none";


    colaboradorEditandoId =
    null;


    if(formColaborador){

        formColaborador.reset();

    }

}

async function cargarSucursales(){

    if(!sucursalColaborador){

        console.error(
            "No existe el select sucursalColaborador"
        );

        return;

    }


    sucursalColaborador.disabled =
    true;


    sucursalColaborador.innerHTML = `

        <option value="">
            Cargando sucursales...
        </option>

    `;


    try{


        console.log(
            "Buscando sucursales para:",
            empresaId
        );


        const consultaSucursales =
        query(

            collection(
                db,
                "sucursales"
            ),

            where(
                "empresaId",
                "==",
                empresaId
            )

        );


        const resultado =
        await getDocs(
            consultaSucursales
        );


        console.log(
            "Sucursales encontradas:",
            resultado.size
        );


        sucursales = [];


        resultado.forEach(documento=>{

            const datos =
            documento.data();


            console.log(
                "Sucursal Firestore:",
                documento.id,
                datos
            );


const estado =
String(
    datos.estado ?? "ACTIVO"
)
.trim()
.toUpperCase();


const estaActiva =

    estado === "ACTIVO"

    ||

    estado === "ACTIVA"

    ||

    estado === "TRUE"

    ||

    estado === "1";


if(estaActiva){

    sucursales.push({

        id:
        documento.id,

        ...datos

    });

}

        });


        if(sucursales.length === 0){

            sucursalColaborador.innerHTML = `

                <option value="">
                    No hay sucursales activas
                </option>

            `;


            sucursalColaborador.disabled =
            true;


            console.warn(
                "No se encontraron sucursales activas para empresaId:",
                empresaId
            );

            return;

        }


        sucursalColaborador.innerHTML = `

            <option value="">
                Seleccionar sucursal
            </option>

        `;


        sucursales.forEach(sucursal=>{

            const nombreSucursal =

                sucursal.nombre ||

                sucursal.nombreSucursal ||

                sucursal.descripcion ||

                sucursal.sucursal ||

                "Sucursal sin nombre";


            const opcion =
            document.createElement(
                "option"
            );


            opcion.value =
            sucursal.id;


            opcion.textContent =
            nombreSucursal;


            sucursalColaborador.appendChild(
                opcion
            );

        });


        sucursalColaborador.disabled =
        false;


    }
    catch(error){


        console.error(
            "Error completo al cargar sucursales:",
            error
        );


        sucursalColaborador.innerHTML = `

            <option value="">
                Error al cargar sucursales
            </option>

        `;


        sucursalColaborador.disabled =
        true;

    }

}

async function cargarAreas(){

    if(!areaColaborador){

        console.error(
            "No existe el select areaColaborador"
        );

        return;

    }


    areaColaborador.disabled =
    true;


    areaColaborador.innerHTML = `

        <option value="">
            Cargando áreas...
        </option>

    `;


    try{


        console.log(
            "Buscando áreas para:",
            empresaId
        );


        const consultaAreas =
        query(

            collection(
                db,
                "areas"
            ),

            where(
                "empresaId",
                "==",
                empresaId
            )

        );


        const resultado =
        await getDocs(
            consultaAreas
        );


        console.log(
            "Áreas encontradas:",
            resultado.size
        );


        areas = [];


        resultado.forEach(documento=>{

            const datos =
            documento.data();


            console.log(
                "Área Firestore:",
                documento.id,
                datos
            );


const estado =
String(
    datos.estado ?? "ACTIVO"
)
.trim()
.toUpperCase();


const estaActiva =

    estado === "ACTIVO"

    ||

    estado === "ACTIVA"

    ||

    estado === "TRUE"

    ||

    estado === "1";


if(estaActiva){

    areas.push({

        id:
        documento.id,

        ...datos

    });

}

        });


        if(areas.length === 0){

            areaColaborador.innerHTML = `

                <option value="">
                    No hay áreas activas
                </option>

            `;


            areaColaborador.disabled =
            true;


            console.warn(
                "No se encontraron áreas activas para empresaId:",
                empresaId
            );

            return;

        }


        areaColaborador.innerHTML = `

            <option value="">
                Seleccionar área
            </option>

        `;


        areas.forEach(area=>{

            const nombreArea =

                area.nombre ||

                area.nombreArea ||

                area.descripcion ||

                area.area ||

                "Área sin nombre";


            const opcion =
            document.createElement(
                "option"
            );


            opcion.value =
            area.id;


            opcion.textContent =
            nombreArea;


            areaColaborador.appendChild(
                opcion
            );

        });


        areaColaborador.disabled =
        false;


    }
    catch(error){


        console.error(
            "Error completo al cargar áreas:",
            error
        );


        areaColaborador.innerHTML = `

            <option value="">
                Error al cargar áreas
            </option>

        `;


        areaColaborador.disabled =
        true;

    }

}

async function cargarSubareasPorArea(
    areaId
){

    if(!subareaColaborador) return;


    subareas = [];


    subareaColaborador.innerHTML = `

        <option value="">
            Seleccionar subárea
        </option>

    `;


    if(!areaId){

        subareaColaborador.disabled =
        true;

        return;

    }


    subareaColaborador.disabled =
    true;


    subareaColaborador.innerHTML = `

        <option value="">
            Cargando subáreas...
        </option>

    `;


    try{


        const consultaSubareas =
        query(

            collection(
                db,
                "subareas"
            ),

            where(
                "empresaId",
                "==",
                empresaId
            )

        );


        const resultado =
        await getDocs(
            consultaSubareas
        );


        resultado.forEach(documento=>{

            const datos =
            documento.data();


            if(

                datos.areaId === areaId

                &&

                (
                    !datos.estado ||
                    datos.estado === "ACTIVA"
                )

            ){

                subareas.push({

                    id:
                    documento.id,

                    ...datos

                });

            }

        });


        if(subareas.length === 0){

            subareaColaborador.innerHTML = `

                <option value="">
                    Esta área no tiene subáreas
                </option>

            `;

            subareaColaborador.disabled =
            true;

            return;

        }


        subareaColaborador.innerHTML = `

            <option value="">
                Seleccionar subárea
            </option>

        `;


        subareas.forEach(subarea=>{

            subareaColaborador.innerHTML += `

                <option value="${subarea.id}">

                    ${
                        subarea.nombre ||
                        subarea.nombreSubarea ||
                        "Subárea sin nombre"
                    }

                </option>

            `;

        });


        subareaColaborador.disabled =
        false;


    }
    catch(error){


        console.error(
            "Error al cargar subáreas:",
            error
        );


        subareaColaborador.innerHTML = `

            <option value="">
                No se pudieron cargar
            </option>

        `;


        subareaColaborador.disabled =
        true;

    }

}

if(areaColaborador){

    areaColaborador.onchange =
    async ()=>{

        await cargarSubareasPorArea(
            areaColaborador.value
        );

    };

}
    //=================================
    // LISTAR COLABORADORES
    //=================================


    const consulta = query(

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



    onSnapshot(

        consulta,

        snapshot=>{


            colaboradores = [];


            snapshot.forEach(doc=>{


                colaboradores.push({

                    id:doc.id,

                    ...doc.data()

                });


            });


            renderizar();


        }

    );





    //=================================
    // RENDER
    //=================================


    function renderizar(){


        lista.innerHTML="";



        let texto = "";


        if(buscar){

            texto =
            buscar.value
            .toLowerCase()
            .trim();

        }



const filtrados =
colaboradores.filter(col=>{


    const nombres =
    col.datosPersonales?.nombres ||
    col.nombres ||
    "";


    const apellidos =
    col.datosPersonales?.apellidos ||
    col.apellidos ||
    "";


    const nombreCompleto =
    `${nombres} ${apellidos}`
    .toLowerCase();


    const numeroDocumento =
    (
        col.documento?.numero ||
        col.dni ||
        ""
    )
    .toLowerCase();


    return (

        nombreCompleto.includes(
            texto
        )

        ||

        numeroDocumento.includes(
            texto
        )

    );

});

        const inicio =
(paginaActual-1) *
registrosPorPagina;

const fin =
inicio +
registrosPorPagina;

const pagina =
filtrados.slice(
inicio,
fin
);


        if(filtrados.length===0){


            lista.innerHTML=`

            <div class="sin-registros">

                <i class="bi bi-people"></i>

                <h3>
                    No existen colaboradores
                </h3>

                <p>
                    Los colaboradores registrados aparecerán aquí.
                </p>

            </div>

            `;


            return;

        }





        pagina.forEach(col=>{

            const numeroDocumento =
col.documento?.numero ||
col.dni ||
"-";


const apellidos =
col.datosPersonales?.apellidos ||
col.apellidos ||
"-";


const nombres =
col.datosPersonales?.nombres ||
col.nombres ||
"-";


const sucursal =
col.organizacion?.sucursal ||
col.sucursal ||
"-";


const area =
col.organizacion?.area ||
col.area ||
"-";


const subarea =
col.organizacion?.subarea ||
col.subarea ||
"-";


const horario =
col.organizacion?.horario ||
col.horario ||
"-";


            lista.innerHTML +=`


            <div class="tabla-fila">


                <div>

                    <input
                    class="check-colaborador"
                    type="checkbox"
                    data-id="${col.id}"
                    ${

                    seleccionados.includes(col.id)
                    ?
                    "checked"
                    :
                    ""

                    }>

                </div>



                <div>

                ${numeroDocumento}

                </div>

                <div>

                ${apellidos}

                </div>

                <div>

                ${nombres}

                </div>


                <div>

                ${sucursal}

                </div>



                <div>

                ${area}

                </div>



                <div>

                ${subarea}

                </div>

                <div>


                    <span class="badge-estado

                    ${
                    col.estado==="ACTIVO"
                    ?
                    "activa"
                    :
                    "inactiva"
                    }

                    ">

                    ${
                    col.estado || "ACTIVO"
                    }

                    </span>


                </div>

                <div>

                ${horario}

                </div>


                <div class="centrado columna-acciones">

                <button class="btn-editar-colaborador" data-id="${col.id}">

                <i class="bi bi-pencil"></i>

                </button>

                </div>
            </div>
            `;
        });

activarChecks();

activarEditar();

renderizarPaginacion(
    filtrados.length
);


    }

function activarEditar(){

    document
    .querySelectorAll(
    ".btn-editar-colaborador")
    .forEach(btn=>{

        btn.onclick=()=>{

            console.log(
                "Editar",
                btn.dataset.id
            );

        };

    });

}

function renderizarPaginacion(total){

    const contenedor =
    document.getElementById(
        "paginacionColaboradores"
    );

    if(!contenedor) return;

    contenedor.innerHTML="";

    const paginas =
    Math.ceil(
        total /
        registrosPorPagina
    );

    for(let i=1;i<=paginas;i++){

        contenedor.innerHTML += `

        <button
        class="btn-pagina ${
        i===paginaActual
        ?"activa":""
        }"
        data-pagina="${i}">

            ${i}

        </button>

        `;

    }

    document
    .querySelectorAll(".btn-pagina")
    .forEach(btn=>{

        btn.onclick=()=>{

            paginaActual =
            Number(
                btn.dataset.pagina
            );

            renderizar();

        };

    });

}




    //=================================
    // CHECKBOX
    //=================================


    function activarChecks(){


        document
        .querySelectorAll(
            ".check-colaborador"
        )
        .forEach(check=>{


            check.onchange = ()=>{


                const id =
                check.dataset.id;



                if(check.checked){


                    if(
                        !seleccionados.includes(id)
                    ){

                        seleccionados.push(id);

                    }


                }

                else{


                    seleccionados =
                    seleccionados.filter(
                        item=>item!==id
                    );


                }


                actualizarAcciones();


            };


        });


    }



function actualizarAcciones(){

    const activo =
    seleccionados.length > 0;


    if(btnActivar){

        btnActivar.disabled =
        !activo;

    }


    if(btnDesactivar){

        btnDesactivar.disabled =
        !activo;

    }


    if(btnEliminar){

        btnEliminar.disabled =
        !activo;

    }

}






    //=================================
    // SELECCIONAR TODOS
    //=================================


    if(seleccionarTodos){


        seleccionarTodos.onchange = ()=>{


            const checks =
            document.querySelectorAll(
                ".check-colaborador"
            );



            checks.forEach(check=>{


                check.checked =
                seleccionarTodos.checked;



                const id =
                check.dataset.id;



                if(
                    seleccionarTodos.checked
                ){


                    if(
                    !seleccionados.includes(id)
                    ){

                        seleccionados.push(id);

                    }


                }

                else{


                    seleccionados =
                    [];


                }


            });



            actualizarAcciones();


        };


    }







    //=================================
    // BUSQUEDA
    //=================================


    if(buscar){


buscar.addEventListener(
"input",
()=>{

    paginaActual = 1;

    renderizar();

}
);

    }


// ==========================
// BOTÓN NUEVO
// ==========================

if(btnNuevo){

    btnNuevo.onclick = ()=>{

        abrirModalColaborador();

    };

}

// ==========================
// CERRAR MODAL
// ==========================

if(cerrar){

    cerrar.onclick = ()=>{

        cerrarModalColaborador();

    };

}


if(cancelarColaborador){

    cancelarColaborador.onclick = ()=>{

        cerrarModalColaborador();

    };

}

if(modal){

    modal.addEventListener(
        "click",
        evento=>{

            if(evento.target === modal){

                cerrarModalColaborador();

            }

        }
    );

}


if(formColaborador){

    formColaborador.addEventListener(
        "submit",
        async evento=>{

            evento.preventDefault();


            const tipoDocumento =
            document
            .getElementById(
                "tipoDocumentoColaborador"
            )
            ?.value || "";


const numeroDocumento =
document
.getElementById(
    "numeroDocumentoColaborador"
)
?.value
.trim()
.toUpperCase() || "";


            const nombres =
            document
            .getElementById(
                "nombresColaborador"
            )
            ?.value
            .trim() || "";


            const apellidos =
            document
            .getElementById(
                "apellidosColaborador"
            )
            ?.value
            .trim() || "";


            const fechaNacimiento =
            document
            .getElementById(
                "fechaNacimientoColaborador"
            )
            ?.value || "";


            const genero =
            document
            .getElementById(
                "generoColaborador"
            )
            ?.value ||
            "SIN_ESPECIFICAR";


            const correo =
            document
            .getElementById(
                "correoColaborador"
            )
            ?.value
            .trim()
            .toLowerCase() || "";


            const telefono =
            document
            .getElementById(
                "telefonoColaborador"
            )
            ?.value
            .trim() || "";


            const direccion =
            document
            .getElementById(
                "direccionColaborador"
            )
            ?.value
            .trim() || "";


            const cargoProfesion =
            document
            .getElementById(
                "cargoProfesionColaborador"
            )
            ?.value
            .trim() || "";


            const inicioContrato =
            document
            .getElementById(
                "inicioContratoColaborador"
            )
            ?.value || "";


            const terminoContrato =
            document
            .getElementById(
                "terminoContratoColaborador"
            )
            ?.value || "";


            const nacionalidad =
            document
            .getElementById(
                "nacionalidadColaborador"
            )
            ?.value
            .trim() || "";


            const paisNacionalidad =
            document
            .getElementById(
                "paisNacionalidadColaborador"
            )
            ?.value || "";


            const comentarios =
            document
            .getElementById(
                "comentariosColaborador"
            )
            ?.value
            .trim() || "";


            const sucursalId =
            sucursalColaborador?.value ||
            "";


            const areaId =
            areaColaborador?.value ||
            "";


            const subareaId =
            subareaColaborador?.value ||
            "";


            const sucursalSeleccionada =
            sucursales.find(
                sucursal=>
                sucursal.id === sucursalId
            );


            const areaSeleccionada =
            areas.find(
                area=>
                area.id === areaId
            );


            const subareaSeleccionada =
            subareas.find(
                subarea=>
                subarea.id === subareaId
            );


            const nombreSucursal =
            sucursalSeleccionada?.nombre ||
            sucursalSeleccionada?.nombreSucursal ||
            "";


            const nombreArea =
            areaSeleccionada?.nombre ||
            areaSeleccionada?.nombreArea ||
            "";


            const nombreSubarea =
            subareaSeleccionada?.nombre ||
            subareaSeleccionada?.nombreSubarea ||
            "";

if(
    !tipoDocumento ||
    !numeroDocumento ||
    !nombres ||
    !apellidos
){

    tabsModal.forEach(tab=>{

        tab.classList.remove(
            "activo"
        );

    });


    contenidosModal.forEach(contenido=>{

        contenido.classList.remove(
            "activo"
        );

    });


    document
    .querySelector(
        '.tab-modal[data-tab="informacionGeneral"]'
    )
    ?.classList.add(
        "activo"
    );


    document
    .getElementById(
        "informacionGeneral"
    )
    ?.classList.add(
        "activo"
    );


    Swal.fire({

        icon:"warning",

        title:"Campos incompletos",

        text:
        "Completa el tipo de documento, número de documento, nombres y apellidos.",

        confirmButtonText:"Aceptar"

    });

    return;

}


            if(
                tipoDocumento === "DNI" &&
                !/^\d{8}$/.test(
                    numeroDocumento
                )
            ){

                Swal.fire({

                    icon:
                    "warning",

                    title:
                    "DNI incorrecto",

                    text:
                    "El DNI debe contener exactamente 8 números."

                });

                return;

            }


const documentoExistente =
colaboradores.some(
    colaborador=>{

        const documentoGuardado =
        (
            colaborador.documento?.numero ||
            colaborador.dni ||
            ""
        )
        .trim()
        .toUpperCase();


        return documentoGuardado ===
        numeroDocumento;

    }
);

            if(documentoExistente){

                Swal.fire({

                    icon:
                    "warning",

                    title:
                    "Documento registrado",

                    text:
                    "Ya existe un colaborador con este número de documento."

                });

                return;

            }


            if(
                inicioContrato &&
                terminoContrato &&
                terminoContrato <
                inicioContrato
            ){

                Swal.fire({

                    icon:
                    "warning",

                    title:
                    "Fechas incorrectas",

                    text:
                    "El término del contrato no puede ser anterior al inicio del contrato."

                });

                return;

            }

            if(!guardarColaborador){

    console.error(
        "No se encontró guardarColaborador"
    );

    return;

}


            try{


                guardarColaborador.disabled =
                true;


                guardarColaborador.innerHTML = `

                    <span class="spinner-boton">
                    </span>

                    Guardando...

                `;


                await addDoc(

                    collection(
                        db,
                        "colaboradores"
                    ),

                    {

                        empresaId,

                        documento:{

                            tipo:
                            tipoDocumento,

                            numero:
                            numeroDocumento

                        },

                        datosPersonales:{

                            nombres,

                            apellidos,

                            fechaNacimiento:
                            fechaNacimiento ||
                            null,

                            genero

                        },

                        contacto:{

                            correo,

                            telefono,

                            direccion

                        },

organizacion:{

    sucursalId:
    sucursalId || null,

    sucursal:
    nombreSucursal || "",

    areaId:
    areaId || null,

    area:
    nombreArea || "",

    subareaId:
    subareaId || null,

    subarea:
    nombreSubarea || ""

},

                        informacionAdicional:{

                            cargoProfesion,

                            inicioContrato:
                            inicioContrato ||
                            null,

                            terminoContrato:
                            terminoContrato ||
                            null,

                            nacionalidad,

                            paisNacionalidad,

                            comentarios

                        },

                        estado:
                        "ACTIVO",

                        fechaRegistro:
                        serverTimestamp()

                    }

                );


                cerrarModalColaborador();


                await Swal.fire({

                    icon:
                    "success",

                    title:
                    "Colaborador registrado",

                    text:
                    "El colaborador se registró correctamente.",

                    confirmButtonText:
                    "Aceptar"

                });


            }
            catch(error){


                console.error(
                    "Error al registrar colaborador:",
                    error
                );


                Swal.fire({

                    icon:
                    "error",

                    title:
                    "No se pudo registrar",

                    text:
                    "Ocurrió un error al guardar el colaborador."

                });


            }
            finally{


                guardarColaborador.disabled =
                false;


                guardarColaborador.innerHTML = `

                    <i class="bi bi-floppy"></i>

                    Guardar colaborador

                `;

            }

        }

    );

}    

    // ==========================
    // ACTIVAR
    // ==========================

    if(btnActivar){

        btnActivar.onclick=()=>{

            console.log(seleccionados);

        };

    }


    // ==========================
    // DESACTIVAR
    // ==========================

    if(btnDesactivar){

        btnDesactivar.onclick=()=>{

            console.log(seleccionados);

        };

    }


    // ==========================
    // ELIMINAR
    // ==========================

    if(btnEliminar){

        btnEliminar.onclick=()=>{

            console.log(seleccionados);

        };

    }


    // ==========================
    // CARGA MASIVA
    // ==========================

    if(btnCargaMasiva){

        btnCargaMasiva.onclick=()=>{

            Swal.fire({

                icon:"info",

                title:"Carga masiva",

                text:"Aquí se importará un archivo Excel."

            });

        };

    }

}



