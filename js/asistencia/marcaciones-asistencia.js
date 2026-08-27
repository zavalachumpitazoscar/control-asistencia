/*=====================================================
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
  cuerpoMarcaciones.addEventListener("click", abrirFotoMarcacion);
  cuerpoMarcaciones.addEventListener("click", corregirMarcacionInvalida);

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
    const registros = evento.detail?.registros || [];

    prepararMarcaciones(fecha, colaboradores, marcaciones, registros);
  });
}

function prepararMarcaciones(fecha, colaboradores, marcaciones, registros = []) {
  const colaboradoresPorId = new Map(
    colaboradores.map((colaborador) => [colaborador.id, colaborador]),
  );
  const registrosPorColaborador = new Map(
    registros.map((registro) => [registro.colaboradorId, registro]),
  );

  marcacionesDia = marcaciones
    .filter((marcacion) => marcacion.fecha === fecha)
    .map((marcacion) => {
      const colaborador = colaboradoresPorId.get(marcacion.colaboradorId) || {};
      const registro = registrosPorColaborador.get(marcacion.colaboradorId) || null;
      const clasificada = registro?.clasificacion?.todas?.find(
        (item) => item.id === marcacion.id,
      ) || null;

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
        tipoInterpretadoCalculado: clasificada?.tipoInterpretado || null,
        motivoSinClasificar: clasificada?.motivoSinClasificar || null,
        estadoCalculado: clasificada && !clasificada.tipoInterpretado
          ? "INVALIDA"
          : String(marcacion.estado || "VALIDA").toUpperCase(),
        registroAsistencia: registro,
        marcacionClasificada: clasificada,
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
      `${marcacion.colaboradorNombre} ${marcacion.colaboradorDocumento} ${obtenerDireccionMarcacion(marcacion)} ${marcacion.comentario || ""}`,
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
      const estado = String(marcacion.estadoCalculado || marcacion.estado || "VALIDA").toUpperCase();
      const tipo = formatearEtiqueta(marcacion.tipoInterpretadoCalculado || marcacion.tipo || "SIN_CLASIFICAR");
      const origen = formatearEtiqueta(marcacion.origen || "NO_INDICADO");
      const claseEstado = estado === "VALIDA" ? "valida" : "inactiva";
      const detalleTipo = marcacion.tipoInterpretadoCalculado && marcacion.tipoInterpretadoCalculado !== marcacion.tipo
        ? `<small>Declarada: ${escaparHTML(formatearEtiqueta(marcacion.tipo || "SIN_CLASIFICAR"))}</small>`
        : (estado === "INVALIDA" ? `<small>${escaparHTML(motivoInvalidez(marcacion))}</small>` : "");
      const accion = estado === "INVALIDA"
        ? `<button type="button" class="btn-tabla-asistencia" data-corregir-marcacion="${escaparHTML(marcacion.id || "")}"><i class="bi bi-pencil-square"></i> Corregir</button>`
        : '<span class="asistencia-estado-desarrollo">Solo lectura</span>';

      return `
            <tr>
                <td class="marcacion-colaborador">
                    <strong>${escaparHTML(marcacion.colaboradorNombre)}</strong>
                    <small>${escaparHTML(marcacion.colaboradorDocumento)}</small>
                </td>
                <td>${escaparHTML(marcacion.colaboradorDocumento)}</td>
                <td>${escaparHTML(formatearFecha(marcacion.fecha))}</td>
                <td><span class="marcacion-hora">${escaparHTML(formatearHoraMarcacion(marcacion))}</span></td>
                <td><span class="marcacion-tipo">${escaparHTML(tipo)}${detalleTipo}</span></td>
                <td><span class="marcacion-origen">${escaparHTML(origen)}</span></td>
                <td><span class="marcacion-estado ${claseEstado}">${escaparHTML(formatearEtiqueta(estado))}</span></td>
                <td>${renderizarUbicacion(marcacion)}</td>
                <td>${renderizarDireccion(marcacion)}</td>
                <td>${renderizarComentario(marcacion)}</td>
                <td>${renderizarFoto(marcacion)}</td>
                <td>${accion}</td>
            </tr>
        `;
    })
    .join("");

  actualizarInformacion(filtradas.length);
}

function motivoInvalidez(marcacion) {
  if (marcacion.motivoSinClasificar === "TIPO_REPETIDO_SIN_HORARIO") return "Tipo repetido sin horario";
  if (marcacion.motivoSinClasificar === "TIPO_SIN_HORARIO") return "Tipo no disponible sin horario";
  return "Fuera de la ventana del horario";
}

function mostrarMensaje(mensaje) {
  cuerpoMarcaciones.innerHTML = `
        <tr>
            <td colspan="12" class="asistencia-tabla-vacia">
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

function formatearHoraMarcacion(marcacion) {
  const valor = marcacion?.fechaHora;
  const fecha = valor?.toDate?.() || (valor instanceof Date ? valor : null);
  if (fecha && !Number.isNaN(fecha.getTime())) {
    return fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/Lima" });
  }
  const texto = marcacion?.hora || marcacion?.horaMarcacion || marcacion?.fechaHoraISO;
  const coincidencia = String(texto || "").match(/(?:T|\s)?(\d{2}:\d{2}(?::\d{2})?)/);
  return coincidencia?.[1] || "—";
}

function renderizarUbicacion(marcacion) {
  const ubicacion = marcacion?.ubicacion;
  const latitud = Number(ubicacion?.latitud);
  const longitud = Number(ubicacion?.longitud);
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return "—";
  const precision = Number(ubicacion?.precisionMetros);
  const detalle = Number.isFinite(precision) ? `Precisión ${Math.round(precision)} m` : "Ver coordenadas";
  const enlace = `https://www.google.com/maps?q=${encodeURIComponent(`${latitud},${longitud}`)}`;
  return `<a class="marcacion-ubicacion" href="${enlace}" target="_blank" rel="noopener noreferrer" title="${escaparHTML(`${latitud}, ${longitud}`)}"><i class="bi bi-geo-alt-fill"></i><span>Ver mapa<small>${escaparHTML(detalle)}</small></span></a>`;
}

function obtenerDireccionMarcacion(marcacion) {
  return String(
    marcacion?.direccion?.direccionCompleta ||
      marcacion?.ubicacion?.direccion ||
      marcacion?.direccionCompleta ||
      "",
  ).trim();
}

function renderizarDireccion(marcacion) {
  const direccion = obtenerDireccionMarcacion(marcacion);
  if (!direccion || direccion === "Dirección no disponible") {
    return `<span class="marcacion-direccion no-disponible"><strong>No disponible</strong><small>Registro sin dirección guardada</small></span>`;
  }
  return `<span class="marcacion-direccion" title="${escaparHTML(direccion)}"><strong>${escaparHTML(direccion)}</strong><small><i class="bi bi-info-circle"></i> Dirección aproximada según GPS</small></span>`;
}

function renderizarComentario(marcacion) {
  const comentario = String(marcacion?.comentario || "").trim();
  if (!comentario) return '<span class="marcacion-direccion no-disponible">Sin comentario</span>';
  return `<span class="marcacion-comentario" title="${escaparHTML(comentario)}">${escaparHTML(comentario)}</span>`;
}

function renderizarFoto(marcacion) {
  if (!marcacion?.foto?.dataUrl) {
    return '<span class="marcacion-direccion no-disponible">Sin foto</span>';
  }
  return `<button type="button" class="btn-tabla-asistencia ver-foto-marcacion" data-marcacion-id="${escaparHTML(marcacion.id)}"><i class="bi bi-image"></i> Ver foto</button>`;
}

function abrirFotoMarcacion(evento) {
  const boton = evento.target.closest(".ver-foto-marcacion");
  if (!boton) return;
  const marcacion = marcacionesDia.find((item) => item.id === boton.dataset.marcacionId);
  const dataUrl = marcacion?.foto?.dataUrl;
  if (!dataUrl) return;
  Swal.fire({
    title: `Evidencia de ${marcacion.colaboradorNombre}`,
    html: `<div style="display:grid;gap:12px"><img src="${dataUrl}" alt="Foto de la marcación" style="width:100%;max-height:65vh;object-fit:contain;border-radius:12px;background:#f8fafc"><p style="margin:0;text-align:left"><strong>Comentario:</strong> ${escaparHTML(marcacion.comentario || "Sin comentario")}</p></div>`,
    width: 720,
    confirmButtonText: "Cerrar",
    confirmButtonColor: "#2563eb",
  });
}

function corregirMarcacionInvalida(evento) {
  const boton = evento.target.closest("[data-corregir-marcacion]");
  if (!boton) return;
  const marcacion = marcacionesDia.find((item) => item.id === boton.dataset.corregirMarcacion);
  const registro = marcacion?.registroAsistencia;
  const clasificada = marcacion?.marcacionClasificada || marcacion;
  if (!marcacion || !registro) return;
  document.dispatchEvent(new CustomEvent("asistencia:editar-marcacion-existente", {
    detail: {
      colaboradorId: marcacion.colaboradorId,
      colaboradorNombre: marcacion.colaboradorNombre,
      fecha: marcacion.fecha,
      tipo: marcacion.tipo || "ENTRADA",
      marcacion: clasificada,
      horarioId: registro.horarioPrincipal?.id || null,
      horario: registro.horarioPrincipal || null,
      entradaActual: registro.entrada || null,
      salidaActual: registro.salida || null,
      inicioRefrigerioActual: registro.clasificacion?.inicioRefrigerio || null,
      finRefrigerioActual: registro.clasificacion?.finRefrigerio || null,
      refrigerio: registro.horarioPrincipal?.refrigerio || null,
    },
  }));
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
