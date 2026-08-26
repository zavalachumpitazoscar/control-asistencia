import assert from "node:assert/strict";
import { analizarAttlog, analizarUsuariosReloj } from "../src/index.js";

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
