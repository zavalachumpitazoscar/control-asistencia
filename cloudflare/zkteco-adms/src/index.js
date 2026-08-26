const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const INTERVALO_COMANDOS_SEGUNDOS = 120;
const INTERVALO_PRESENCIA_MS = 5 * 60 * 1000;
let tokenCache = null;

const texto = (valor) => String(valor ?? "").trim();
const respuesta = (cuerpo, estado = 200) => new Response(cuerpo, {
  status: estado,
  headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
});

function base64Url(datos) {
  const bytes = datos instanceof Uint8Array ? datos : new TextEncoder().encode(datos);
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function pemABinario(pem) {
  const limpio = pem.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binario = atob(limpio);
  return Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
}

async function tokenServicio(env) {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache?.token && tokenCache.expira > ahora + 90) return tokenCache.token;
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY || env.FIREBASE_CLIENT_EMAIL.includes("CONFIGURAR")) {
    throw new Error("Faltan los secretos de la cuenta de servicio de Firebase.");
  }
  const cabecera = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const carga = base64Url(JSON.stringify({ iss: env.FIREBASE_CLIENT_EMAIL, scope: FIRESTORE_SCOPE, aud: TOKEN_URL, iat: ahora, exp: ahora + 3600 }));
  const clave = await crypto.subtle.importKey("pkcs8", pemABinario(env.FIREBASE_PRIVATE_KEY), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clave, new TextEncoder().encode(`${cabecera}.${carga}`));
  const assertion = `${cabecera}.${carga}.${base64Url(new Uint8Array(firma))}`;
  const solicitud = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const datos = await solicitud.json();
  if (!solicitud.ok || !datos.access_token) throw new Error(datos.error_description || "No se obtuvo acceso a Firestore.");
  tokenCache = { token: datos.access_token, expira: ahora + Number(datos.expires_in || 3600) };
  return tokenCache.token;
}

const raizFirestore = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function decodificarValor(valor = {}) {
  if ("stringValue" in valor) return valor.stringValue;
  if ("integerValue" in valor) return Number(valor.integerValue);
  if ("doubleValue" in valor) return Number(valor.doubleValue);
  if ("booleanValue" in valor) return valor.booleanValue;
  if ("timestampValue" in valor) return valor.timestampValue;
  if ("nullValue" in valor) return null;
  if (valor.mapValue) return decodificarCampos(valor.mapValue.fields || {});
  if (valor.arrayValue) return (valor.arrayValue.values || []).map(decodificarValor);
  return null;
}

function decodificarCampos(campos = {}) {
  return Object.fromEntries(Object.entries(campos).map(([clave, valor]) => [clave, decodificarValor(valor)]));
}

function codificarValor(valor) {
  if (valor === null || valor === undefined) return { nullValue: null };
  if (valor instanceof Date) return { timestampValue: valor.toISOString() };
  if (typeof valor === "boolean") return { booleanValue: valor };
  if (typeof valor === "number") return Number.isInteger(valor) ? { integerValue: String(valor) } : { doubleValue: valor };
  if (Array.isArray(valor)) return { arrayValue: { values: valor.map(codificarValor) } };
  if (typeof valor === "object") return { mapValue: { fields: codificarCampos(valor) } };
  return { stringValue: String(valor) };
}

function codificarCampos(datos) {
  return Object.fromEntries(Object.entries(datos).map(([clave, valor]) => [clave, codificarValor(valor)]));
}

async function obtenerDocumento(env, ruta, token) {
  const consulta = await fetch(`${raizFirestore(env)}/${ruta}`, { headers: { authorization: `Bearer ${token}` } });
  if (consulta.status === 404) return null;
  if (!consulta.ok) throw new Error(`Firestore GET ${consulta.status}`);
  const documento = await consulta.json();
  return { id: documento.name.split("/").pop(), ...decodificarCampos(documento.fields || {}) };
}

