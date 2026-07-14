export function iniciarFiltrosColaboradores({

    obtenerColaboradores,

    alCambiarFiltros

}){

    const filtroSucursal =
    document.getElementById(
        "filtroSucursalColaborador"
    );


    const filtroArea =
    document.getElementById(
        "filtroAreaColaborador"
    );


    const filtroSubarea =
    document.getElementById(
        "filtroSubareaColaborador"
    );


    const filtroEstado =
    document.getElementById(
        "filtroEstadoColaborador"
    );


    const btnLimpiar =
    document.getElementById(
        "btnLimpiarFiltrosColaboradores"
    );


    function obtenerFiltros(){

        return {

            sucursal:
            filtroSucursal?.value || "",

            area:
            filtroArea?.value || "",

            subarea:
            filtroSubarea?.value || "",

            estado:
            filtroEstado?.value || ""

        };

    }


    function cargarOpciones(){

        const colaboradores =
        obtenerColaboradores();


        cargarSelect({

            select:
            filtroSucursal,

            valores:
            colaboradores.map(col=>
                col.organizacion?.sucursal ||
                col.sucursal ||
                ""
            ),

            textoInicial:
            "Todas las sucursales"

        });


        cargarSelect({

            select:
            filtroArea,

            valores:
            colaboradores.map(col=>
                col.organizacion?.area ||
                col.area ||
                ""
            ),

            textoInicial:
            "Todas las áreas"

        });


        cargarSelect({

            select:
            filtroSubarea,

            valores:
            colaboradores.map(col=>
                col.organizacion?.subarea ||
                col.subarea ||
                ""
            ),

            textoInicial:
            "Todas las subáreas"

        });

    }


    const ejecutarCambio = ()=>{

        if(
            typeof alCambiarFiltros ===
            "function"
        ){

            alCambiarFiltros();

        }

    };


    if(filtroSucursal){

        filtroSucursal.onchange =
        ejecutarCambio;

    }


    if(filtroArea){

        filtroArea.onchange =
        ejecutarCambio;

    }


    if(filtroSubarea){

        filtroSubarea.onchange =
        ejecutarCambio;

    }


    if(filtroEstado){

        filtroEstado.onchange =
        ejecutarCambio;

    }


    if(btnLimpiar){

        btnLimpiar.onclick = ()=>{

            if(filtroSucursal){

                filtroSucursal.value = "";

            }


            if(filtroArea){

                filtroArea.value = "";

            }


            if(filtroSubarea){

                filtroSubarea.value = "";

            }


            if(filtroEstado){

                filtroEstado.value = "";

            }


            ejecutarCambio();

        };

    }


    return {

        obtenerFiltros,

        cargarOpciones

    };

}


/*=====================================================
    CARGAR VALORES ÚNICOS
=====================================================*/

function cargarSelect({

    select,

    valores,

    textoInicial

}){

    if(!select){

        return;

    }


    const valorActual =
    select.value;


    const valoresUnicos =
    [

        ...new Set(

            valores

            .map(valor=>
                String(
                    valor || ""
                )
                .trim()
            )

            .filter(Boolean)

        )

    ]
    .sort(
        (
            primero,
            segundo
        )=>
        primero.localeCompare(
            segundo,
            "es",
            {
                sensitivity:"base"
            }
        )
    );


    select.innerHTML = `

        <option value="">

            ${textoInicial}

        </option>

    `;


    valoresUnicos.forEach(valor=>{

        const opcion =
        document.createElement(
            "option"
        );


        opcion.value =
        valor;


        opcion.textContent =
        valor;


        select.appendChild(
            opcion
        );

    });


    if(
        valoresUnicos.includes(
            valorActual
        )
    ){

        select.value =
        valorActual;

    }

}
