import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  doc,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const COLECCIONES_AUDITADAS = [
  "empresas", "usuarios", "sucursales", "areas", "subareas", "colaboradores", "horarios",
  "asignacionesHorarios", "excepcionesHorarios", "permisos", "feriados",
  "descansosSustitutorios", "marcaciones", "ajustesAsistenciaDiaria",
  "aprobacionesHorasExtra", "cierresAsistencia",
];
const nombresModulo = {
  empresas: "Compañía", usuarios: "Usuarios y perfiles", sucursales: "Sucursales", areas: "Áreas", subareas: "Subáreas",
  colaboradores: "Colaboradores", horarios: "Horarios", asignacionesHorarios: "Asignación de horarios",
  excepcionesHorarios: "Programación diaria", permisos: "Permisos", feriados: "Feriados",
  descansosSustitutorios: "Descansos sustitutorios", marcaciones: "Marcaciones",
  ajustesAsistenciaDiaria: "Ajustes de asistencia", aprobacionesHorasExtra: "Horas extra",
  cierresAsistencia: "Cierres de asistencia",
};

let detenerMonitores = [];
let monitorEmpresa = "";
let registros = [];
let pagina = 1;
let limite = 10;

export async function iniciarMonitorAuditoriaGlobal(usuario) {
  const empresaId = sessionStorage.getItem("empresaId");
  if (!usuario || !empresaId || monitorEmpresa === empresaId) return;
  detenerMonitores.forEach((fn) => fn());
  detenerMonitores = [];
  monitorEmpresa = empresaId;
  const perfil = await obtenerPerfil(usuario.uid);
  const responsable = {
    uid: usuario.uid,
    nombre: perfil?.nombre || perfil?.nombreCompleto || usuario.displayName || usuario.email || "Usuario",
    correo: usuario.email || perfil?.correo || "",
    rol: perfil?.rol || perfil?.tipoUsuario || "Usuario",
  };
  COLECCIONES_AUDITADAS.forEach((nombreColeccion) => observarColeccion(nombreColeccion, empresaId, responsable));
}

async function obtenerPerfil(uid) {
  try { const snap = await getDoc(doc(db, "usuarios", uid)); return snap.exists() ? snap.data() : null; }
  catch { return null; }
}

function observarColeccion(nombreColeccion, empresaId, responsable) {
  const cache = new Map();
  const procesados = new Set();
  let inicializado = false;
  const consulta = query(collection(db, nombreColeccion), where("empresaId", "==", empresaId));
  const detener = onSnapshot(consulta, { includeMetadataChanges: true }, (snap) => {
    if (!inicializado) {
      snap.docs.forEach((d) => cache.set(d.id, limpiar(d.data())));
      inicializado = true;
      return;
    }
    snap.docChanges().forEach((cambio) => {
      const pendienteLocal = cambio.doc.metadata.hasPendingWrites === true;
      const despues = cambio.type === "removed" ? null : limpiar(cambio.doc.data());
      const antes = cache.get(cambio.doc.id) || null;
      if (cambio.type === "removed") cache.delete(cambio.doc.id); else cache.set(cambio.doc.id, despues);
      if (!pendienteLocal) return;
      const clave = `${nombreColeccion}:${cambio.doc.id}:${cambio.type}`;
      if (procesados.has(clave)) return;
      procesados.add(clave);
      setTimeout(() => procesados.delete(clave), 2500);
      registrarCambio({ empresaId, nombreColeccion, documentoId: cambio.doc.id, tipo: cambio.type, antes, despues, responsable }).catch((error) => console.error("No se pudo registrar auditoría:", error));
    });
  }, (error) => console.warn(`Auditoría no pudo observar ${nombreColeccion}:`, error));
  detenerMonitores.push(detener);
}