async function obtenerDocumentos(env, rutas, token) {
  if (!rutas.length) return new Map();
  const solicitud = await fetch(`${raizFirestore(env)}:batchGet`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ documents: rutas.map((ruta) => nombreDocumento(env, ruta)) }),
  });
  if (!solicitud.ok) throw new Error(`Firestore BATCH GET ${solicitud.status}`);
  const cuerpo = await solicitud.text();
  let respuestas;
  try {
    respuestas = JSON.parse(cuerpo);
  } catch (_) {
    respuestas = cuerpo.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).map((linea) => JSON.parse(linea));
  }
  if (!Array.isArray(respuestas)) respuestas = [respuestas];
  return new Map(respuestas.filter((item) => item.found).map((item) => {
    const documento = item.found;
    return [decodeURIComponent(documento.name.split("/").pop()), { id: decodeURIComponent(documento.name.split("/").pop()), ...decodificarCampos(documento.fields || {}) }];
  }));
}

async function confirmarEscrituras(env, escrituras, token) {
  const solicitud = await fetch(`${raizFirestore(env)}:commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ writes: escrituras }),
  });
  if (!solicitud.ok) throw new Error(`Firestore COMMIT ${solicitud.status}: ${(await solicitud.text()).slice(0, 180)}`);
}

function nombreDocumento(env, ruta) {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${ruta}`;
}

export function analizarAttlog(cuerpo) {
  return cuerpo.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).map((linea) => {
    const partes = linea.split("\t");
    if (partes[0]?.toUpperCase() === "ATTLOG") partes.shift();
    if (partes.length < 2) return null;
    const [pin, fechaHora, estado = "0", verificacion = "0", codigoTrabajo = "0"] = partes;
    const coincidencia = texto(fechaHora).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
    if (!texto(pin) || !coincidencia) return null;
    return { pin: texto(pin), fecha: coincidencia[1], hora: coincidencia[2], estado: texto(estado), verificacion: texto(verificacion), codigoTrabajo: texto(codigoTrabajo), crudo: linea };
  }).filter(Boolean);
}

export function analizarUsuariosReloj(cuerpo) {
  return cuerpo.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).map((linea) => {
    if (!/\b(?:USER|USERINFO)\b/i.test(linea) || !/\bPIN=/i.test(linea)) return null;
    const pin = linea.match(/\bPIN=([^\t\s]+)/i)?.[1] || "";
    const nombre = linea.match(/\bName=(.*?)(?=\t[A-Za-z][A-Za-z0-9_]*=|\s+(?:Pri|Passwd|Card|Grp|TZ|Verify|ViceCard)=|$)/i)?.[1] || "";
    if (!texto(pin)) return null;
    return { pin:texto(pin), nombre:texto(nombre), crudo:linea.slice(0, 500) };
  }).filter(Boolean);
}

export function opcionesDispositivo(serial) {
  return `GET OPTION FROM: ${texto(serial)}\nATTLOGStamp=0\nOPERLOGStamp=0\nATTPHOTOStamp=0\nErrorDelay=${INTERVALO_COMANDOS_SEGUNDOS}\nDelay=${INTERVALO_COMANDOS_SEGUNDOS}\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=TransData AttLog\nRealtime=1\nEncrypt=0`;
}

function tipoDesdeEstado(estado) {
  return ({ "0": "ENTRADA", "1": "SALIDA", "2": "INICIO_REFRIGERIO", "3": "FIN_REFRIGERIO", "4": "ENTRADA", "5": "SALIDA" })[estado] || "SIN_CLASIFICAR";
}

async function hashCorto(valor) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fechaMilisegundos(valor) {
  const fecha = Date.parse(valor || "");
  return Number.isFinite(fecha) ? fecha : 0;
}

function idVinculo(serial, pin) {
  return encodeURIComponent(`${serial}__${pin}`);
}

function normalizarPin(pin) {
  const valor = texto(pin);
  if (!/^\d+$/.test(valor)) return valor;
  return valor.replace(/^0+(?=\d)/, "");
}

