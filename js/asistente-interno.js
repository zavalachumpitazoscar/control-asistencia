const ESTADOS = {
  tardanza: { clave: "tardanzas", valor: "TARDANZA", etiqueta: "tardanzas" },
  ausencia: { clave: "ausencias", valor: "AUSENTE", etiqueta: "ausencias" },
  incompleto: { clave: "incompletos", valor: "INCOMPLETO", etiqueta: "marcaciones incompletas" },
  presente: { clave: "asistencias", valor: "PRESENTE", etiqueta: "asistencias" },
  permiso: { clave: "permisos", valor: "CON_PERMISO", etiqueta: "permisos" },
  sinHorario: { clave: "sinHorario", valor: "SIN_HORARIO", etiqueta: "colaboradores sin horario" },
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const METRICAS = {
  trabajadas: { campo: "minutosTrabajados", etiqueta: "horas trabajadas" },
  asignadas: { campo: "minutosAsignados", etiqueta: "horas asignadas" },
  ausencia: { campo: "minutosAusencia", etiqueta: "horas de ausencia" },
  justificadas: { campo: "minutosJustificados", etiqueta: "horas justificadas" },
  extraGenerada: { campo: "minutosExtraGenerados", etiqueta: "horas extra generadas" },
  extraPendiente: { campo: "minutosExtraPendientes", etiqueta: "horas extra pendientes" },
  extraAprobada: { campo: "minutosExtraAprobados", etiqueta: "horas extra aprobadas" },
};

let panel, mensajes, entrada, botonFlotante;

iniciarAsistente();

function iniciarAsistente() {
  if (document.getElementById("asistenteInterno")) return;
  document.body.insertAdjacentHTML("beforeend", plantilla());
  panel = document.getElementById("asistenteInterno");
  mensajes = document.getElementById("asistenteMensajes");
  entrada = document.getElementById("asistenteEntrada");
  botonFlotante = document.getElementById("btnAsistenteInterno");

  botonFlotante.addEventListener("click", alternarPanel);
  document.getElementById("btnCerrarAsistente").addEventListener("click", cerrarPanel);
  document.getElementById("formAsistenteInterno").addEventListener("submit", enviarConsulta);
  entrada.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      document.getElementById("formAsistenteInterno").requestSubmit();
    }
  });
  panel.addEventListener("click", manejarAccion);
  document.querySelectorAll(".asistente-sugerencia").forEach((boton) =>
    boton.addEventListener("click", () => procesarConsulta(boton.dataset.consulta)),
  );
  mostrarBienvenida();
}

function plantilla() {
  return `
    <button type="button" class="asistente-boton" id="btnAsistenteInterno" aria-label="Abrir asistente virtual" title="Asistente virtual">
      <img src="img/logo.png" alt="" class="asistente-logo-boton">
      <i class="bi bi-stars asistente-destello" aria-hidden="true"></i>
      <span class="asistente-punto"></span>
    </button>
    <section class="asistente-panel" id="asistenteInterno" aria-label="Asistente virtual" aria-hidden="true">
      <header class="asistente-cabecera">
        <div class="asistente-avatar">
          <img src="img/logo.png" alt="" class="asistente-logo-cabecera">
          <i class="bi bi-stars asistente-destello-cabecera" aria-hidden="true"></i>
        </div>
        <div class="asistente-cabecera-texto"><h2>Asistente de asistencia</h2><p>Consultas y acciones del sistema</p></div>
        <button type="button" class="asistente-cerrar" id="btnCerrarAsistente" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button>
      </header>
      <div class="asistente-mensajes" id="asistenteMensajes" aria-live="polite"></div>
      <div class="asistente-sugerencias">
        <button type="button" class="asistente-sugerencia" data-consulta="¿Quiénes llegaron tarde hoy?">Tardanzas de hoy</button>
        <button type="button" class="asistente-sugerencia" data-consulta="¿Cuántas tardanzas hubo este mes?">Tardanzas del mes</button>
        <button type="button" class="asistente-sugerencia" data-consulta="¿Qué reportes tienes?">Ver reportes</button>
        <button type="button" class="asistente-sugerencia" data-consulta="Asistencia simplificada de todos del mes pasado">Simplificado mes pasado</button>
        <button type="button" class="asistente-sugerencia" data-consulta="Marcaciones incompletas de hoy">Incompletos</button>
      </div>
      <form class="asistente-formulario" id="formAsistenteInterno">
        <textarea id="asistenteEntrada" rows="1" maxlength="400" placeholder="Ej.: ¿Quiénes llegaron tarde hoy?"></textarea>
        <button type="submit" class="asistente-enviar" aria-label="Enviar"><i class="bi bi-send-fill"></i></button>
      </form>
    </section>`;
}

