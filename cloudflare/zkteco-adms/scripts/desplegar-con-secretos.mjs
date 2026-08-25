import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const nombres = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const faltantes = nombres.filter((nombre) => !process.env[nombre]);

if (faltantes.length) {
  console.error(`Faltan Build Secrets requeridos: ${faltantes.join(", ")}`);
  process.exit(1);
}

const directorio = mkdtempSync(join(tmpdir(), "zkteco-secrets-"));
const archivo = join(directorio, "secrets.json");

try {
  writeFileSync(archivo, JSON.stringify({
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  }), { mode: 0o600 });

  const resultado = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["wrangler", "deploy", "--secrets-file", archivo],
    { stdio: "inherit" },
  );

  if (resultado.error) throw resultado.error;
  process.exitCode = resultado.status ?? 1;
} finally {
  rmSync(directorio, { recursive: true, force: true });
}