async function procesarMarcaciones(request, env, url) {
  const serial = texto(url.searchParams.get("SN"));
  if (!serial || serial.length > 80) return respuesta("ERROR: SN", 400);
  const cuerpo = await request.text();
  const eventos = analizarAttlog(cuerpo);
  if (!eventos.length) return respuesta("OK: 0");
  const token = await tokenServicio(env);
  const reloj = await obtenerDocumento(env, `relojesBiometricos/${encodeURIComponent(serial)}`, token);
  if (!reloj || reloj.estado !== "ACTIVO" || !reloj.empresaId) return respuesta("ERROR: DEVICE", 403);
  // Firestore admite hasta 500 escrituras por commit. Reservamos una para
  // actualizar el estado del reloj y mantenemos margen para futuros campos.
  const eventosLimitados = eventos.slice(0, 400);
  const rutasVinculos = [...new Set(eventosLimitados.flatMap((evento) => {
    const normalizado = normalizarPin(evento.pin);
    return normalizado === evento.pin
      ? [`vinculosReloj/${idVinculo(serial, evento.pin)}`]
      : [`vinculosReloj/${idVinculo(serial, normalizado)}`, `vinculosReloj/${idVinculo(serial, evento.pin)}`];
  }))];
  const vinculos = await obtenerDocumentos(env, rutasVinculos, token);
  const escrituras = [];
  for (const evento of eventosLimitados) {
    const vinculo = vinculos.get(idVinculo(serial, normalizarPin(evento.pin))) || vinculos.get(idVinculo(serial, evento.pin));
    const clave = await hashCorto(`${serial}|${evento.pin}|${evento.fecha}|${evento.hora}|${evento.estado}`);
    if (!vinculo || vinculo.estado !== "ACTIVO" || vinculo.empresaId !== reloj.empresaId || !vinculo.colaboradorId) {
      escrituras.push({ update: { name: nombreDocumento(env, `marcacionesRelojPendientes/${clave}`), fields: codificarCampos({ empresaId: reloj.empresaId, relojSerial: serial, relojNombre: reloj.nombre || "Reloj ZKTeco", pin: evento.pin, fecha: evento.fecha, hora: evento.hora, estadoReloj: evento.estado, motivo: "PIN_NO_VINCULADO", recibidoEn: new Date() }) } });
      continue;
    }
    const fechaHora = new Date(`${evento.fecha}T${evento.hora}-05:00`);
    if (Number.isNaN(fechaHora.getTime())) continue;
    const datos = { empresaId: reloj.empresaId, colaboradorId: vinculo.colaboradorId, colaboradorNombre: vinculo.colaboradorNombre || "", colaboradorDocumento: vinculo.colaboradorDocumento || null, sucursalId: reloj.sucursalId || vinculo.sucursalId || null, fecha: evento.fecha, hora: evento.hora, fechaHora, fechaHoraISO: fechaHora.toISOString(), tipo: tipoDesdeEstado(evento.estado), tipoOriginal: "RELOJ_ZKTECO", tipoInterpretado: tipoDesdeEstado(evento.estado), origen: "RELOJ_ZKTECO", estado: "VALIDA", relojSerial: serial, relojNombre: reloj.nombre || "Reloj ZKTeco", pinReloj: evento.pin, estadoReloj: evento.estado, metodoValidacionReloj: evento.verificacion, codigoTrabajoReloj: evento.codigoTrabajo, creadoEn: new Date() };
    escrituras.push({ update: { name: nombreDocumento(env, `marcaciones/ZK_${clave}`), fields: codificarCampos(datos) } });
  }
  escrituras.push({ update: { name: nombreDocumento(env, `relojesBiometricos/${encodeURIComponent(serial)}`), fields: codificarCampos({ ultimaMarcacionEn: new Date(), ultimaConexionEn: new Date(), ultimoLoteRecibido: eventos.length, actualizadoPorReceptor: true }) }, updateMask: { fieldPaths: ["ultimaMarcacionEn", "ultimaConexionEn", "ultimoLoteRecibido", "actualizadoPorReceptor"] } });
  if (escrituras.length) await confirmarEscrituras(env, escrituras, token);
  return respuesta(`OK: ${eventosLimitados.length}`);
}

