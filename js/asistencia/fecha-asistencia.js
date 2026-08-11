/*=====================================================
VARIABLES
=====================================================*/

let fechaSeleccionada = normalizarFecha(new Date());

let fechaActualAsistencia;

let btnDiaAnteriorAsistencia;

let btnDiaSiguienteAsistencia;

let btnHoyAsistencia;

let selectoresFechaAsistencia = [];

/*=====================================================
INICIAR FECHA
=====================================================*/

export function iniciarFechaAsistencia() {
  fechaActualAsistencia = document.getElementById("fechaActualAsistencia");

  btnDiaAnteriorAsistencia = document.getElementById(
    "btnDiaAnteriorAsistencia",
  );

  btnDiaSiguienteAsistencia = document.getElementById(
    "btnDiaSiguienteAsistencia",
  );

  btnHoyAsistencia = document.getElementById("btnHoyAsistencia");

  selectoresFechaAsistencia = [
    document.getElementById("selectorFechaAsistencia"),
    document.getElementById("selectorFechaMarcaciones"),
  ].filter(Boolean);

  if (!fechaActualAsistencia) {
    console.warn("No se encontró fechaActualAsistencia.");

    return;
  }

  if (btnDiaAnteriorAsistencia) {
    btnDiaAnteriorAsistencia.onclick = () => cambiarFechaAsistencia(-1);
  }

  if (btnDiaSiguienteAsistencia) {
    btnDiaSiguienteAsistencia.onclick = () => cambiarFechaAsistencia(1);
  }

  if (btnHoyAsistencia) {
    btnHoyAsistencia.onclick = () => {
      fechaSeleccionada = normalizarFecha(new Date());

      actualizarFechaAsistencia();
    };
  }

  selectoresFechaAsistencia.forEach((selector) => {
    selector.addEventListener("change", () => {
      const fechaElegida = convertirFechaISOALocal(selector.value);

      if (!fechaElegida) {
        return;
      }

      fechaSeleccionada = fechaElegida;
      actualizarFechaAsistencia();
    });
  });

  actualizarFechaAsistencia();
}

/*=====================================================
CAMBIAR FECHA
=====================================================*/

function cambiarFechaAsistencia(cantidadDias) {
  fechaSeleccionada.setDate(fechaSeleccionada.getDate() + cantidadDias);

  fechaSeleccionada = normalizarFecha(fechaSeleccionada);

  actualizarFechaAsistencia();
}

/*=====================================================
ACTUALIZAR FECHA
=====================================================*/

function actualizarFechaAsistencia() {
  const fechaISO = obtenerFechaISO(fechaSeleccionada);

  selectoresFechaAsistencia.forEach((selector) => {
    selector.value = fechaISO;
  });

  fechaActualAsistencia.textContent = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fechaSeleccionada);

  document.dispatchEvent(
    new CustomEvent("asistencia:cambio-fecha", {
      detail: {
        fecha: fechaISO,

        fechaObjeto: new Date(fechaSeleccionada),
      },
    }),
  );
}

/*=====================================================
CONVERTIR FECHA ISO SIN DESFASE DE ZONA HORARIA
=====================================================*/

function convertirFechaISOALocal(valor) {
  const partes = String(valor || "")
    .split("-")
    .map(Number);

  if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) {
    return null;
  }

  const fecha = new Date(partes[0], partes[1] - 1, partes[2]);

  return Number.isNaN(fecha.getTime()) ? null : normalizarFecha(fecha);
}

/*=====================================================
OBTENER FECHA SELECCIONADA
=====================================================*/

export function obtenerFechaSeleccionadaAsistencia() {
  return new Date(fechaSeleccionada);
}

/*=====================================================
NORMALIZAR FECHA
=====================================================*/

function normalizarFecha(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/*=====================================================
FECHA ISO LOCAL
=====================================================*/

function obtenerFechaISO(fecha) {
  const anio = fecha.getFullYear();

  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}
