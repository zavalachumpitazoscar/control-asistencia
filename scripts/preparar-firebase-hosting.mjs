import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const salida = join(raiz, ".firebase-hosting");

const archivosPublicos = [
  "index.html",
  "inicio.html",
  "movil.html",
  "registro.html",
  "superadmin.html",
];

const carpetasPublicas = ["css", "img", "js", "vistas"];

await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });

for (const archivo of archivosPublicos) {
  await cp(join(raiz, archivo), join(salida, archivo));
}

for (const carpeta of carpetasPublicas) {
  await cp(join(raiz, carpeta), join(salida, carpeta), { recursive: true });
}

const publicados = await readdir(salida);
console.log(`Firebase Hosting preparado: ${publicados.join(", ")}`);