async function procesarUsuariosReloj(request, env, url, cuerpo) {
  const serial = texto(url.searchParams.get("SN"));
  if (!serial || serial.length > 80) return respuesta("ERROR: SN", 400);
  const usuarios = analizarUsuariosReloj(cuerpo).slice(0, 400);
  if (!usuarios.length) return null;
  const token = await tokenServicio(env);
  const reloj = await obtenerDocumento(env, `relojesBiometricos/${encodeURIComponent(serial)}`, token);
  if (!reloj || reloj.estado !== "ACTIVO" || !reloj.empresaId) return respuesta("ERROR: DEVICE", 403);
  const ahora = new Date();
  const escrituras = [];
  for (const usuario of usuarios) {
    const clave = await hashCorto(`${serial}|${usuario.pin}`);
    escrituras.push({ update:{ name:nombreDocumento(env, `usuariosRelojDetectados/${clave}`), fields:codificarCampos({ empresaId:reloj.empresaId, relojSerial:serial, relojNombre:reloj.nombre || "Reloj ZKTeco", pin:usuario.pin, nombre:usuario.nombre, estadoImportacion:"PENDIENTE", detectadoEn:ahora }) } });
  }
  escrituras.push({ update:{ name:nombreDocumento(env, `relojesBiometricos/${encodeURIComponent(serial)}`), fields:codificarCampos({ ultimaLecturaUsuariosEn:ahora, ultimaConexionEn:ahora, usuariosDetectados:usuarios.length }) }, updateMask:{ fieldPaths:["ultimaLecturaUsuariosEn", "ultimaConexionEn", "usuariosDetectados"] } });
  await confirmarEscrituras(env, escrituras, token);
  return respuesta(`OK: ${usuarios.length}`);
}

async function entregarComandoPendiente(env, url) {
  const serial = texto(url.searchParams.get("SN"));
  if (!serial || serial.length > 80) return respuesta("ERROR: SN", 400);
  const token = await tokenServicio(env);
  const ruta = `relojesBiometricos/${encodeURIComponent(serial)}`;
  const reloj = await obtenerDocumento(env, ruta, token);
  if (!reloj || reloj.estado !== "ACTIVO") return respuesta("OK");
  const comandos = Array.isArray(reloj.comandosPendientes) ? reloj.comandosPendientes.filter((item) => typeof item === "string" && item.startsWith("C:")) : [];
  const ahora = new Date();
  const registrarPresencia = ahora.getTime() - fechaMilisegundos(reloj.ultimaConexionEn) >= INTERVALO_PRESENCIA_MS;
  if (!comandos.length && !registrarPresencia) return respuesta("OK");
  const [comando, ...restantes] = comandos;
  const datos = comando
    ? { comandosPendientes: restantes, ultimoComandoEnviado: comando.slice(0, 160), ultimoComandoEnviadoEn: ahora, ultimaConexionEn: ahora }
    : { ultimaConexionEn: ahora };
  await confirmarEscrituras(env, [{
    update: { name: nombreDocumento(env, ruta), fields: codificarCampos(datos) },
    updateMask: { fieldPaths: Object.keys(datos) },
  }], token);
  return respuesta(comando || "OK");
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/salud") return Response.json({ ok: true, servicio: "ZKTeco ADMS", fecha: new Date().toISOString() });
      if (!url.pathname.startsWith("/iclock/")) return respuesta("ZKTeco ADMS receptor");
      if (url.pathname === "/iclock/cdata" && request.method === "POST") {
        const cuerpo = await request.text();
        const respuestaUsuarios = await procesarUsuariosReloj(new Request(request.url, { method:"POST", body:cuerpo }), env, url, cuerpo);
        if (respuestaUsuarios) return respuestaUsuarios;
        return procesarMarcaciones(new Request(request.url, { method:"POST", body:cuerpo }), env, url);
      }
      // El reloj seguirá enviando marcaciones inmediatamente mediante
      // Realtime=1. Solo reducimos la frecuencia con la que pregunta si hay
      // órdenes administrativas pendientes (alta u obtención de usuarios).
      if (url.pathname === "/iclock/cdata" && request.method === "GET") return respuesta(opcionesDispositivo(url.searchParams.get("SN")));
      if (url.pathname === "/iclock/getrequest" && request.method === "GET") return entregarComandoPendiente(env, url);
      if (["/iclock/getrequest", "/iclock/devicecmd", "/iclock/ping", "/iclock/test"].includes(url.pathname)) return respuesta("OK");
      return respuesta("OK");
    } catch (error) {
      console.error("ADMS_ERROR", error?.message || error);
      return respuesta("ERROR", 500);
    }
  },
};
