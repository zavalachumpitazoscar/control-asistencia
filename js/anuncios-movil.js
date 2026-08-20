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
    const vistos = JSON.parse(sessionStorage.getItem("anunciosMovilVistos") || "[]"), pendientes=anuncios.filter(a=>!vistos.includes(a.id));
    if (!pendientes.length) return;
    contenedor.innerHTML = `<div class="anuncio-movil-tarjeta"><div class="anuncio-movil-icono"><i class="bi bi-megaphone-fill"></i></div><span>COMUNICADO DE TU EMPRESA</span>${pendientes.slice(0,3).map((a) => `<article><h2>${esc(a.titulo || "Comunicado")}</h2><p>${esc(a.mensaje || "")}</p>${a.visibleHasta ? `<small>Visible hasta ${fecha(a.visibleHasta)}</small>` : ""}</article>`).join("")}<button type="button" id="cerrarAnunciosMovil">Entendido</button></div>`;
    contenedor.hidden = false;
    document.body.classList.add("anuncio-movil-abierto");
    document.getElementById("cerrarAnunciosMovil").onclick=()=>{sessionStorage.setItem("anunciosMovilVistos",JSON.stringify([...new Set([...vistos,...pendientes.slice(0,3).map(a=>a.id)])]));document.body.classList.remove("anuncio-movil-abierto");contenedor.hidden=true;};
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