async function registrarCambio({ empresaId, nombreColeccion, documentoId, tipo, antes, despues, responsable }) {
  const datos = despues || antes || {};
  const accion = tipo === "added" ? "CREAR" : tipo === "removed" ? "ELIMINAR" : "MODIFICAR";
  const cambios = accion === "MODIFICAR" ? diferencias(antes, despues) : null;
  await addDoc(collection(db, "auditoriaSistema"), {
    empresaId,
    modulo: nombresModulo[nombreColeccion] || nombreColeccion,
    coleccion: nombreColeccion,
    documentoId,
    accion,
    responsableId: responsable.uid,
    responsableNombre: responsable.nombre,
    responsableCorreo: responsable.correo,
    responsableRol: responsable.rol,
    afectadoId: datos.colaboradorId || datos.usuarioId || datos.empleadoId || documentoId,
    afectadoNombre: obtenerNombreEntidad(nombreColeccion, datos),
    afectadoDocumento: obtenerDocumentoEntidad(datos),
    motivo: datos.motivo || datos.observacion || datos.descripcionMotivo || null,
    resumen: resumenCambio(accion, nombreColeccion, datos, cambios),
    antes: limitar(antes),
    despues: limitar(despues),
    cambios: limitar(cambios),
    fecha: serverTimestamp(),
    origen: "MONITOR_CLIENTE",
  });
}

function diferencias(antes = {}, despues = {}) {
  const resultado = {};
  compararObjetos(antes || {}, despues || {}, "", resultado);
  return resultado;
}

function compararObjetos(antes, despues, ruta, resultado) {
  const claves = new Set([...Object.keys(esObjeto(antes) ? antes : {}), ...Object.keys(esObjeto(despues) ? despues : {})]);
  claves.forEach((campo) => {
    const camino = ruta ? `${ruta}.${campo}` : campo;
    if (campoTecnico(camino)) return;
    const anterior = antes?.[campo] ?? null;
    const nuevo = despues?.[campo] ?? null;
    if (esObjeto(anterior) || esObjeto(nuevo)) compararObjetos(esObjeto(anterior) ? anterior : {}, esObjeto(nuevo) ? nuevo : {}, camino, resultado);
    else if (JSON.stringify(anterior) !== JSON.stringify(nuevo)) resultado[camino] = { anterior, nuevo };
  });
}
function esObjeto(valor) { return valor && typeof valor === "object" && !Array.isArray(valor); }

function resumenCambio(accion, coleccion, datos, cambios) {
  const destino = obtenerNombreEntidad(coleccion, datos);
  const detalle = descripcionEspecifica(coleccion, datos);
  const campos = cambios ? Object.keys(cambios).filter((c) => !campoTecnico(c)).map(nombreCampo) : [];
  if (accion === "CREAR") return `Se creó ${destino}${detalle ? ` · ${detalle}` : ""}`;
  if (accion === "ELIMINAR") return `Se eliminó ${destino}${detalle ? ` · ${detalle}` : ""}`;
  return `Se modificó ${destino}${campos.length ? ` · Cambios: ${campos.join(", ")}` : ""}`;
}

