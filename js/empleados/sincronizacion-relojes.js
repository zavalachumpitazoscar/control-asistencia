import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { auth, db } from "../firebase-config.js";

const texto = (valor) => String(valor ?? "").trim();

function documentoColaborador(colaborador) {
  const documento = colaborador?.documento?.numero || colaborador?.dni || colaborador?.documento || "";
  return typeof documento === "string" || typeof documento === "number" ? texto(documento) : "";
}

function nombreColaborador(colaborador) {
  const datos = colaborador?.datosPersonales || {};
  return texto(colaborador?.nombreCompleto || `${datos.nombres || ""} ${datos.apellidos || ""}` || colaborador?.nombre || colaborador?.id);
}

function normalizarPin(valor) {
  const pin = texto(valor);
  return /^\d+$/.test(pin) ? pin.replace(/^0+(?=\d)/, "") : pin;
}

function idVinculo(serial, pin) {
  return encodeURIComponent(`${serial}__${normalizarPin(pin)}`);
}

function limpiarComando(valor, maximo = 80) {
  return texto(valor).replace(/[\t\r\n]/g, " ").replace(/\s+/g, " ").slice(0, maximo);
}

function comandoUsuario(tipo, colaborador, pin) {
  const id = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  if (tipo === "ELIMINAR") return `C:${id}:DATA DELETE USERINFO PIN=${pin}`;
  const nombre = limpiarComando(nombreColaborador(colaborador) || pin, 40);
  return `C:${id}:DATA UPDATE USERINFO PIN=${pin}\tName=${nombre}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\tVerify=0`;
}

async function relojesActivos(empresaId) {
  const resultado = await getDocs(query(collection(db, "relojesBiometricos"), where("empresaId", "==", empresaId)));
  return resultado.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.estado === "ACTIVO");
}

async function aplicarSincronizacion(colaborador, relojes, estado) {
  const empresaId = texto(colaborador?.empresaId || sessionStorage.getItem("empresaId"));
  const documento = documentoColaborador(colaborador);
  const pin = normalizarPin(documento);
  if (!empresaId || !colaborador?.id || !/^\d+$/.test(documento) || !pin) return { relojes: 0, omitido: true };
  for (let inicio = 0; inicio < relojes.length; inicio += 200) {
    const lote = writeBatch(db);
    relojes.slice(inicio, inicio + 200).forEach((reloj) => {
      const activo = estado === "ACTIVO";
      lote.set(doc(db, "vinculosReloj", idVinculo(reloj.id, pin)), {
        empresaId,
        relojSerial: reloj.id,
        relojNombre: reloj.nombre || reloj.id,
        pin,
        colaboradorId: colaborador.id,
        colaboradorNombre: nombreColaborador(colaborador),
        colaboradorDocumento: documento,
        sucursalId: reloj.sucursalId || null,
        estado: activo ? "ACTIVO" : "INACTIVO",
        origenVinculo: "DNI_AUTOMATICO",
        actualizadoEn: serverTimestamp(),
        actualizadoPor: auth.currentUser?.uid || "SISTEMA_CLIENTE",
      }, { merge: true });
      lote.update(doc(db, "relojesBiometricos", reloj.id), {
        comandosPendientes: arrayUnion(comandoUsuario(activo ? "ACTUALIZAR" : "ELIMINAR", colaborador, pin)),
        comandosActualizadosEn: serverTimestamp(),
      });
    });
    await lote.commit();
  }
  return { relojes: relojes.length, omitido: false };
}

export async function sincronizarColaboradorConRelojes(colaborador, { estado = "ACTIVO" } = {}) {
  const empresaId = texto(colaborador?.empresaId || sessionStorage.getItem("empresaId"));
  if (!empresaId) return { relojes: 0, omitido: true };
  return aplicarSincronizacion(colaborador, await relojesActivos(empresaId), estado);
}

export async function sincronizarColaboradoresConRelojes(colaboradores, opciones = {}) {
  const empresaId = texto(colaboradores.find((item) => item?.empresaId)?.empresaId || sessionStorage.getItem("empresaId"));
  if (!empresaId || !colaboradores.length) return [];
  const relojes = await relojesActivos(empresaId);
  const resultados = [];
  for (const colaborador of colaboradores) resultados.push(await aplicarSincronizacion(colaborador, relojes, opciones.estado || "ACTIVO"));
  return resultados;
}