function alternarPanel() {
  const abierto = !panel.classList.contains("abierto");
  panel.classList.toggle("abierto", abierto);
  panel.setAttribute("aria-hidden", String(!abierto));
  botonFlotante.setAttribute("aria-expanded", String(abierto));
  if (abierto) setTimeout(() => entrada.focus(), 120);
}

function cerrarPanel() {
  panel.classList.remove("abierto");
  panel.setAttribute("aria-hidden", "true");
  botonFlotante.setAttribute("aria-expanded", "false");
}

function enviarConsulta(evento) {
  evento.preventDefault();
  const consulta = entrada.value.trim();
  if (!consulta) return;
  entrada.value = "";
  procesarConsulta(consulta);
}

async function procesarConsulta(consulta) {
  if (!panel.classList.contains("abierto")) alternarPanel();
  agregarMensaje("usuario", escapar(consulta));
  const cargando = agregarCargando();
  try {
    const texto = normalizar(consulta);
    const estado = detectarEstado(texto);
    const metrica = detectarMetrica(texto);
    const periodo = interpretarPeriodo(texto, estado ? "dia" : "mes");

    const esSolicitudReporte =
      /(reporte|informe|planilla)/.test(texto) ||
      /(descarg|genera|prepara|quiero|dame).*(simplific|resumen|horas trabajadas)/.test(texto) ||
      /asistencia simplificad|simplificad.*(?:todos|individual|colaborador)/.test(texto);
    if (esSolicitudReporte && /(simplific|resumen|horas trabajadas|descarg|excel|pdf|asistencia)/.test(texto) && !/(que|cuales|lista|mostrar|explica).*(reporte)|reporte.*(tienes|disponible)/.test(texto)) {
      const tipo = detectarTipoReporte(texto);
      const periodoReporte = interpretarPeriodo(texto, "mes");
      await prepararReporte(tipo, periodoReporte, texto);
      cargando.remove();
      responderReportePreparado(tipo, periodoReporte);
      return;
    }

    if (metrica) {
      const periodoMetrica = interpretarPeriodo(texto, "mes");
      const resultado = await consultarMetricaPeriodo(metrica, periodoMetrica);
      cargando.remove();
      responderMetricaPeriodo(metrica, resultado);
      return;
    }

    if (estado) {
      if (periodo.tipo === "dia") {
        const resultado = await consultarEstadoDiario(estado, periodo.desde);
        cargando.remove();
        responderEstado(estado, resultado);
      } else {
        const resultado = await consultarEstadoPeriodo(estado, periodo);
        cargando.remove();
        responderEstadoPeriodo(estado, resultado);
      }
      return;
    }
    if (/(que|cuales|lista|mostrar|explica).*(reporte)|reporte.*(tienes|disponible)/.test(texto)) {
      cargando.remove();
      responderReportes();
      return;
    }
    if (/emplead|colaborador/.test(texto) && /(abrir|ir|gestionar|modulo)/.test(texto)) {
      await navegar("empleados");
      cargando.remove();
      agregarMensaje("asistente", "Abrí el módulo <strong>Empleados</strong> para que continúes la gestión.");
      return;
    }
    if (/asistencia/.test(texto) && /(abrir|ir|mostrar|modulo)/.test(texto)) {
      await navegar("asistencia");
      cargando.remove();
      agregarMensaje("asistente", "Abrí el módulo <strong>Asistencia</strong>.");
      return;
    }
    if (/ayuda|que puedes|comandos|opciones/.test(texto)) {
      cargando.remove();
      responderAyuda();
      return;
    }
    cargando.remove();
    agregarMensaje("asistente", `Todavía no reconozco esa solicitud. Puedo ayudarte con tardanzas, ausencias, marcaciones incompletas, permisos, navegación y reportes.<div class="asistente-acciones"><button class="asistente-accion" data-accion="ayuda">Ver ejemplos</button></div>`);
  } catch (error) {
    console.error("Asistente interno:", error);
    cargando.remove();
    agregarMensaje("asistente", "No pude completar la consulta. Comprueba tu conexión y vuelve a intentarlo.");
  }
}

