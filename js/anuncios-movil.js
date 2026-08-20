import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

onAuthStateChanged(auth, async (usuario) => {
  const contenedor = document.getElementById("anunciosMovil");
  if (!contenedor) return;
  contenedor.hidden = true;
  contenedor.innerHTML = "";
  if (!usuario) return;
  try {
    const perfil = await esperarPerfil(usuario.uid);
    if (!perfil?.empresaId) return;
    const snap = await getDocs(query(collection(db, "anunciosEmpresa"), where("empresaId", "==", perfil.empresaId)));
    const hoy = new Date().toISOString().slice(0, 10);
    const anuncios = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.estado === "PUBLICADO" && ["TODOS", "MOVIL"].includes(a.destino || "TODOS") && (!a.visibleDesde || a.visibleDesde <= hoy) && (!a.visibleHasta || a.visibleHasta >= hoy))
      .sort((a, b) => milis(b.creadoEn) - milis(a.creadoEn));
    if (!anuncios.length) return;
    contenedor.innerHTML = anuncios.map((a) => `<article class="anuncio-movil"><header><i class="bi bi-megaphone-fill"></i><strong>${esc(a.titulo || "Comunicado")}</strong></header><p>${esc(a.mensaje || "")}</p>${a.visibleHasta ? `<small>Visible hasta ${fecha(a.visibleHasta)}</small>` : ""}</article>`).join("");
    contenedor.hidden = false;
  } catch (error) { console.warn("No se pudieron cargar los comunicados móviles:", error); }
});

async function esperarPerfil(uid) {
  for (let i = 0; i < 8; i += 1) {
    const snap = await getDoc(doc(db, "usuariosMoviles", uid));
    if (snap.exists()) return snap.data();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}
function milis(v) { return v?.toMillis?.() || v?.seconds * 1000 || 0; }
function esc(v) { const e = document.createElement("div"); e.textContent = String(v ?? ""); return e.innerHTML; }
function fecha(v) { const [a, m, d] = String(v).split("-"); return a && m && d ? `${d}/${m}/${a}` : v; }