function obtenerNombreEntidad(coleccion, datos = {}) {
  const nombres = datos.datosPersonales;
  const persona = [nombres?.nombres, nombres?.apellidos].filter(Boolean).join(" ").trim();
  if (persona) return persona;
  if (datos.colaboradorNombre) return datos.colaboradorNombre;
  if (datos.nombreCompleto) return datos.nombreCompleto;
  if (datos.razonSocial) return datos.razonSocial;
  if (typeof datos.nombre === "string" && datos.nombre.trim()) return datos.nombre.trim();
  if (datos.tipoPermisoNombre && datos.colaboradorNombre) return `${datos.tipoPermisoNombre} de ${datos.colaboradorNombre}`;
  const etiquetas = { colaboradores:"Colaborador",horarios:"Horario",asignacionesHorarios:"Asignación de horario",excepcionesHorarios:"Programación diaria",permisos:"Permiso",feriados:"Feriado",marcaciones:"Marcación",areas:"Área",subareas:"Subárea",sucursales:"Sucursal",empresas:"Empresa",usuarios:"Usuario",aprobacionesHorasExtra:"Horas extra",cierresAsistencia:"Cierre de asistencia" };
  return etiquetas[coleccion] || "Registro del sistema";
}
function obtenerDocumentoEntidad(datos = {}) { return datos.colaboradorDocumento || datos.documento?.numero || (typeof datos.documento === "string" ? datos.documento : null) || datos.dni || datos.numeroDocumento || null; }
function descripcionEspecifica(coleccion, datos = {}) {
  if (coleccion === "colaboradores") return [obtenerDocumentoEntidad(datos) && `Documento ${obtenerDocumentoEntidad(datos)}`, datos.organizacion?.sucursal && `Sucursal ${datos.organizacion.sucursal}`, datos.organizacion?.area && `Área ${datos.organizacion.area}`, datos.informacionAdicional?.cargoProfesion && `Cargo ${datos.informacionAdicional.cargoProfesion}`].filter(Boolean).join(" · ");
  if (coleccion === "asignacionesHorarios") return [datos.horarioNombre && `Horario ${datos.horarioNombre}`, nombresAsignados(datos), datos.cantidadColaboradores && `${datos.cantidadColaboradores} colaborador(es)`, datos.fechaInicio && `desde ${fechaCorta(datos.fechaInicio)}`, datos.fechaFin && `hasta ${fechaCorta(datos.fechaFin)}`, datos.fechaInicio && datos.fechaFin && `${diasEntre(datos.fechaInicio,datos.fechaFin)} día(s) calendario`, diasAsignacion(datos), horasProgramadas(datos)].filter(Boolean).join(" · ");
  if (coleccion === "permisos") return [datos.tipoPermisoNombre, datos.colaboradorNombre, datos.fechaInicio && `desde ${fechaCorta(datos.fechaInicio)}`, datos.fechaFin && `hasta ${fechaCorta(datos.fechaFin)}`, datos.horaInicio && `${datos.horaInicio} a ${datos.horaFin || "—"}`].filter(Boolean).join(" · ");
  if (coleccion === "marcaciones") return [datos.colaboradorNombre, datos.fecha && fechaCorta(datos.fecha), datos.hora, datos.tipo && etiqueta(datos.tipo)].filter(Boolean).join(" · ");
  if (coleccion === "feriados") return [datos.fechaInicio && `desde ${fechaCorta(datos.fechaInicio)}`, datos.fechaFin && `hasta ${fechaCorta(datos.fechaFin)}`, datos.tipo && etiqueta(datos.tipo)].filter(Boolean).join(" · ");
  if (coleccion === "aprobacionesHorasExtra") return [datos.colaboradorNombre, datos.fecha && fechaCorta(datos.fecha), datos.minutosAprobados != null && `${duracionMinutos(datos.minutosAprobados)} aprobados`, datos.decision && etiqueta(datos.decision)].filter(Boolean).join(" · ");
  return "";
}
function diasAsignacion(datos){const dias=datos.diasSemana||datos.dias||datos.diasSeleccionados;return Array.isArray(dias)&&dias.length?`Días: ${dias.map(etiqueta).join(", ")}`:"";}
function nombresAsignados(datos){const lista=datos.colaboradoresAsignados;return Array.isArray(lista)&&lista.length?`Asignado a: ${lista.map((c)=>`${c.nombre}${c.documento?` (${c.documento})`:""}`).join(", ")}`:"";}
function diasEntre(desde,hasta){const a=new Date(`${String(desde).slice(0,10)}T00:00:00`),b=new Date(`${String(hasta).slice(0,10)}T00:00:00`);return Number.isNaN(a.getTime())||Number.isNaN(b.getTime())?"—":Math.max(1,Math.round((b-a)/86400000)+1);}
function horasProgramadas(datos){const entrada=datos.horaEntrada||datos.entrada?.programada,salida=datos.horaSalida||datos.salida?.programada;return entrada&&salida?`Horario: ${entrada} a ${salida}`:"";}
function fechaCorta(v){if(!v)return "";const s=String(v).slice(0,10),p=s.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:s;}
function duracionMinutos(v){const n=Math.max(0,Number(v)||0);return `${Math.floor(n/60)} h${n%60?` ${n%60} min`:""}`;}