function mostrarBienvenida() {
  agregarMensaje("asistente", `
    <strong>¿En qué puedo ayudarte?</strong>
    <p>Puedo consultar datos reales de tu empresa y dejar cada pantalla filtrada.</p>
    <ul>
      <li><strong>Asistencia:</strong> tardanzas, ausencias, permisos, presentes, incompletos y personas sin horario.</li>
      <li><strong>Horas:</strong> trabajadas, asignadas, justificadas, de ausencia y horas extra.</li>
      <li><strong>Períodos:</strong> hoy, ayer, semanas, meses, años, nombres de meses y rangos personalizados.</li>
      <li><strong>Reportes:</strong> resumen general, horas trabajadas y asistencia simplificada en Excel o PDF.</li>
      <li><strong>Navegación:</strong> abrir Asistencia o Empleados y mostrar resultados.</li>
    </ul>
    <strong>Acciones más usadas</strong>
    <div class="asistente-acciones">
      <button class="asistente-accion" data-consulta-rapida="¿Quiénes llegaron tarde hoy?">Tardanzas de hoy</button>
      <button class="asistente-accion" data-consulta-rapida="¿Quiénes faltaron ayer?">Ausencias de ayer</button>
      <button class="asistente-accion" data-consulta-rapida="¿Cuántas tardanzas hubo este mes?">Tardanzas del mes</button>
      <button class="asistente-accion" data-consulta-rapida="Asistencia simplificada de todos del mes pasado">Simplificado mes pasado</button>
      <button class="asistente-accion" data-consulta-rapida="¿Qué reportes tienes?">Ver reportes</button>
      <button class="asistente-accion" data-accion="ayuda">Ver todo lo que entiende</button>
    </div>`);
}

function detectarEstado(texto) {
  if (/tard|impuntual|fuera de hora/.test(texto)) return ESTADOS.tardanza;
  if (/ausen|faltaron|falta|no asist/.test(texto)) return ESTADOS.ausencia;
  if (/incomplet|sin salida|no marco salida|no marcaron salida/.test(texto)) return ESTADOS.incompleto;
  if (/con permiso|licencia|vacaciones/.test(texto)) return ESTADOS.permiso;
  if (/sin horario/.test(texto)) return ESTADOS.sinHorario;
  if (/present|asistieron|llegaron hoy/.test(texto)) return ESTADOS.presente;
  return null;
}

function detectarMetrica(texto) {
  if (/horas? extra/.test(texto)) {
    if (/aprobad/.test(texto)) return METRICAS.extraAprobada;
    if (/pendient/.test(texto)) return METRICAS.extraPendiente;
    return METRICAS.extraGenerada;
  }
  if (/horas? trabajad|tiempo trabajado|horas? laborad/.test(texto)) return METRICAS.trabajadas;
  if (/horas? asignad|tiempo asignado/.test(texto)) return METRICAS.asignadas;
  if (/horas? (de )?ausencia|tiempo ausente/.test(texto)) return METRICAS.ausencia;
  if (/horas? justificad|tiempo justificado/.test(texto)) return METRICAS.justificadas;
  return null;
}

function detectarTipoReporte(texto) {
  if (/simplific/.test(texto) && /(individual|un colaborador)/.test(texto) && !/todos|general/.test(texto)) return "SIMPLIFICADO_INDIVIDUAL";
  if (/simplific/.test(texto)) return "SIMPLIFICADO_TODOS";
  if (/horas trabajadas|horas laboradas/.test(texto)) return "HORAS_TRABAJADAS";
  return "RESUMEN";
}

