import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export const TELEFONO_PAGOS = "902 564 457";
const WHATSAPP_PAGOS = "51902564457";
const DIAS_AVISO_RENOVACION = 7;

export async function obtenerEstadoSuscripcion(empresaId) {
  if (!empresaId) return { estado: "SIN_EMPRESA" };
  const snap = await getDoc(doc(db, "companias", empresaId));
  if (!snap.exists()) return { estado: "SIN_EMPRESA", empresaId };
  const empresa = snap.data(), suscripcion = empresa.suscripcion || {};
  const condicion = String(suscripcion.condicion || "").toUpperCase();
  const fechaFin = normalizarFechaISO(suscripcion.fechaFin);
  const razonSocial = empresa.empresa?.razonSocial || empresa.razonSocial || "la empresa";
  if (!fechaFin || condicion === "GRATIS") return { estado: "VIGENTE", empresaId, razonSocial, condicion, fechaFin: null };
  const diasRestantes = diferenciaDias(fechaLocal(new Date()), fechaFin);
  const estado = diasRestantes < 0 ? "VENCIDA" : diasRestantes <= DIAS_AVISO_RENOVACION ? "POR_VENCER" : "VIGENTE";
  const accion = estado === "VENCIDA" ? "regularizar el pago mensual" : "coordinar la renovación mensual";
  const texto = encodeURIComponent(`Hola, deseo ${accion} del sistema de ${razonSocial}. El plan ${estado === "VENCIDA" ? "venció" : "vence"} el ${fechaVisible(fechaFin)}.`);
  return { estado, empresaId, razonSocial, condicion, fechaFin, fechaVisible: fechaVisible(fechaFin), diasRestantes, whatsapp: `https://wa.me/${WHATSAPP_PAGOS}?text=${texto}` };
}

export async function obtenerBloqueoSuscripcion(empresaId) {
  const estado = await obtenerEstadoSuscripcion(empresaId);
  return estado.estado === "VENCIDA" ? estado : null;
}

export async function mostrarBloqueoSuscripcion(bloqueo) {
  if (!bloqueo) return;
  const resultado = await Swal.fire({ icon: "error", title: "Tu suscripción ha vencido", text: `El plan mensual finalizó el ${bloqueo.fechaVisible}. El acceso permanecerá bloqueado hasta registrar la renovación. Comunícate al ${TELEFONO_PAGOS}.`, confirmButtonText: "Contactar por WhatsApp", showCancelButton: true, cancelButtonText: "Cerrar", confirmButtonColor: "#16a34a", allowOutsideClick: false, allowEscapeKey: false });
  if (resultado.isConfirmed) window.open(bloqueo.whatsapp, "_blank", "noopener");
}

export async function mostrarAvisoRenovacion(estado) {
  if (estado?.estado !== "POR_VENCER") return;
  const venceHoy = estado.diasRestantes === 0;
  const resultado = await Swal.fire({ icon: "warning", title: venceHoy ? "Tu plan vence hoy" : `Tu plan vence en ${estado.diasRestantes} día${estado.diasRestantes === 1 ? "" : "s"}`, text: `La suscripción finalizará el ${estado.fechaVisible}. Registra la renovación para evitar que se bloquee el acceso.`, confirmButtonText: "Continuar al sistema", showDenyButton: true, denyButtonText: "Contactar por WhatsApp", confirmButtonColor: "#2563eb", denyButtonColor: "#16a34a" });
  if (resultado.isDenied) window.open(estado.whatsapp, "_blank", "noopener");
}

export function programarControlDiarioSuscripcion(empresaId, alVencer) {
  let temporizador;
  const programar = () => {
    const ahora = new Date();
    const siguienteDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 5);
    temporizador = window.setTimeout(async () => {
      try {
        const estado = await obtenerEstadoSuscripcion(empresaId);
        if (estado.estado === "VENCIDA") await alVencer(estado);
        else { await mostrarAvisoRenovacion(estado); programar(); }
      } catch (error) {
        console.warn("No se pudo comprobar la suscripción al cambiar de día:", error);
        programar();
      }
    }, siguienteDia.getTime() - ahora.getTime());
  };
  programar();
  return () => window.clearTimeout(temporizador);
}

export function normalizarFechaISO(valor) {
  if (!valor) return "";
  if (typeof valor?.toDate === "function") return fechaLocal(valor.toDate());
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? "" : fechaLocal(valor);
  if (typeof valor === "object" && Number.isFinite(valor.seconds)) return fechaLocal(new Date(valor.seconds * 1000));
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  return "";
}

function diferenciaDias(desde, hasta) { return Math.round((new Date(`${hasta}T00:00:00`) - new Date(`${desde}T00:00:00`)) / 86400000); }
function fechaLocal(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fechaVisible(v) { const [a, m, d] = String(v).split("-"); return a && m && d ? `${d}/${m}/${a}` : "—"; }