function limpiar(valor) {
  if (valor == null) return valor;
  if (typeof valor?.toDate === "function") return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiar(v)]));
  return valor;
}
function limitar(valor) { const texto = JSON.stringify(valor); return texto?.length > 12000 ? { resumen: "Contenido extenso", caracteres: texto.length } : valor; }

export function iniciarAuditoria() {
  const ids = ["actualizarAuditoria", "buscarAuditoria", "filtroModuloAuditoria", "filtroAccionAuditoria", "fechaDesdeAuditoria", "fechaHastaAuditoria", "limpiarFiltrosAuditoria", "limiteAuditoria", "anteriorAuditoria", "siguienteAuditoria", "cuerpoAuditoria"];
  if (ids.some((id) => !document.getElementById(id))) return;
  document.getElementById("actualizarAuditoria").addEventListener("click", cargarAuditoria);
  ["buscarAuditoria", "filtroModuloAuditoria", "filtroAccionAuditoria", "fechaDesdeAuditoria", "fechaHastaAuditoria"].forEach((id) => document.getElementById(id).addEventListener(id === "buscarAuditoria" ? "input" : "change", () => { pagina = 1; renderizarAuditoria(); }));
  document.getElementById("limiteAuditoria").addEventListener("change", (e) => { limite = Number(e.target.value) || 10; pagina = 1; renderizarAuditoria(); });
  document.getElementById("anteriorAuditoria").addEventListener("click", () => { pagina--; renderizarAuditoria(); });
  document.getElementById("siguienteAuditoria").addEventListener("click", () => { pagina++; renderizarAuditoria(); });
  document.getElementById("limpiarFiltrosAuditoria").addEventListener("click", limpiarFiltros);
  document.getElementById("cuerpoAuditoria").addEventListener("click", mostrarDetalle);
  document.getElementById("cerrarDetalleAuditoria").addEventListener("click", cerrarDetalle);
  document.getElementById("modalDetalleAuditoria").addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarDetalle(); });
  cargarAuditoria();
}

async function cargarAuditoria() {
  const empresaId = sessionStorage.getItem("empresaId");
  const cuerpo = document.getElementById("cuerpoAuditoria");
  cuerpo.innerHTML = '<tr><td colspan="8" class="auditoria-vacio">Cargando historial global...</td></tr>';
  try {
    const [global, asistencia] = await Promise.all([
      getDocs(query(collection(db, "auditoriaSistema"), where("empresaId", "==", empresaId))),
      getDocs(query(collection(db, "historialOperacionesAsistencia"), where("empresaId", "==", empresaId))),
    ]);
    registros = [
      ...global.docs.map((d) => normalizarGlobal(d.id, d.data())),
      ...asistencia.docs.map((d) => normalizarAsistencia(d.id, d.data())),
    ].sort((a, b) => fechaMs(b.fecha) - fechaMs(a.fecha));
    completarModulos();
    actualizarResumen();
    renderizarAuditoria();
  } catch (error) {
    console.error("Error cargando auditoría:", error);
    cuerpo.innerHTML = `<tr><td colspan="8" class="auditoria-vacio">No se pudo cargar la auditoría: ${html(error.message)}</td></tr>`;
  }
}

function normalizarGlobal(id, r) {
  const datos = r.despues || r.antes || {};
  const coleccion = r.coleccion || "";
  const nombre = obtenerNombreEntidad(coleccion, datos);
  const documento = obtenerDocumentoEntidad(datos);
  const accion = accionEspecifica(r.accion, r.cambios, datos);
  return {
    id, ...r, accion,
    categoriaAccion: categoriaAccion(accion),
    afectadoNombre: nombre,
    afectadoDocumento: documento || r.afectadoDocumento || "",
    resumen: resumenRegistroExistente(r, coleccion, datos, nombre, accion),
  };
}
function normalizarAsistencia(id, r) { return { id: `asistencia_${id}`, modulo: "Asistencia", accion: r.tipo || "OPERACION", categoriaAccion: "OPERACION", responsableId: r.usuarioId, responsableNombre: r.usuarioNombre || r.usuarioEmail || r.usuarioId || "Usuario", responsableCorreo: r.usuarioEmail || "", afectadoId: r.colaboradorId || "Período", afectadoNombre: r.colaboradorNombre || (r.desde ? `${r.desde} al ${r.hasta}` : "Operación de asistencia"), resumen: r.tipo || "Operación administrativa", motivo: r.motivo || r.observacion, fecha: r.fecha, antes: null, despues: r, cambios: null }; }

