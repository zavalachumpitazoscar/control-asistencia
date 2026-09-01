import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { normalizarFechaISO } from "./suscripcion-acceso.js?v=20260901-1";

const WHATSAPP_PAGOS = "51902564457";

let cargadoPara = "";
export function iniciarAnunciosGlobales() {
  onAuthStateChanged(auth, (usuario) => { if (usuario) esperarEmpresa(); else { cargadoPara=""; document.getElementById("anunciosGlobalesSistema")?.remove(); document.body.classList.remove("modal-anuncio-abierto"); } });
  window.addEventListener("storage", esperarEmpresa);
}
async function esperarEmpresa() {
  for (let i = 0; i < 12; i += 1) {
    const empresaId = sessionStorage.getItem("empresaId");
    if (empresaId) { if (cargadoPara !== empresaId) await cargar(empresaId); return; }
    await new Promise((r) => setTimeout(r, 400));
  }
}
async function cargar(empresaId) {
  cargadoPara = empresaId;
  try {
    const [snap, empresaSnap] = await Promise.all([
      getDocs(query(collection(db, "anunciosEmpresa"), where("empresaId", "==", empresaId))),
      getDoc(doc(db, "companias", empresaId)),
    ]);
    const hoy = fechaLocal(new Date());
    const anuncios = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.estado === "PUBLICADO" && ["TODOS", "ADMIN", "ADMINISTRADORES"].includes(a.destino || "TODOS") && (!a.visibleDesde || a.visibleDesde <= hoy) && (!a.visibleHasta || a.visibleHasta >= hoy))
      .sort((a, b) => milis(b.creadoEn) - milis(a.creadoEn));
    const avisoPago = crearAvisoPago(empresaSnap.exists() ? empresaSnap.data() : {}, hoy);
    if (avisoPago) anuncios.unshift(avisoPago);
    document.getElementById("anunciosGlobalesSistema")?.remove();
    if (!anuncios.length) return;
    const bloque = document.createElement("section"); bloque.id = "anunciosGlobalesSistema"; bloque.className = "anuncio-modal-sistema"; bloque.setAttribute("role", "dialog"); bloque.setAttribute("aria-modal", "true"); bloque.setAttribute("aria-label", "Comunicados importantes");
    bloque.innerHTML = `<div class="anuncio-modal-tarjeta"><div class="anuncio-modal-icono"><i class="bi bi-megaphone-fill"></i></div><span class="anuncio-modal-etiqueta">COMUNICADO IMPORTANTE</span>${anuncios.slice(0,3).map((a) => `<article data-anuncio-id="${a.id}" class="${a.automatico?"anuncio-pago-proximo":""}"><h2>${esc(a.titulo || "Comunicado")}</h2><p>${esc(a.mensaje || "")}</p>${a.visibleHasta?`<small>Disponible hasta ${fecha(a.visibleHasta)}</small>`:""}${a.whatsapp?`<a class="anuncio-whatsapp" href="${a.whatsapp}" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Contactar por WhatsApp</a>`:""}</article>`).join("")}<button type="button" class="anuncio-modal-entendido">Entendido</button><small class="anuncio-modal-contador">${anuncios.length} comunicado(s) vigente(s)</small></div>`;
    document.body.appendChild(bloque); document.body.classList.add("modal-anuncio-abierto");
    bloque.querySelector(".anuncio-modal-entendido").onclick = () => { document.body.classList.remove("modal-anuncio-abierto");bloque.remove(); };
  } catch (error) { console.warn("No se pudieron cargar los comunicados:", error); }
}
function milis(v) { return v?.toMillis?.() || v?.seconds * 1000 || 0; }
function esc(v) { const e = document.createElement("div"); e.textContent = String(v ?? ""); return e.innerHTML; }
function fecha(v) { const [a,m,d]=String(v||"").slice(0,10).split("-"); return a&&m&&d?`${d}/${m}/${a}`:v; }
function fechaLocal(valor){const a=valor.getFullYear(),m=String(valor.getMonth()+1).padStart(2,"0"),d=String(valor.getDate()).padStart(2,"0");return `${a}-${m}-${d}`;}
function crearAvisoPago(empresa,hoy){
  const suscripcion=empresa?.suscripcion||{};
  const fin=normalizarFechaISO(suscripcion.fechaFin);
  if(!fin||String(suscripcion.condicion||"").toUpperCase()==="GRATIS")return null;
  const dias=Math.round((new Date(`${fin}T00:00:00`)-new Date(`${hoy}T00:00:00`))/86400000);
  if(dias<0||dias>7)return null;
  const razon=empresa?.empresa?.razonSocial||"mi empresa";
  const texto=encodeURIComponent(`Hola, deseo coordinar la renovación mensual del sistema de ${razon}. Mi plan vence el ${fecha(fin)}.`);
  return{id:"aviso-renovacion",automatico:true,titulo:dias===0?"Tu plan vence hoy":`Tu plan vence en ${dias} día${dias===1?"":"s"}`,mensaje:`La suscripción mensual finalizará el ${fecha(fin)}. Para evitar la interrupción del acceso al sistema, comunícate por WhatsApp y coordina el pago mensual.`,visibleHasta:fin,whatsapp:`https://wa.me/${WHATSAPP_PAGOS}?text=${texto}`};
}