function interpretarPeriodo(texto, predeterminado = "dia") {
  const hoy = inicioDia(new Date());
  const fechas = extraerFechasNumericas(texto);
  if (fechas.length >= 2 || /desde|entre/.test(texto) && fechas.length) {
    const desde = fechas[0];
    const hasta = fechas[1] || hoy;
    return crearPeriodo(desde, hasta, "rango personalizado");
  }
  if (fechas.length === 1) return crearPeriodo(fechas[0], fechas[0], "día indicado", "dia");

  const rangoMesEscrito = texto.match(/(?:del?\s+)?(\d{1,2})\s+(?:al|hasta)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?/);
  if (rangoMesEscrito) {
    const mes = MESES.indexOf(rangoMesEscrito[3]);
    const anio = Number(rangoMesEscrito[4] || hoy.getFullYear());
    return crearPeriodo(new Date(anio, mes, Number(rangoMesEscrito[1])), new Date(anio, mes, Number(rangoMesEscrito[2])), "rango personalizado");
  }

  const diaMesEscrito = texto.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?/);
  if (diaMesEscrito) {
    const mes = MESES.indexOf(diaMesEscrito[2]);
    let anio = Number(diaMesEscrito[3] || hoy.getFullYear());
    if (!diaMesEscrito[3] && mes > hoy.getMonth()) anio -= 1;
    return periodoDia(new Date(anio, mes, Number(diaMesEscrito[1])), "día indicado");
  }

  if (/anteayer/.test(texto)) return periodoDia(sumarDias(hoy, -2), "anteayer");
  if (/\bayer\b/.test(texto)) return periodoDia(sumarDias(hoy, -1), "ayer");
  if (/\bhoy\b/.test(texto)) return periodoDia(hoy, "hoy");

  const ultimosDias = texto.match(/ultim(?:o|os|a|as)\s+(\d{1,3})\s+dias?/);
  if (ultimosDias) return crearPeriodo(sumarDias(hoy, -(Number(ultimosDias[1]) - 1)), hoy, `últimos ${ultimosDias[1]} días`);

  if (/semana (pasada|anterior)/.test(texto)) {
    const inicioEsta = inicioSemana(hoy);
    return crearPeriodo(sumarDias(inicioEsta, -7), sumarDias(inicioEsta, -1), "semana pasada");
  }
  if (/esta semana|semana actual/.test(texto)) return crearPeriodo(inicioSemana(hoy), hoy, "esta semana");

  if (/mes (pasado|anterior)/.test(texto)) {
    const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    return crearPeriodo(anterior, new Date(hoy.getFullYear(), hoy.getMonth(), 0), "mes pasado");
  }
  if (/este mes|mes actual/.test(texto)) return crearPeriodo(new Date(hoy.getFullYear(), hoy.getMonth(), 1), hoy, "mes actual");

  const trimestre = texto.match(/(?:primer|1er|1|segundo|2do|2|tercer|3er|3|cuarto|4to|4)\s+trimestre(?:\s+(?:de|del)\s+(20\d{2}))?/);
  if (trimestre) {
    const palabras = trimestre[0];
    const numero = /primer|1er|^1\s/.test(palabras) ? 1 : /segundo|2do|^2\s/.test(palabras) ? 2 : /tercer|3er|^3\s/.test(palabras) ? 3 : 4;
    const anio = Number(trimestre[1] || hoy.getFullYear());
    const inicio = new Date(anio, (numero - 1) * 3, 1);
    const finNatural = new Date(anio, numero * 3, 0);
    return crearPeriodo(inicio, finNatural > hoy && anio === hoy.getFullYear() ? hoy : finNatural, `${numero}.° trimestre de ${anio}`);
  }

  const mesEncontrado = MESES.findIndex((mes) => new RegExp(`\\b${mes}\\b`).test(texto));
  if (mesEncontrado >= 0) {
    const anioExplicito = texto.match(/\b(20\d{2})\b/);
    let anio = anioExplicito ? Number(anioExplicito[1]) : hoy.getFullYear();
    if (!anioExplicito && mesEncontrado > hoy.getMonth()) anio -= 1;
    const inicio = new Date(anio, mesEncontrado, 1);
    const finNatural = new Date(anio, mesEncontrado + 1, 0);
    const fin = anio === hoy.getFullYear() && mesEncontrado === hoy.getMonth() ? hoy : finNatural;
    return crearPeriodo(inicio, fin, `${MESES[mesEncontrado]} de ${anio}`);
  }

  const anioSolo = texto.match(/(?:ano|año|durante|del)\s+(20\d{2})|\b(20\d{2})\b/);
  if (anioSolo && /ano|año|anual|durante|del 20/.test(texto)) {
    const anio = Number(anioSolo[1] || anioSolo[2]);
    const fin = anio === hoy.getFullYear() ? hoy : new Date(anio, 11, 31);
    return crearPeriodo(new Date(anio, 0, 1), fin, `año ${anio}`);
  }

  if (predeterminado === "mes") return crearPeriodo(new Date(hoy.getFullYear(), hoy.getMonth(), 1), hoy, "mes actual");
  return periodoDia(hoy, "hoy");
}