function obtenerFiltrados() {
  const texto = document.getElementById("buscarAuditoria").value.trim().toLowerCase();
  const modulo = document.getElementById("filtroModuloAuditoria").value;
  const accion = document.getElementById("filtroAccionAuditoria").value;
  const desde = document.getElementById("fechaDesdeAuditoria").value;
  const hasta = document.getElementById("fechaHastaAuditoria").value;
  return registros.filter((r) => {
    const bolsa = [r.modulo, r.accion, r.responsableNombre, r.responsableCorreo, r.afectadoNombre, r.afectadoDocumento, r.resumen, r.motivo].join(" ").toLowerCase();
    const iso = fechaISO(r.fecha);
    return (!texto || bolsa.includes(texto)) && (!modulo || r.modulo === modulo) && (!accion || r.categoriaAccion === accion) && (!desde || iso >= desde) && (!hasta || iso <= hasta);
  });
}

function renderizarAuditoria() {
  const cuerpo = document.getElementById("cuerpoAuditoria");
  const datos = obtenerFiltrados();
  const paginas = Math.max(1, Math.ceil(datos.length / limite)); pagina = Math.min(paginas, Math.max(1, pagina));
  const inicio = (pagina - 1) * limite; const visibles = datos.slice(inicio, inicio + limite);
  cuerpo.innerHTML = visibles.length ? visibles.map((r) => `<tr><td><strong>${html(fechaVisible(r.fecha))}</strong></td><td>${html(r.modulo || "Sistema")}</td><td><span class="badge-auditoria ${String(r.categoriaAccion).toLowerCase()}">${html(etiqueta(r.accion))}</span></td><td><strong>${html(r.responsableNombre || "Usuario")}</strong><small>${html(r.responsableCorreo || r.responsableRol || r.responsableId || "—")}</small></td><td><strong>${html(r.afectadoNombre || "Registro")}</strong><small>${html(r.afectadoDocumento || r.afectadoId || "—")}</small></td><td>${html(r.resumen || "Cambio registrado")}</td><td>${html(r.motivo || "—")}</td><td><button class="btn-auditoria secundario" type="button" data-detalle="${html(r.id)}"><i class="bi bi-eye"></i></button></td></tr>`).join("") : '<tr><td colspan="8" class="auditoria-vacio">No existen cambios para los filtros seleccionados.</td></tr>';
  document.getElementById("informacionAuditoria").textContent = datos.length ? `Mostrando ${inicio + 1}–${Math.min(inicio + limite, datos.length)} de ${datos.length}` : "Mostrando 0 registros";
  document.getElementById("paginaAuditoria").textContent = `Página ${pagina} de ${paginas}`;
  document.getElementById("anteriorAuditoria").disabled = pagina <= 1; document.getElementById("siguienteAuditoria").disabled = pagina >= paginas;
}

