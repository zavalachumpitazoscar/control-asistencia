import { iniciarNavegacionAsistencia } from "./asistencia/navegacion-asistencia.js";
import { iniciarFechaAsistencia } from "./asistencia/fecha-asistencia.js";
import { iniciarImportacionMarcaciones } from "./asistencia/importacion-marcaciones.js?v=20260821-3";
import { iniciarResumenAsistencia } from "./asistencia/resumen-asistencia.js?v=20260820-5";
import { iniciarMarcacionesAsistencia } from "./asistencia/marcaciones-asistencia.js?v=20260819-1";
import { iniciarResumenMensualAsistencia } from "./asistencia/resumen-mensual-asistencia.js?v=20260821-9";
import { iniciarEditarDiaAsistencia } from "./asistencia/editar-dia-asistencia.js?v=20260814-1";
import { iniciarMarcacionManualAsistencia } from "./asistencia/marcacion-manual-asistencia.js?v=20260817-1";
import { iniciarAjusteRefrigerioAsistencia } from "./asistencia/ajuste-refrigerio-asistencia.js";
import { iniciarAprobacionHorasExtraAsistencia } from "./asistencia/aprobar-horas-extra-asistencia.js?v=20260820-2";
import { iniciarOperacionesMensualesAsistencia } from "./asistencia/operaciones-mensuales-asistencia.js?v=20260820-6";
import { iniciarRegularizacionesCierresAsistencia } from "./asistencia/regularizaciones-cierres-asistencia.js?v=20260814-1";

export async function iniciarAsistencia() {
  // Retira cualquier panel obsoleto que hubiera quedado en caché de versiones anteriores.
  document.getElementById("panelAdministracionAsistencia")?.remove();
  console.log("✅ INICIANDO MÓDULO DE ASISTENCIA · VERSIÓN 2026-08-12.5");
  iniciarNavegacionAsistencia();
  iniciarResumenAsistencia();
  iniciarMarcacionesAsistencia();
  iniciarResumenMensualAsistencia();
  iniciarEditarDiaAsistencia();
  iniciarMarcacionManualAsistencia();
  iniciarAjusteRefrigerioAsistencia();
  iniciarFechaAsistencia();
  iniciarImportacionMarcaciones();
  iniciarAprobacionHorasExtraAsistencia();
  iniciarOperacionesMensualesAsistencia();
  iniciarRegularizacionesCierresAsistencia();
}