function extraerFechasNumericas(texto) {
  const encontrados = [];
  const expresion = /\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b|\b([0-3]?\d)[-\/]([01]?\d)[-\/](20\d{2})\b/g;
  for (const coincidencia of texto.matchAll(expresion)) {
    const anio = Number(coincidencia[1] || coincidencia[6]);
    const mes = Number(coincidencia[2] || coincidencia[5]);
    const dia = Number(coincidencia[3] || coincidencia[4]);
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia) encontrados.push(fecha);
  }
  return encontrados;
}

function periodoDia(fecha, etiqueta) { return crearPeriodo(fecha, fecha, etiqueta, "dia"); }
function crearPeriodo(desde, hasta, etiqueta, tipo) {
  const a = inicioDia(desde), b = inicioDia(hasta);
  const primero = a <= b ? a : b, ultimo = a <= b ? b : a;
  const dias = Math.round((ultimo - primero) / 86400000) + 1;
  return { desde: fechaISO(primero), hasta: fechaISO(ultimo), etiqueta, tipo: tipo || (dias === 1 ? "dia" : "periodo"), dias };
}

async function consultarEstadoDiario(estado, fecha) {
  const espera = esperarEvento("asistencia:resumen-renderizado", (detalle) => detalle?.fecha === fecha, 30000);
  await navegar("asistencia");
  const selector = await esperarElemento("#selectorFechaAsistencia");
  const filtro = document.getElementById("filtroEstadoAsistencia");
  const fechaActual = selector.value;
  if (fechaActual !== fecha) {
    selector.value = fecha;
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    if (filtro) {
      filtro.value = estado.valor;
      filtro.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  let detalle = await espera;
  if (filtro && filtro.value !== estado.valor) {
    const esperaFiltro = esperarEvento("asistencia:resumen-renderizado", (d) => d?.fecha === fecha, 10000);
    filtro.value = estado.valor;
    filtro.dispatchEvent(new Event("change", { bubbles: true }));
    detalle = await esperaFiltro;
  }
  return { fecha, registros: detalle.filtrados || [] };
}

function responderEstado(estado, resultado) {
  const lista = resultado.registros;
  const fechaVisible = formatearFecha(resultado.fecha);
  if (!lista.length) {
    agregarMensaje("asistente", `No encontré <strong>${estado.etiqueta}</strong> para el ${fechaVisible}. Dejé abierto el resumen diario con el filtro aplicado.`);
    return;
  }
  const items = lista.slice(0, 12).map((r) => {
    const tardanza = estado.valor === "TARDANZA" && r.tardanzaMinutos ? ` — ${r.tardanzaMinutos} min` : "";
    return `<li><strong>${escapar(r.nombre)}</strong>${tardanza}</li>`;
  }).join("");
  const resto = lista.length > 12 ? `<p>Y ${lista.length - 12} colaborador(es) más. La lista completa está filtrada en pantalla.</p>` : "";
  agregarMensaje("asistente", `Encontré <strong>${lista.length}</strong> ${estado.etiqueta} para el ${fechaVisible}:<ul>${items}</ul>${resto}<div class="asistente-acciones"><button class="asistente-accion" data-accion="cerrar-chat">Ver resumen filtrado</button></div>`);
}

async function consultarEstadoPeriodo(estado, periodo) {
  await navegar("asistencia");
  await esperarElemento('.asistencia-tab[data-tab="mensual"]');
  document.querySelector('.asistencia-tab[data-tab="mensual"]')?.click();
  const desde = document.getElementById("fechaDesdeResumenMensual");
  const hasta = document.getElementById("fechaHastaResumenMensual");
  desde.value = periodo.desde;
  hasta.value = periodo.hasta;
  const espera = esperarEvento("asistencia:reporte-periodo-cargado", (d) => d?.desde === periodo.desde && d?.hasta === periodo.hasta, 70000);
  document.getElementById("btnAplicarRangoResumenMensual")?.click();
  const detalle = await espera;
  const resultados = (detalle.registros || []).map((registro) => {
    let cantidad = Number(registro[estado.clave] || 0);
    if (estado.clave === "incompletos") cantidad = (registro.detalles || []).filter((d) => /INCOMPLETO|FERIADO_PENDIENTE/.test(String(d.estado || ""))).length;
    if (estado.clave === "sinHorario") cantidad = (registro.detalles || []).filter((d) => d.estado === "SIN_HORARIO").length;
    return { nombre: registro.nombre, documento: registro.documento, cantidad };
  }).filter((registro) => registro.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));
  return { periodo, registros: resultados, total: resultados.reduce((suma, r) => suma + r.cantidad, 0) };
}

function responderEstadoPeriodo(estado, resultado) {
  const { periodo, registros, total } = resultado;
  const rango = periodo.desde === periodo.hasta ? formatearFecha(periodo.desde) : `${formatearFecha(periodo.desde)} al ${formatearFecha(periodo.hasta)}`;
  if (!registros.length) {
    agregarMensaje("asistente", `No encontré <strong>${estado.etiqueta}</strong> en <strong>${periodo.etiqueta}</strong> (${rango}). Dejé abierto el resumen mensual con ese período.`);
    return;
  }
  const items = registros.slice(0, 15).map((r) => `<li><strong>${escapar(r.nombre)}</strong> — ${r.cantidad}</li>`).join("");
  const resto = registros.length > 15 ? `<p>Y ${registros.length - 15} colaborador(es) más.</p>` : "";
  agregarMensaje("asistente", `En <strong>${periodo.etiqueta}</strong> (${rango}) encontré <strong>${total} ${estado.etiqueta}</strong> correspondientes a <strong>${registros.length} colaborador(es)</strong>:<ul>${items}</ul>${resto}<div class="asistente-acciones"><button class="asistente-accion" data-accion="cerrar-chat">Ver resumen mensual</button></div>`);
}

async function consultarMetricaPeriodo(metrica, periodo) {
  await navegar("asistencia");
  await esperarElemento('.asistencia-tab[data-tab="mensual"]');
  document.querySelector('.asistencia-tab[data-tab="mensual"]')?.click();
  document.getElementById("fechaDesdeResumenMensual").value = periodo.desde;
  document.getElementById("fechaHastaResumenMensual").value = periodo.hasta;
  const espera = esperarEvento("asistencia:reporte-periodo-cargado", (d) => d?.desde === periodo.desde && d?.hasta === periodo.hasta, 70000);
  document.getElementById("btnAplicarRangoResumenMensual")?.click();
  const detalle = await espera;
  const registros = (detalle.registros || []).map((r) => ({ nombre: r.nombre, minutos: Number(r[metrica.campo] || 0) }))
    .filter((r) => r.minutos > 0).sort((a, b) => b.minutos - a.minutos || a.nombre.localeCompare(b.nombre, "es"));
  return { periodo, registros, minutos: registros.reduce((suma, r) => suma + r.minutos, 0) };
}

function responderMetricaPeriodo(metrica, resultado) {
  const { periodo, registros, minutos } = resultado;
  const rango = periodo.desde === periodo.hasta ? formatearFecha(periodo.desde) : `${formatearFecha(periodo.desde)} al ${formatearFecha(periodo.hasta)}`;
  if (!registros.length) {
    agregarMensaje("asistente", `No encontré <strong>${metrica.etiqueta}</strong> en <strong>${periodo.etiqueta}</strong> (${rango}).`);
    return;
  }
  const items = registros.slice(0, 12).map((r) => `<li><strong>${escapar(r.nombre)}</strong> — ${duracion(r.minutos)}</li>`).join("");
  const resto = registros.length > 12 ? `<p>Y ${registros.length - 12} colaborador(es) más.</p>` : "";
  agregarMensaje("asistente", `En <strong>${periodo.etiqueta}</strong> se acumularon <strong>${duracion(minutos)}</strong> de ${metrica.etiqueta} entre <strong>${registros.length} colaborador(es)</strong>:<ul>${items}</ul>${resto}<div class="asistente-acciones"><button class="asistente-accion" data-accion="cerrar-chat">Ver resumen mensual</button></div>`);
}

function responderReportes() {
  agregarMensaje("asistente", `El sistema dispone de:<ul><li><strong>Resumen general:</strong> totales por colaborador, días, tardanzas, ausencias, permisos y horas.</li><li><strong>Horas trabajadas:</strong> detalle diario de horario, marcaciones, jornada, ausencia y horas extra.</li><li><strong>Asistencia simplificada individual:</strong> planilla completa de un colaborador.</li><li><strong>Asistencia simplificada de todos:</strong> una planilla organizada por colaborador.</li></ul><div class="asistente-acciones"><button class="asistente-accion" data-accion="reporte" data-tipo="RESUMEN">Preparar resumen</button><button class="asistente-accion" data-accion="reporte" data-tipo="HORAS_TRABAJADAS">Horas trabajadas</button><button class="asistente-accion" data-accion="reporte" data-tipo="SIMPLIFICADO_TODOS">Simplificado de todos</button></div>`);
}

async function prepararReporte(tipo, periodo = interpretarPeriodo("", "mes"), texto = "") {
  await navegar("asistencia");
  await esperarElemento('.asistencia-tab[data-tab="mensual"]');
  document.querySelector('.asistencia-tab[data-tab="mensual"]')?.click();
  const desde = document.getElementById("fechaDesdeResumenMensual");
  const hasta = document.getElementById("fechaHastaResumenMensual");
  desde.value = periodo.desde;
  hasta.value = periodo.hasta;
  const esperaReporte = esperarEvento("asistencia:reporte-periodo-cargado", (d) => d?.desde === periodo.desde && d?.hasta === periodo.hasta, 70000);
  document.getElementById("btnAplicarRangoResumenMensual")?.click();
  await esperaReporte;
  await esperarHabilitado("#btnAbrirDescargaResumenMensual", 60000);
  document.getElementById("btnAbrirDescargaResumenMensual")?.click();
  const selector = await esperarElemento("#tipoDescargaReporteAsistencia");
  selector.value = tipo;
  selector.dispatchEvent(new Event("change", { bubbles: true }));
  if (tipo === "SIMPLIFICADO_INDIVIDUAL") {
    const colaboradores = document.getElementById("colaboradorDescargaReporteAsistencia");
    const opcion = [...(colaboradores?.options || [])].find((item) => texto.includes(normalizar(item.textContent)));
    if (opcion) colaboradores.value = opcion.value;
  }
  document.getElementById("btnGenerarDescargaReporteAsistencia")?.click();
  await esperarElemento("#btnDescargarExcelVistaPrevia");
}

function responderReportePreparado(tipo, periodo) {
  const nombres = { RESUMEN: "resumen general", HORAS_TRABAJADAS: "reporte de horas trabajadas", SIMPLIFICADO_INDIVIDUAL: "reporte simplificado individual", SIMPLIFICADO_TODOS: "reporte simplificado de todos" };
  const rango = periodo.desde === periodo.hasta ? formatearFecha(periodo.desde) : `${formatearFecha(periodo.desde)} al ${formatearFecha(periodo.hasta)}`;
  agregarMensaje("asistente", `Preparé el <strong>${nombres[tipo]}</strong> de <strong>${periodo.etiqueta}</strong> (${rango}). Puedes revisarlo o descargarlo ahora.<div class="asistente-acciones"><button class="asistente-accion" data-accion="descargar-excel">Descargar Excel</button><button class="asistente-accion" data-accion="descargar-pdf">Descargar PDF</button><button class="asistente-accion" data-accion="cerrar-chat">Ver vista previa</button></div>`);
}

function responderAyuda() {
  agregarMensaje("asistente", `Puedes consultar:<ul><li>Tardanzas de hoy, ayer, esta semana, el mes pasado, agosto o todo un año.</li><li>Ausencias, permisos, asistencias, incompletos y personas sin horario en cualquier período.</li><li>Rangos como “desde 01/07/2026 hasta 31/07/2026” o “últimos 30 días”.</li><li>Reportes general, de horas trabajadas y simplificado, en Excel o PDF.</li><li>Navegación hacia Asistencia y Empleados.</li></ul><strong>Ejemplos:</strong><ul><li>¿Cuántas tardanzas hubo en agosto?</li><li>¿Quiénes faltaron el mes pasado?</li><li>Descarga el simplificado de julio de 2026.</li><li>Reporte de horas trabajadas de la semana pasada.</li></ul>`);
}

async function manejarAccion(evento) {
  const consultaRapida = evento.target.closest("[data-consulta-rapida]");
  if (consultaRapida) {
    procesarConsulta(consultaRapida.dataset.consultaRapida);
    return;
  }
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;
  const accion = boton.dataset.accion;
  if (accion === "cerrar-chat") cerrarPanel();
  if (accion === "ayuda") responderAyuda();
  if (accion === "descargar-excel") document.getElementById("btnDescargarExcelVistaPrevia")?.click();
  if (accion === "descargar-pdf") document.getElementById("btnDescargarPdfVistaPrevia")?.click();
  if (accion === "reporte") {
    const cargando = agregarCargando();
    const periodo = interpretarPeriodo("", "mes");
    try { await prepararReporte(boton.dataset.tipo, periodo); cargando.remove(); responderReportePreparado(boton.dataset.tipo, periodo); }
    catch (error) { cargando.remove(); agregarMensaje("asistente", "No pude preparar el reporte. Inténtalo nuevamente."); }
  }
}

async function navegar(vista) {
  const boton = document.querySelector(`.item[data-vista="${vista}"]`);
  if (!boton) throw new Error(`Vista no disponible: ${vista}`);
  const yaCargada = vista === "asistencia" ? document.querySelector(".asistencia") : document.querySelector(`.${vista}`);
  if (!yaCargada) boton.click();
  await esperarElemento(vista === "asistencia" ? ".asistencia" : "#contenedorVista > *");
}

function esperarEvento(nombre, validar = () => true, tiempo = 20000) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => { document.removeEventListener(nombre, escuchar); reject(new Error(`Tiempo agotado: ${nombre}`)); }, tiempo);
    function escuchar(evento) {
      if (!validar(evento.detail)) return;
      clearTimeout(temporizador);
      document.removeEventListener(nombre, escuchar);
      resolve(evento.detail || {});
    }
    document.addEventListener(nombre, escuchar);
  });
}

