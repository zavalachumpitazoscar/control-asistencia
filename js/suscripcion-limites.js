import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const PLANES_COLABORADORES = {
  BASICO: { nombre: "Básico", desde: 1, hasta: 20, maximo: 20 },
  ESTANDAR: { nombre: "Estándar", desde: 21, hasta: 50, maximo: 50 },
  PREMIUM: { nombre: "Premium", desde: 51, hasta: 100, maximo: 100 },
  EMPRESARIAL: { nombre: "Empresarial", desde: 101, hasta: null, maximo: null },
};

export function esColaboradorActivo(colaborador) {
  return String(colaborador?.estado || "ACTIVO").toUpperCase() === "ACTIVO";
}

export function contarColaboradoresActivos(colaboradores = []) {
  return colaboradores.filter(esColaboradorActivo).length;
}

export async function obtenerEstadoPlan(empresaId, cantidadConocida = null) {
  if (!empresaId) throw new Error("No se identificó la empresa.");
  const [empresaSnap, cantidad] = await Promise.all([
    getDoc(doc(db, "companias", empresaId)),
    cantidadConocida === null
      ? getDocs(query(collection(db, "colaboradores"), where("empresaId", "==", empresaId))).then((s) => contarColaboradoresActivos(s.docs.map((d) => d.data())))
      : Promise.resolve(cantidadConocida),
  ]);
  const empresa = empresaSnap.exists() ? empresaSnap.data() : {};
  const codigo = String(empresa.plan?.nombre || "BASICO").toUpperCase();
  const plan = PLANES_COLABORADORES[codigo] || PLANES_COLABORADORES.BASICO;
  const usados = Number(cantidad || 0);
  const maximo = plan.maximo;
  return {
    codigo, plan, usados, maximo,
    disponibles: maximo === null ? null : Math.max(0, maximo - usados),
    suscripcion: empresa.suscripcion || { condicion: "GRATIS" },
  };
}

export async function validarCupoColaboradores(empresaId, cantidadNueva = 1, cantidadConocida = null) {
  const estado = await obtenerEstadoPlan(empresaId, cantidadConocida);
  if (estado.maximo !== null && estado.usados + cantidadNueva > estado.maximo) {
    const error = new Error(`El plan ${estado.plan.nombre} permite un máximo de ${estado.maximo} colaboradores activos. Actualmente existen ${estado.usados} activos y se intentan activar o registrar ${cantidadNueva}.`);
    error.code = "limite-plan-colaboradores";
    error.estadoPlan = estado;
    throw error;
  }
  return estado;
}
