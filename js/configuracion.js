import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const CLAVE_APARIENCIA = "controlAsistenciaApariencia";
const PREDETERMINADO = { color: "#2563eb", densidad: "compacta", vistaInicial: "dashboard" };

export function obtenerAparienciaGuardada(){
  try{return {...PREDETERMINADO,...JSON.parse(localStorage.getItem(CLAVE_APARIENCIA)||"{}")};}
  catch{return {...PREDETERMINADO};}
}

export function aplicarAparienciaGuardada(){
  const apariencia=obtenerAparienciaGuardada();
  document.documentElement.style.setProperty("--accent",apariencia.color);
  document.documentElement.style.setProperty("--modulo-azul",apariencia.color);
  document.documentElement.style.setProperty("--ui-azul",apariencia.color);
  document.body.classList.toggle("interfaz-comoda",apariencia.densidad==="comoda");
  return apariencia;
}

export function iniciarConfiguracion({abrirManual}={}){
  const apariencia=obtenerAparienciaGuardada();
  const densidad=document.getElementById("densidadConfiguracion");
  const vista=document.getElementById("vistaInicialConfiguracion");
  if(densidad)densidad.value=apariencia.densidad;
  if(vista)vista.value=apariencia.vistaInicial;
  marcarColor(apariencia.color);
  document.getElementById("coloresConfiguracion")?.addEventListener("click",e=>{const b=e.target.closest("[data-color]");if(b)marcarColor(b.dataset.color);});
  document.getElementById("btnGuardarApariencia")?.addEventListener("click",()=>{
    const color=document.querySelector("#coloresConfiguracion [data-color].activo")?.dataset.color||PREDETERMINADO.color;
    localStorage.setItem(CLAVE_APARIENCIA,JSON.stringify({color,densidad:densidad?.value||"compacta",vistaInicial:vista?.value||"dashboard"}));
    aplicarAparienciaGuardada();
    Swal.fire({icon:"success",title:"Apariencia guardada",text:"La preferencia se aplicó en este dispositivo.",timer:1700,showConfirmButton:false});
  });
  document.getElementById("btnRestaurarApariencia")?.addEventListener("click",()=>{localStorage.removeItem(CLAVE_APARIENCIA);aplicarAparienciaGuardada();iniciarValoresPredeterminados(densidad,vista);marcarColor(PREDETERMINADO.color);});
  document.getElementById("btnAbrirManualConfiguracion")?.addEventListener("click",()=>abrirManual?.());
  document.getElementById("btnActualizarInfoSistema")?.addEventListener("click",actualizarInformacion);
  document.getElementById("btnCopiarInfoSistema")?.addEventListener("click",copiarInformacion);
  actualizarInformacion();
}

function iniciarValoresPredeterminados(densidad,vista){if(densidad)densidad.value=PREDETERMINADO.densidad;if(vista)vista.value=PREDETERMINADO.vistaInicial;}
function marcarColor(color){document.querySelectorAll("#coloresConfiguracion [data-color]").forEach(b=>b.classList.toggle("activo",b.dataset.color===color));}
async function actualizarInformacion(){
  const empresaId=sessionStorage.getItem("empresaId");
  let empresa="Empresa vinculada";
  if(empresaId){
    try{const documento=await getDoc(doc(db,"companias",empresaId));const datos=documento.data()||{};empresa=datos.empresa?.razonSocial||datos.razonSocial||"Empresa vinculada";}catch{empresa="Empresa vinculada";}
  }
  const usuario=document.getElementById("nombreUsuarioTop")?.textContent?.trim()||"Usuario activo";
  const dispositivo=/Mobi|Android/i.test(navigator.userAgent)?"Dispositivo móvil":"Computadora";
  const e=document.getElementById("infoEmpresaSistema"),u=document.getElementById("infoUsuarioSistema"),d=document.getElementById("infoDispositivoSistema");
  if(e)e.textContent=empresa;if(u)u.textContent=usuario;if(d)d.textContent=`${dispositivo} · ${navigator.onLine?"En línea":"Sin conexión"}`;
}
async function copiarInformacion(){
  const texto=[...document.querySelectorAll("#informacionSistema div")].map(x=>`${x.querySelector("dt")?.textContent}: ${x.querySelector("dd")?.textContent}`).join("\n");
  try{await navigator.clipboard.writeText(texto);Swal.fire({icon:"success",title:"Información copiada",timer:1300,showConfirmButton:false});}catch{Swal.fire({icon:"info",title:"Información del sistema",text:texto});}
}