function esperarElemento(selector, tiempo = 20000) {
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(selector);
    if (existente) return resolve(existente);
    const observador = new MutationObserver(() => {
      const elemento = document.querySelector(selector);
      if (elemento) { observador.disconnect(); clearTimeout(temporizador); resolve(elemento); }
    });
    observador.observe(document.body, { childList: true, subtree: true });
    const temporizador = setTimeout(() => { observador.disconnect(); reject(new Error(`No apareció ${selector}`)); }, tiempo);
  });
}

function esperarHabilitado(selector, tiempo = 30000) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const revisar = () => {
      const elemento = document.querySelector(selector);
      if (elemento && !elemento.disabled) return resolve(elemento);
      if (Date.now() - inicio >= tiempo) return reject(new Error(`No se habilitó ${selector}`));
      setTimeout(revisar, 180);
    };
    revisar();
  });
}

function agregarMensaje(tipo, contenido) {
  const elemento = document.createElement("div");
  elemento.className = `asistente-mensaje ${tipo}`;
  elemento.innerHTML = `<div class="asistente-burbuja">${contenido}</div>`;
  mensajes.appendChild(elemento);
  mensajes.scrollTop = mensajes.scrollHeight;
  return elemento;
}

function agregarCargando() {
  return agregarMensaje("asistente", '<span class="asistente-escribiendo"><span></span><span></span><span></span></span>');
}

function normalizar(valor) {
  return String(valor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9/\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function fechaISO(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function inicioDia(fecha) { return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()); }
function sumarDias(fecha, dias) { const resultado = inicioDia(fecha); resultado.setDate(resultado.getDate() + dias); return resultado; }
function inicioSemana(fecha) { const resultado = inicioDia(fecha); resultado.setDate(resultado.getDate() - ((resultado.getDay() + 6) % 7)); return resultado; }
function duracion(minutos) { const total = Math.max(0, Math.round(Number(minutos) || 0)); const horas = Math.floor(total / 60), resto = total % 60; return resto ? `${horas} h ${resto} min` : `${horas} h`; }

function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(anio, mes - 1, dia));
}

function escapar(valor) {
  const elemento = document.createElement("div");
  elemento.textContent = String(valor ?? "");
  return elemento.innerHTML;
}

