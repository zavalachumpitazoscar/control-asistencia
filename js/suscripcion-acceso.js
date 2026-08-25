import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export const TELEFONO_PAGOS = "902 564 457";
const WHATSAPP_PAGOS = "51902564457";

export async function obtenerBloqueoSuscripcion(empresaId) {
  if (!empresaId) return null;
  const snap = await getDoc(doc(db, "companias", empresaId));
  if (!snap.exists()) return null;
  const empresa = snap.data(), suscripcion = empresa.suscripcion || {};
  const condicion = String(suscripcion.condicion || "").toUpperCase();
  const fechaFin = String(suscripcion.fechaFin || "").slice(0, 10);
  if (!fechaFin || condicion === "GRATIS" || fechaFin >= fechaLocal(new Date())) return null;
  const razonSocial = empresa.empresa?.razonSocial || "la empresa";
  const texto = encodeURIComponent(`Hola, deseo regularizar el pago mensual del sistema de ${razonSocial}. El plan venció el ${fechaVisible(fechaFin)}.`);
  return { empresaId, razonSocial, fechaFin, fechaVisible: fechaVisible(fechaFin), whatsapp: `https://wa.me/${WHATSAPP_PAGOS}?text=${texto}` };
}

export async function mostrarBloqueoSuscripcion(bloqueo) {
  if (!bloqueo) return;
  const resultado = await Swal.fire({ icon: "warning", title: "Suscripción vencida", text: `El plan mensual finalizó el ${bloqueo.fechaVisible}. Por falta de renovación no es posible acceder al sistema. Comunícate al ${TELEFONO_PAGOS} para coordinar el pago mensual.`, confirmButtonText: "Contactar por WhatsApp", showCancelButton: true, cancelButtonText: "Cerrar", confirmButtonColor: "#16a34a", allowOutsideClick: false, allowEscapeKey: false });
  if (resultado.isConfirmed) window.open(bloqueo.whatsapp, "_blank", "noopener");
}

function fechaLocal(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fechaVisible(v) { const [a, m, d] = String(v).split("-"); return `${d}/${m}/${a}`; }
