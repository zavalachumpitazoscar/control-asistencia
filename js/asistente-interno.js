const ESTADOS = {
  tardanza: { valor: "TARDANZA", etiqueta: "tardanzas" },
  ausencia: { valor: "AUSENTE", etiqueta: "ausencias" },
  incompleto: { valor: "INCOMPLETO", etiqueta: "marcaciones incompletas" },
  presente: { valor: "PRESENTE", etiqueta: "asistencias presentes" },
  permiso: { valor: "CON_PERMISO", etiqueta: "colaboradores con permiso" },
  sinHorario: { valor: "SIN_HORARIO", etiqueta: "colaboradores sin horario" },
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
  agregarMensaje("asistente", "Hola. Puedo consultar la asistencia, abrir módulos filtrados y preparar reportes. ¿Qué necesitas?");
}

function plantilla() {
  return `
    <button type="button" class="asistente-boton" id="btnAsistenteInterno" aria-label="Abrir asistente virtual" title="Asistente virtual">
      <i class="bi bi-stars"></i><span class="asistente-punto"></span>
    </button>
    <section class="asistente-panel" id="asistenteInterno" aria-label="Asistente virtual" aria-hidden="true">
      <header class="asistente-cabecera">
        <div class="asistente-avatar"><i class="bi bi-stars"></i></div>
        <div class="asistente-cabecera-texto"><h2>Asistente de asistencia</h2><p>Consultas y acciones del sistema</p></div>
        <button type="button" class="asistente-cerrar" id="btnCerrarAsistente" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button>
      </header>
      <div class="asistente-mensajes" id="asistenteMensajes" aria-live="polite"></div>
      <div class="asistente-sugerencias">
        <button type="button" class="asistente-sugerencia" data-consulta="¿Quiénes llegaron tarde hoy?">Tardanzas de hoy</button>
        <button type="button" class="asistente-sugerencia" data-consulta="¿Qué reportes tienes?">Ver reportes</button>
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
    if (estado) {
      const fecha = detectarFecha(texto);
      const resultado = await consultarEstadoDiario(estado, fecha);
      cargando.remove();
      responderEstado(estado, resultado);
      return;
    }
    if (/(que|cuales|lista|mostrar|explica).*(reporte)|reporte.*(tienes|disponible)/.test(texto)) {
      cargando.remove();
      responderReportes();
      return;
    }
    if (/reporte/.test(texto) && /(simplific|resumen|horas trabajadas|descarg|excel|pdf)/.test(texto)) {
      const tipo = /simplific/.test(texto) ? "SIMPLIFICADO_TODOS" : /horas trabajadas/.test(texto) ? "HORAS_TRABAJADAS" : "RESUMEN";
      await prepararReporte(tipo, texto);
      cargando.remove();
      responderReportePreparado(tipo);
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

function detectarEstado(texto) {
  if (/tard|impuntual|fuera de hora/.test(texto)) return ESTADOS.tardanza;
  if (/ausen|faltaron|falta|no asist/.test(texto)) return ESTADOS.ausencia;
  if (/incomplet|sin salida|no marco salida|no marcaron salida/.test(texto)) return ESTADOS.incompleto;
  if (/con permiso|licencia|vacaciones/.test(texto)) return ESTADOS.permiso;
  if (/sin horario/.test(texto)) return ESTADOS.sinHorario;
  if (/present|asistieron|llegaron hoy/.test(texto)) return ESTADOS.presente;
  return null;
}

function detectarFecha(texto) {
  const hoy = new Date();
  if (/anteayer/.test(texto)) hoy.setDate(hoy.getDate() - 2);
  else if (/ayer/.test(texto) && !/anteayer/.test(texto)) hoy.setDate(hoy.getDate() - 1);
  const iso = texto.match(/\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
  const pe = texto.match(/\b([0-3]?\d)[-\/]([01]?\d)[-\/](20\d{2})\b/);
  if (pe) return `${pe[3]}-${String(pe[2]).padStart(2, "0")}-${String(pe[1]).padStart(2, "0")}`;
  return fechaISO(hoy);
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

function responderReportes() {
  agregarMensaje("asistente", `El sistema dispone de:<ul><li><strong>Resumen general:</strong> totales por colaborador, días, tardanzas, ausencias, permisos y horas.</li><li><strong>Horas trabajadas:</strong> detalle diario de horario, marcaciones, jornada, ausencia y horas extra.</li><li><strong>Asistencia simplificada individual:</strong> planilla completa de un colaborador.</li><li><strong>Asistencia simplificada de todos:</strong> una planilla organizada por colaborador.</li></ul><div class="asistente-acciones"><button class="asistente-accion" data-accion="reporte" data-tipo="RESUMEN">Preparar resumen</button><button class="asistente-accion" data-accion="reporte" data-tipo="HORAS_TRABAJADAS">Horas trabajadas</button><button class="asistente-accion" data-accion="reporte" data-tipo="SIMPLIFICADO_TODOS">Simplificado de todos</button></div>`);
}

async function prepararReporte(tipo, texto = "") {
  await navegar("asistencia");
  await esperarElemento('.asistencia-tab[data-tab="mensual"]');
  document.querySelector('.asistencia-tab[data-tab="mensual"]')?.click();
  const desde = document.getElementById("fechaDesdeResumenMensual");
  const hasta = document.getElementById("fechaHastaResumenMensual");
  const hoy = new Date();
  if (/mes anterior/.test(texto)) {
    desde.value = fechaISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
    hasta.value = fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
  } else {
    desde.value = fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    hasta.value = fechaISO(hoy);
  }
  document.getElementById("btnAplicarRangoResumenMensual")?.click();
  await esperarHabilitado("#btnAbrirDescargaResumenMensual", 60000);
  document.getElementById("btnAbrirDescargaResumenMensual")?.click();
  const selector = await esperarElemento("#tipoDescargaReporteAsistencia");
  selector.value = tipo;
  selector.dispatchEvent(new Event("change", { bubbles: true }));
  document.getElementById("btnGenerarDescargaReporteAsistencia")?.click();
  await esperarElemento("#btnDescargarExcelVistaPrevia");
}

function responderReportePreparado(tipo) {
  const nombres = { RESUMEN: "resumen general", HORAS_TRABAJADAS: "reporte de horas trabajadas", SIMPLIFICADO_TODOS: "reporte simplificado de todos" };
  agregarMensaje("asistente", `Preparé el <strong>${nombres[tipo]}</strong> del mes actual. Puedes revisarlo en pantalla o descargarlo ahora.<div class="asistente-acciones"><button class="asistente-accion" data-accion="descargar-excel">Descargar Excel</button><button class="asistente-accion" data-accion="descargar-pdf">Descargar PDF</button><button class="asistente-accion" data-accion="cerrar-chat">Ver vista previa</button></div>`);
}

function responderAyuda() {
  agregarMensaje("asistente", `Prueba consultas como:<ul><li>¿Quiénes llegaron tarde hoy?</li><li>¿Quiénes faltaron ayer?</li><li>Muéstrame las marcaciones incompletas.</li><li>¿Qué reportes tienes?</li><li>Prepara el reporte simplificado de todos.</li><li>Abre el módulo Empleados.</li></ul>`);
}

async function manejarAccion(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;
  const accion = boton.dataset.accion;
  if (accion === "cerrar-chat") cerrarPanel();
  if (accion === "ayuda") responderAyuda();
  if (accion === "descargar-excel") document.getElementById("btnDescargarExcelVistaPrevia")?.click();
  if (accion === "descargar-pdf") document.getElementById("btnDescargarPdfVistaPrevia")?.click();
  if (accion === "reporte") {
    const cargando = agregarCargando();
    try { await prepararReporte(boton.dataset.tipo); cargando.remove(); responderReportePreparado(boton.dataset.tipo); }
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

function formatearFecha(iso) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(anio, mes - 1, dia));
}

function escapar(valor) {
  const elemento = document.createElement("div");
  elemento.textContent = String(valor ?? "");
  return elemento.innerHTML;
}
