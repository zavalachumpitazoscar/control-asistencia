import assert from "node:assert/strict";
import { analizarAttlog } from "../src/index.js";

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
