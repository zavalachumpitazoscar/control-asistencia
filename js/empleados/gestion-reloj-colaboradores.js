import { addDoc, arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { validarCupoColaboradores } from "../suscripcion-limites.js?v=20260825-2";
import { sincronizarColaboradoresConRelojes } from "./sincronizacion-relojes.js?v=20260826-1";

const texto = (valor) => String(valor ?? "").trim();
const escapar = (valor) => texto(valor).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const documento = (item) => texto(item?.documento?.numero || item?.dni || item?.documento);
const normalizarPin = (valor) => /^\d+$/.test(texto(valor)) ? texto(valor).replace(/^0+(?=\d)/, "") : texto(valor);

function nombre(item) {
  const datos = item?.datosPersonales || {};
  return texto(item?.nombreCompleto || `${datos.nombres || ""} ${datos.apellidos || ""}` || item?.nombre || item?.id);
}

function comandoConsultaUsuarios() {
  return `C:${Date.now()}${Math.floor(Math.random() * 900 + 100)}:DATA QUERY USERINFO`;
}

function separarNombre(valor) {
  const partes = texto(valor).split(/\s+/).filter(Boolean);
  if (partes.length < 2) return { nombres: partes[0] || "", apellidos: "" };
  const corte = Math.ceil(partes.length / 2);
  return { nombres: partes.slice(0, corte).join(" "), apellidos: partes.slice(corte).join(" ") };
}

async function elegirReloj(empresaId) {
  const resultado = await getDocs(query(collection(db, "relojesBiometricos"), where("empresaId", "==", empresaId)));
  const relojes = resultado.docs.map((item) => ({ id:item.id, ...item.data() })).filter((item) => item.estado === "ACTIVO");
  if (!relojes.length) {
    await Swal.fire({ icon:"info", title:"Sin relojes activos", text:"Primero autoriza un reloj desde el panel de superadministrador." });
    return null;
  }
  if (relojes.length === 1) return relojes[0];
  const opciones = Object.fromEntries(relojes.map((item) => [item.id, `${item.nombre || "Reloj ZKTeco"} · ${item.id}`]));
  const respuesta = await Swal.fire({ title:"Selecciona el reloj", input:"select", inputOptions:opciones, inputPlaceholder:"Selecciona un dispositivo", showCancelButton:true, confirmButtonText:"Continuar", cancelButtonText:"Cancelar", inputValidator:(valor) => !valor ? "Selecciona un reloj." : undefined });
  return respuesta.isConfirmed ? relojes.find((item) => item.id === respuesta.value) : null;
}

async function esperarUsuarios(empresaId, serial, solicitadoEn) {
  for (let intento = 0; intento < 20; intento += 1) {
    await new Promise((resolver) => setTimeout(resolver, 3000));
    const resultado = await getDocs(query(collection(db, "usuariosRelojDetectados"), where("empresaId", "==", empresaId)));
    const usuarios = resultado.docs.map((item) => ({ id:item.id, ...item.data() })).filter((item) => item.relojSerial === serial && Number(item.detectadoEn?.seconds || 0) * 1000 >= solicitadoEn - 5000);
    if (usuarios.length) return usuarios;
    Swal.update({ html:`Esperando respuesta del reloj…<br><small>Intento ${intento + 1} de 20</small>` });
  }
  return [];
}

async function revisarEImportar(usuarios, colaboradores, empresaId, reloj) {
  const existentes = new Map(colaboradores.map((item) => [normalizarPin(documento(item)), item]));
  const filas = usuarios.map((usuario, indice) => {
    const pin = normalizarPin(usuario.pin);
    const existente = existentes.get(pin);
    const sugerido = /^\d{7}$/.test(pin) ? pin.padStart(8, "0") : (/^\d{8}$/.test(pin) ? pin : "");
    const partes = separarNombre(usuario.nombre);
    return { usuario, indice, pin, existente, sugerido, ...partes };
  });
  const coincidenciasExistentes = [...new Map(filas.filter((fila) => fila.existente).map((fila) => [fila.existente.id, fila.existente])).values()];
  if (coincidenciasExistentes.length) await sincronizarColaboradoresConRelojes(coincidenciasExistentes, { estado:"ACTIVO" });
  const nuevos = filas.filter((fila) => !fila.existente);
  const html = `<div class="zk-import-summary"><p><b>${filas.length}</b> usuarios recibidos · <b>${filas.length - nuevos.length}</b> ya vinculados · <b>${nuevos.length}</b> por revisar</p>${nuevos.length ? `<div class="zk-import-tools"><button id="zkSeleccionarTodos" type="button">Seleccionar todos</button><button id="zkQuitarSeleccion" type="button">Quitar selección</button></div>` : ""}${filas.map((fila) => fila.existente ? `<div class="zk-import-row existing"><b>Código o DNI en el reloj: ${escapar(fila.usuario.pin)}</b><span>Ya está vinculado con ${escapar(nombre(fila.existente))} · DNI ${escapar(documento(fila.existente))}. No se creará un duplicado.</span></div>` : `<div class="zk-import-row"><label><input type="checkbox" data-zk-seleccionar="${fila.indice}" checked> Importar código del reloj: ${escapar(fila.usuario.pin)}</label><div><input data-zk-dni="${fila.indice}" maxlength="8" inputmode="numeric" value="${escapar(fila.sugerido)}" placeholder="DNI correcto de 8 dígitos"><input data-zk-nombres="${fila.indice}" value="${escapar(fila.nombres)}" placeholder="Nombres"><input data-zk-apellidos="${fila.indice}" value="${escapar(fila.apellidos)}" placeholder="Apellidos"></div>${fila.pin.length !== 8 ? `<small>El código registrado en el reloj no contiene un DNI completo. Revisa y confirma el DNI correcto antes de importar.</small>` : ""}</div>`).join("")}</div>`;
  const respuesta = await Swal.fire({ title:"Revisar usuarios del reloj", html, width:900, showCancelButton:true, confirmButtonText:"Importar seleccionados", cancelButtonText:"Cancelar", focusConfirm:false, didOpen:() => {
    const cambiarSeleccion = (seleccionar) => Swal.getHtmlContainer()?.querySelectorAll("[data-zk-seleccionar]").forEach((control) => { control.checked = seleccionar; });
    document.getElementById("zkSeleccionarTodos")?.addEventListener("click", () => cambiarSeleccion(true));
    document.getElementById("zkQuitarSeleccion")?.addEventListener("click", () => cambiarSeleccion(false));
  }, preConfirm:() => {
    const seleccionados = nuevos.filter((fila) => document.querySelector(`[data-zk-seleccionar="${fila.indice}"]`)?.checked).map((fila) => ({ fila, dni:texto(document.querySelector(`[data-zk-dni="${fila.indice}"]`)?.value).replace(/\D/g, ""), nombres:texto(document.querySelector(`[data-zk-nombres="${fila.indice}"]`)?.value), apellidos:texto(document.querySelector(`[data-zk-apellidos="${fila.indice}"]`)?.value) }));
    const invalidos = seleccionados.filter((item) => !/^\d{8}$/.test(item.dni) || !item.nombres || !item.apellidos);
    if (invalidos.length) return Swal.showValidationMessage("Todos los seleccionados deben tener DNI de 8 dígitos, nombres y apellidos."), false;
    const duplicados = seleccionados.filter((item, indice, lista) => existentes.has(normalizarPin(item.dni)) || lista.findIndex((otro) => otro.dni === item.dni) !== indice);
    if (duplicados.length) return Swal.showValidationMessage("Hay DNI duplicados o ya registrados. Corrige la selección."), false;
    return seleccionados;
  }});
  if (!respuesta.isConfirmed || !respuesta.value?.length) return;
  await validarCupoColaboradores(empresaId, respuesta.value.length);
  const creados = [];
  for (const item of respuesta.value) {
    const referencia = await addDoc(collection(db, "colaboradores"), { empresaId, documento:{ tipo:"DNI", numero:item.dni }, datosPersonales:{ nombres:item.nombres, apellidos:item.apellidos, fechaNacimiento:null, genero:"" }, contacto:{ correo:"", telefono:"", direccion:"" }, organizacion:{ sucursalId:reloj.sucursalId || null, sucursal:"", areaId:null, area:"", subareaId:null, subarea:"" }, informacionAdicional:{ cargoProfesion:"", inicioContrato:null, terminoContrato:null, nacionalidad:"PERUANA", paisNacionalidad:"PERÚ", comentarios:"Importado desde reloj ZKTeco" }, estado:"ACTIVO", origenRegistro:"RELOJ_ZKTECO", fechaRegistro:serverTimestamp() });
    creados.push({ id:referencia.id, empresaId, documento:{ numero:item.dni }, datosPersonales:{ nombres:item.nombres, apellidos:item.apellidos }, estado:"ACTIVO" });
    await updateDoc(doc(db, "usuariosRelojDetectados", item.fila.usuario.id), { estadoImportacion:"IMPORTADO", colaboradorId:referencia.id, importadoEn:serverTimestamp() });
  }
  await sincronizarColaboradoresConRelojes(creados, { estado:"ACTIVO" });
  await Swal.fire({ icon:"success", title:"Importación completada", text:`Se registraron ${creados.length} colaboradores correctamente.` });
}

export async function obtenerEImportarUsuariosReloj({ empresaId, reloj, colaboradores }) {
  if (!empresaId || !reloj) return;
  try {
    const solicitadoEn = Date.now();
    await updateDoc(doc(db, "relojesBiometricos", reloj.id), { comandosPendientes:arrayUnion(comandoConsultaUsuarios()), solicitudUsuariosEn:serverTimestamp() });
    Swal.fire({ title:"Obteniendo empleados del reloj", html:"La solicitud quedó programada. El reloj suele responder en aproximadamente 30 segundos…", allowOutsideClick:false, allowEscapeKey:false, showConfirmButton:false, didOpen:() => Swal.showLoading() });
    const usuarios = await esperarUsuarios(empresaId, reloj.id, solicitadoEn);
    if (!usuarios.length) return Swal.fire({ icon:"warning", title:"El reloj aún no respondió", text:"La orden seguirá pendiente. Si está desconectado, se procesará cuando vuelva a conectarse." });
    await revisarEImportar(usuarios, colaboradores, empresaId, reloj);
  } catch (error) {
    console.error(error);
    await Swal.fire({ icon:"error", title:"No se pudo obtener la lista", text:"El reloj no devolvió usuarios o Firestore no está disponible." });
  }
}

export function iniciarGestionRelojColaboradores({ empresaId, botonReenviar, botonObtener, obtenerSeleccionados, obtenerColaboradores }) {
  botonReenviar?.addEventListener("click", async () => {
    const ids = obtenerSeleccionados();
    const colaboradores = obtenerColaboradores().filter((item) => ids.includes(item.id) && item.estado !== "INACTIVO");
    if (!colaboradores.length) return Swal.fire({ icon:"info", title:"Selecciona colaboradores activos", text:"Marca uno o varios colaboradores para reenviarlos al reloj." });
    try {
      const resultado = await sincronizarColaboradoresConRelojes(colaboradores, { estado:"ACTIVO" });
      const totalRelojes = Math.max(0, ...resultado.map((item) => item.relojes || 0));
      await Swal.fire({ icon:"success", title:"Reenvío programado", text:`Se reenviarán ${colaboradores.length} colaboradores a ${totalRelojes} reloj(es) activo(s).` });
    } catch (error) {
      console.error(error);
      await Swal.fire({ icon:"error", title:"No se pudo reenviar", text:"Comprueba la conexión e inténtalo nuevamente." });
    }
  });

  botonObtener?.addEventListener("click", async () => {
    const reloj = await elegirReloj(empresaId);
    if (!reloj) return;
    await obtenerEImportarUsuariosReloj({ empresaId, reloj, colaboradores:obtenerColaboradores() });
  });
}
