/*=====================================================/*=====================================================
HISTORIAL DE MARCACIONES
=====================================================*/

let cuerpoMarcaciones;
let buscarMarcaciones;
let informacionMarcaciones;
let fechaActualMarcaciones;
let marcacionesDia = [];

export function iniciarMarcacionesAsistencia() {
  cuerpoMarcaciones = document.getElementById("cuerpoMarcacionesAsistencia");

  buscarMarcaciones = document.getElementById("buscarMarcacionesAsistencia");

  informacionMarcaciones = document.getElementById(
    "informacionMarcacionesAsistencia",
  );

  fechaActualMarcaciones = document.getElementById("fechaActualMarcaciones");

  if (!cuerpoMarcaciones) {
    console.warn("No se encontró cuerpoMarcacionesAsistencia.");
    return;
  }

  buscarMarcaciones?.addEventListener("input", renderizarMarcaciones);

  document
    .getElementById("btnDiaAnteriorMarcaciones")
    ?.addEventListener("click", () => {
      document.getElementById("btnDiaAnteriorAsistencia")?.click();
    });

  document
    .getElementById("btnDiaSiguienteMarcaciones")
    ?.addEventListener("click", () => {
      document.getElementById("btnDiaSiguienteAsistencia")?.click();
    });

  document
    .getElementById("btnHoyMarcaciones")
    ?.addEventListener("click", () => {
      document.getElementById("btnHoyAsistencia")?.click();
    });

  document.addEventListener("asistencia:cambio-fecha", (evento) => {
    actualizarFechaVisible(evento.detail?.fechaObjeto);
    mostrarMensaje("Cargando marcaciones...");
  });

  document.addEventListener("asistencia:datos-diarios-cargados", (evento) => {
    const fecha = evento.detail?.fecha;
    const colaboradores = evento.detail?.colaboradores || [];
    const marcaciones = evento.detail?.marcaciones || [];

    prepararMarcaciones(fecha, colaboradores, marcaciones);
  });
}

function prepararMarcaciones(fecha, colaboradores, marcaciones) {
  const colaboradoresPorId = new Map(
    colaboradores.map((colaborador) => [colaborador.id, colaborador]),
  );

  marcacionesDia = marcaciones
    .filter((marcacion) => marcacion.fecha === fecha)
    .map((marcacion) => {
      const colaborador = colaboradoresPorId.get(marcacion.colaboradorId) || {};

      const nombres =
        colaborador.datosPersonales?.nombres || colaborador.nombres || "";

      const apellidos =
        colaborador.datosPersonales?.apellidos || colaborador.apellidos || "";

      const nombreDesdeColaborador = `${nombres} ${apellidos}`.trim();

      return {
        ...marcacion,
        colaboradorNombre:
          marcacion.colaboradorNombre ||
          colaborador.nombreCompleto ||
          nombreDesdeColaborador ||
          colaborador.nombre ||
          "Colaborador sin identificar",
        colaboradorDocumento:
          marcacion.colaboradorDocumento ||
          colaborador.documento?.numero ||
          colaborador.documento ||
          colaborador.dni ||
          "—",
      };
    })
    .sort((primera, segunda) => {
      return obtenerMilisegundos(primera) - obtenerMilisegundos(segunda);
    });

  renderizarMarcaciones();
}

function renderizarMarcaciones() {
  const texto = normalizarTexto(buscarMarcaciones?.value);

  const filtradas = marcacionesDia.filter((marcacion) => {
    return normalizarTexto(
      `${marcacion.colaboradorNombre} ${marcacion.colaboradorDocumento}`,
    ).includes(texto);
  });

  if (filtradas.length === 0) {
    mostrarMensaje(
      texto
        ? "No se encontraron marcaciones con esa búsqueda."
        : "No hay marcaciones registradas para la fecha seleccionada.",
    );
    actualizarInformacion(0);
    return;
  }

  cuerpoMarcaciones.innerHTML = filtradas
    .map((marcacion) => {
      const estado = String(marcacion.estado || "VALIDA").toUpperCase();
      const tipo = formatearEtiqueta(marcacion.tipo || "SIN_CLASIFICAR");
      const origen = formatearEtiqueta(marcacion.origen || "NO_INDICADO");
      const claseEstado = estado === "VALIDA" ? "valida" : "inactiva";

      return `
            <tr>
                <td class="marcacion-colaborador">
                    <strong>${escaparHTML(marcacion.colaboradorNombre)}</strong>
                    <small>${escaparHTML(marcacion.colaboradorDocumento)}</small>
                </td>
                <td>${escaparHTML(marcacion.colaboradorDocumento)}</td>
                <td>${escaparHTML(formatearFecha(marcacion.fecha))}</td>
                <td><span class="marcacion-hora">${escaparHTML(formatearHora(marcacion.hora))}</span></td>
                <td><span class="marcacion-tipo">${escaparHTML(tipo)}</span></td>
                <td><span class="marcacion-origen">${escaparHTML(origen)}</span></td>
                <td><span class="marcacion-estado ${claseEstado}">${escaparHTML(formatearEtiqueta(estado))}</span></td>
                <td><span class="asistencia-estado-desarrollo">Solo lectura</span></td>
            </tr>
        `;
    })
    .join("");

  actualizarInformacion(filtradas.length);
}

function mostrarMensaje(mensaje) {
  cuerpoMarcaciones.innerHTML = `
        <tr>
            <td colspan="8" class="asistencia-tabla-vacia">
                ${escaparHTML(mensaje)}
            </td>
        </tr>
    `;
}

function actualizarInformacion(total) {
  if (informacionMarcaciones) {
    informacionMarcaciones.textContent = `Mostrando ${total} ${total === 1 ? "marcación" : "marcaciones"}`;
  }
}

function actualizarFechaVisible(fecha) {
  if (!fechaActualMarcaciones || !(fecha instanceof Date)) {
    return;
  }

  fechaActualMarcaciones.textContent = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function obtenerMilisegundos(marcacion) {
  if (marcacion.fechaHora?.toMillis) {
    return marcacion.fechaHora.toMillis();
  }

  const fecha = new Date(
    marcacion.fechaHoraISO ||
      `${marcacion.fecha || "1970-01-01"}T${marcacion.hora || "00:00:00"}`,
  );

  return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
}

function formatearFecha(fecha) {
  const partes = String(fecha || "").split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : "—";
}

function formatearHora(hora) {
  return String(hora || "—").slice(0, 5);
}

function formatearEtiqueta(valor) {
  return String(valor || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
