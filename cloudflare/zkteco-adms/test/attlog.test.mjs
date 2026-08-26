import assert from "node:assert/strict";
import { analizarAttlog, analizarUsuariosReloj, analizarBiometriaReloj, opcionesDispositivo } from "../src/index.js";

const eventos = analizarAttlog([
  "15\t2026-08-25 08:01:30\t0\t1\t0\t0\t0",
  "15\t2026-08-25 17:32:10\t1\t1\t0\t0\t0",
].join("\n"));

assert.equal(eventos.length, 2);
assert.deepEqual(eventos[0], {
  pin: "15",
  fecha: "2026-08-25",
  hora: "08:01:30",
  estado: "0",
  verificacion: "1",
  codigoTrabajo: "0",
  crudo: "15\t2026-08-25 08:01:30\t0\t1\t0\t0\t0",
});
assert.equal(analizarAttlog("contenido inválido").length, 0);
console.log("ATTLOG parser: OK");

const usuarios = analizarUsuariosReloj("USER PIN=1536150\tName=Usuario Prueba\tPri=0\tCard=\nUSER PIN=70452743\tName=Otro Usuario\tPri=0");
assert.equal(usuarios.length, 2);
assert.equal(usuarios[0].pin, "1536150");
assert.equal(usuarios[0].nombre, "Usuario Prueba");
console.log("USERINFO parser: OK");

const opciones = opcionesDispositivo("SPK7242200451");
assert.match(opciones, /Delay=30/);
assert.match(opciones, /ErrorDelay=30/);
assert.match(opciones, /Realtime=1/);
assert.match(opciones, /TransInterval=1/);
console.log("ADMS polling optimizado: OK");

const credenciales = analizarUsuariosReloj("USER PIN=1536150\tName=Usuario Prueba\tPri=14\tPasswd=1234\tCard=99\tVerify=1");
assert.equal(credenciales[0].tienePassword, true);
assert.equal(credenciales[0].tieneTarjeta, true);
assert.equal(credenciales[0].privilegio, "14");

const biometria = analizarBiometriaReloj("FP PIN=1536150\tFID=0\nFP PIN=1536150\tFID=1\nFACE PIN=1536150\tFID=0");
assert.deepEqual(biometria[0], { pin:"1536150", huellas:2, rostros:1 });
console.log("Metadatos biométricos: OK");
