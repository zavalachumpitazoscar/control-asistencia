import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let cargadoPara = "";
export function iniciarAnunciosGlobales() {
  onAuthStateChanged(auth, (usuario) => { if (usuario) esperarEmpresa(); });
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
    const snap = await getDocs(query(collection(db, "anunciosEmpresa"), where("empresaId", "==", empresaId)));
    const hoy = new Date().toISOString().slice(0, 10);
    const ocultos = JSON.parse(sessionStorage.getItem("anunciosOcultos") || "[]");
    const anuncios = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.estado === "PUBLICADO" && ["TODOS", "ADMIN", "ADMINISTRADORES"].includes(a.destino || "TODOS") && (!a.visibleDesde || a.visibleDesde <= hoy) && (!a.visibleHasta || a.visibleHasta >= hoy) && !ocultos.includes(a.id))
      .sort((a, b) => milis(b.creadoEn) - milis(a.creadoEn));
    document.getElementById("anunciosGlobalesSistema")?.remove();
    if (!anuncios.length) return;
    const bloque = document.createElement("section"); bloque.id = "anunciosGlobalesSistema"; bloque.className = "anuncio-global-sistema";
    bloque.innerHTML = anuncios.slice(0, 3).map((a) => `<article><i class="bi bi-megaphone-fill"></i><div><strong>${esc(a.titulo || "Comunicado")}</strong><p>${esc(a.mensaje || "")}</p></div><button type="button" data-ocultar-anuncio="${a.id}" aria-label="Ocultar comunicado">×</button></article>`).join("");
    (document.querySelector(".contenido") || document.querySelector("main") || document.body).prepend(bloque);
    bloque.onclick = (e) => { const b = e.target.closest("[data-ocultar-anuncio]"); if (!b) return; const ids = [...new Set([...ocultos, b.dataset.ocultarAnuncio])]; sessionStorage.setItem("anunciosOcultos", JSON.stringify(ids)); b.closest("article")?.remove(); if (!bloque.children.length) bloque.remove(); };
  } catch (error) { console.warn("No se pudieron cargar los comunicados:", error); }
}
function milis(v) { return v?.toMillis?.() || v?.seconds * 1000 || 0; }
function esc(v) { const e = document.createElement("div"); e.textContent = String(v ?? ""); return e.innerHTML; }