function mostrarDetalle(e) {
  const id = e.target.closest("[data-detalle]")?.dataset.detalle; if (!id) return;
  const r = registros.find((x) => x.id === id); if (!r) return;
  document.getElementById("tituloDetalleAuditoria").textContent = tituloOperacion(r);
  const cambiosVisibles = construirCambiosVisibles(r);
  document.getElementById("contenidoDetalleAuditoria").innerHTML = `
    <div class="detalle-auditoria-grid">
      <div><span>Fecha y hora</span><strong>${html(fechaVisible(r.fecha))}</strong></div>
      <div><span>Realizado por</span><strong>${html(r.responsableNombre || "Usuario del sistema")}</strong><small>${html(r.responsableCorreo || r.responsableRol || "")}</small></div>
      <div><span>Módulo</span><strong>${html(r.modulo || "Sistema")}</strong></div>
      <div><span>Acción realizada</span><strong>${html(accionAmigable(r.accion))}</strong></div>
      <div><span>Persona o registro afectado</span><strong>${html(nombreAfectado(r))}</strong></div>
      <div><span>Motivo u observación</span><strong>${html(motivoVisible(r.motivo))}</strong></div>
    </div>
    <section class="detalle-cambios-amigable">
      <h4><i class="bi bi-arrow-left-right"></i> ¿Qué cambió?</h4>
      ${cambiosVisibles}
    </section>`;
  const modal = document.getElementById("modalDetalleAuditoria"); modal.hidden = false; modal.inert = false; modal.removeAttribute("inert"); modal.setAttribute("aria-hidden", "false"); document.getElementById("cerrarDetalleAuditoria").focus();
}

function construirCambiosVisibles(registro) {
  const cambios = registro.cambios && typeof registro.cambios === "object"
    ? Object.entries(registro.cambios)
    : [];
  const utiles = expandirCambios(cambios).filter(([campo]) => !campoTecnico(campo));
  if (utiles.length) {
    return `<div class="lista-cambios-amigable">${utiles.map(([campo, valores]) => `
      <article>
        <strong>${html(nombreCampo(campo))}</strong>
        <div class="comparacion-cambio">
          <span><small>Antes</small>${html(valorAmigable(valores?.anterior, campo))}</span>
          <i class="bi bi-arrow-right"></i>
          <span class="nuevo"><small>Ahora</small>${html(valorAmigable(valores?.nuevo, campo))}</span>
        </div>
      </article>`).join("")}</div>`;
  }
  const datos = registro.despues || registro.antes || {};
  const resumen = camposImportantes(datos).map(([campo, valor]) => `<li><span>${html(nombreCampo(campo))}</span><strong>${html(valorAmigable(valor, campo))}</strong></li>`).join("");
  return resumen
    ? `<p class="explicacion-cambio">${html(registro.resumen || "Se registró una operación en el sistema.")}</p><ul class="datos-operacion">${resumen}</ul>`
    : `<p class="sin-detalle-cambio">${html(registro.resumen || "La operación fue registrada correctamente.")}</p>`;
}

function camposImportantes(datos) {
  const planos = aplanarDatos(datos);
  const orden = ["datosPersonales.nombres","datosPersonales.apellidos","documento.tipo","documento.numero","datosPersonales.fechaNacimiento","datosPersonales.genero","contacto.correo","contacto.telefono","contacto.direccion","organizacion.sucursal","organizacion.area","organizacion.subarea","informacionAdicional.cargoProfesion","informacionAdicional.inicioContrato","informacionAdicional.terminoContrato","colaboradorNombre","colaboradorDocumento","horarioNombre","tipoAsignacion","nombre","descripcion","fecha","fechaInicio","fechaFin","hora","horaInicio","horaFin","diasSemana","cantidadColaboradores","estado","decision","estadoAprobacion","minutosAprobados","minutosCalculados","tipo","desde","hasta","cantidad","observacion","motivo"];
  return orden.filter((campo) => planos[campo] != null && planos[campo] !== "" && !campoTecnico(campo)).slice(0, 18).map((campo) => [campo, planos[campo]]);
}
function campoTecnico(campo) { return /(^id$|Id$|fechaRegistro|fechaModificacion|fechaActualizacion|fechaDecision|fechaEdicion|creadoPor|modificadoPor|decididoPor|empresa|origen|historial|password|token)/i.test(campo); }
function nombreCampo(campo) { const nombres={ "datosPersonales.nombres":"Nombres","datosPersonales.apellidos":"Apellidos","datosPersonales.fechaNacimiento":"Fecha de nacimiento","datosPersonales.genero":"Género","documento.tipo":"Tipo de documento","documento.numero":"Número de documento","contacto.correo":"Correo","contacto.telefono":"Teléfono","contacto.direccion":"Dirección","organizacion.sucursal":"Sucursal","organizacion.area":"Área","organizacion.subarea":"Subárea","informacionAdicional.cargoProfesion":"Cargo o profesión","informacionAdicional.inicioContrato":"Inicio de contrato","informacionAdicional.terminoContrato":"Fin de contrato",colaboradorNombre:"Colaborador",colaboradorDocumento:"Documento",horarioNombre:"Nombre del horario",tipoAsignacion:"Tipo de asignación",cantidadColaboradores:"Cantidad de colaboradores",diasSemana:"Días asignados",fechaInicio:"Fecha de inicio",fechaFin:"Fecha de término",horaInicio:"Hora de inicio",horaFin:"Hora de término",estado:"Estado",decision:"Decisión",estadoAprobacion:"Aprobación",minutosAprobados:"Tiempo aprobado",minutosCalculados:"Tiempo calculado",motivo:"Motivo",observacion:"Observación",fecha:"Fecha",hora:"Hora",tipo:"Tipo",desde:"Desde",hasta:"Hasta",cantidad:"Cantidad",nombre:"Nombre",correo:"Correo",rol:"Rol",horarioIds:"Horario asignado" }; return nombres[campo] || String(campo).split(".").pop().replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," ").replace(/^./,(x)=>x.toUpperCase()); }
function valorAmigable(valor, campo="") { if(valor==null||valor==="")return "Sin información";if(typeof valor==="boolean")return valor?"Sí":"No";if(Array.isArray(valor))return valor.length?valor.map((v)=>typeof v==="string"?etiqueta(v):"Dato registrado").join(", "):"Ninguno";if(typeof valor==="object")return Object.values(aplanarDatos(valor)).filter((v)=>typeof v!=="object").slice(0,5).map(String).join(" · ")||"Información actualizada";if(/minutos/i.test(campo))return duracionMinutos(valor);if(/fecha|inicioContrato|terminoContrato|desde|hasta/i.test(campo)&&/^\d{4}-\d{2}-\d{2}/.test(String(valor)))return fechaCorta(valor);return String(valor).replaceAll("_"," "); }
function aplanarDatos(objeto, prefijo="", salida={}){if(!esObjeto(objeto))return salida;Object.entries(objeto).forEach(([clave,valor])=>{const ruta=prefijo?`${prefijo}.${clave}`:clave;if(esObjeto(valor))aplanarDatos(valor,ruta,salida);else salida[ruta]=valor;});return salida;}
function expandirCambios(cambios){const salida=[];cambios.forEach(([campo,valores])=>{if(esObjeto(valores?.anterior)||esObjeto(valores?.nuevo)){const a=aplanarDatos(esObjeto(valores?.anterior)?valores.anterior:{}),n=aplanarDatos(esObjeto(valores?.nuevo)?valores.nuevo:{});new Set([...Object.keys(a),...Object.keys(n)]).forEach((sub)=>{if(JSON.stringify(a[sub]??null)!==JSON.stringify(n[sub]??null))salida.push([`${campo}.${sub}`,{anterior:a[sub]??null,nuevo:n[sub]??null}]);});}else salida.push([campo,valores]);});return salida;}
function accionEspecifica(accion, cambios, datos){const estado=cambios?.estado;if(estado){const nuevo=String(estado.nuevo||datos.estado||"").toUpperCase();if(nuevo==="ACTIVO")return "ACTIVAR";if(nuevo==="INACTIVO")return "DESACTIVAR";}return accion||"OPERACION";}
function categoriaAccion(accion){const a=String(accion||"").toUpperCase();if(a==="CREAR")return "CREAR";if(a==="ELIMINAR")return "ELIMINAR";if(["ACTIVAR","DESACTIVAR","MODIFICAR"].includes(a))return "MODIFICAR";return "OPERACION";}
function resumenRegistroExistente(registro, coleccion, datos, nombre, accion){const detalle=descripcionEspecifica(coleccion,datos);const verbo={CREAR:"Se creó",ELIMINAR:"Se eliminó",ACTIVAR:"Se activó",DESACTIVAR:"Se desactivó",MODIFICAR:"Se modificó"}[accion]||"Se realizó una operación sobre";const campos=expandirCambios(Object.entries(registro.cambios||{})).filter(([c])=>!campoTecnico(c)).map(([c])=>nombreCampo(c));return `${verbo} ${nombre}${detalle?` · ${detalle}`:""}${accion==="MODIFICAR"&&campos.length?` · Se cambió: ${campos.join(", ")}`:""}`;}
function accionAmigable(accion) { const a=String(accion||"").toUpperCase();if(a.includes("CREAR")||a.includes("AGREGAR"))return "Se creó un registro";if(a.includes("ELIMINAR"))return "Se eliminó un registro";if(a.includes("DESACTIVAR"))return "Se desactivó el registro";if(a.includes("ACTIVAR"))return "Se activó el registro";if(a.includes("APROBAR"))return "Se aprobó una solicitud";if(a.includes("RECHAZAR"))return "Se rechazó una solicitud";if(a.includes("MODIFICAR"))return "Se modificó información";return etiqueta(accion).toLowerCase().replace(/^./,(x)=>x.toUpperCase()); }
function tituloOperacion(r){const a=String(r.accion||"").toUpperCase(),singular={Colaboradores:"colaborador",Horarios:"horario",Permisos:"permiso",Feriados:"feriado",Marcaciones:"marcación",Sucursales:"sucursal",Áreas:"área",Subáreas:"subárea",Compañía:"empresa","Asignación de horarios":"asignación de horario","Horas extra":"horas extra"}[r.modulo]||"registro";const verbo={CREAR:"Creación de",ELIMINAR:"Eliminación de",ACTIVAR:"Activación de",DESACTIVAR:"Desactivación de",MODIFICAR:"Modificación de"}[a]||"Detalle de";return `${verbo} ${singular}`;}
function nombreAfectado(r) { const nombre=String(r.afectadoNombre||"").trim();return nombre&&nombre!=="Registro del sistema"?nombre:(r.modulo?`Registro de ${r.modulo}`:"Registro del sistema"); }
function motivoVisible(motivo) { const m=String(motivo||"").trim();return !m||m==="."||m==="-"?"No se indicó un motivo":m; }
function cerrarDetalle() { const modal=document.getElementById("modalDetalleAuditoria"); if(modal.contains(document.activeElement))document.activeElement.blur(); modal.inert=true; modal.setAttribute("inert",""); modal.setAttribute("aria-hidden","true"); modal.hidden=true; }
function limpiarFiltros(){["buscarAuditoria","filtroModuloAuditoria","filtroAccionAuditoria","fechaDesdeAuditoria","fechaHastaAuditoria"].forEach((id)=>document.getElementById(id).value="");pagina=1;renderizarAuditoria();}
function completarModulos(){const s=document.getElementById("filtroModuloAuditoria"),actual=s.value;const modulos=[...new Set(registros.map((r)=>r.modulo).filter(Boolean))].sort();s.innerHTML='<option value="">Todos los módulos</option>'+modulos.map((m)=>`<option value="${html(m)}">${html(m)}</option>`).join("");if(modulos.includes(actual))s.value=actual;}
function actualizarResumen(){document.getElementById("totalAuditoria").textContent=registros.length;document.getElementById("usuariosAuditoria").textContent=new Set(registros.map((r)=>r.responsableId||r.responsableCorreo).filter(Boolean)).size;document.getElementById("ultimoCambioAuditoria").textContent=registros.length?fechaVisible(registros[0].fecha):"—";}
function fechaMs(v){if(typeof v?.toMillis==="function")return v.toMillis();if(typeof v==="string")return Date.parse(v)||0;return 0;}function fechaISO(v){const ms=fechaMs(v);return ms?new Date(ms).toISOString().slice(0,10):"";}function fechaVisible(v){const ms=fechaMs(v);return ms?new Date(ms).toLocaleString("es-PE",{dateStyle:"short",timeStyle:"short"}):"Pendiente";}function etiqueta(v){return String(v||"OPERACIÓN").replaceAll("_"," ");}function html(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
