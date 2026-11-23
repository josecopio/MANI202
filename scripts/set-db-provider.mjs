// Rewrites the `provider` of the datasource block in prisma/schema.prisma from the
// DATABASE_URL scheme, so the same schema serves SQLite (dev) and PostgreSQL (prod).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile(name) {
  const file = resolve(root, name);
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

const url =
  process.env.DATABASE_URL ||
  readEnvFile(".env.local").DATABASE_URL ||
  readEnvFile(".env").DATABASE_URL ||
  "";

// DATABASE_PROVIDER wins when set (e.g. on Render, so the build never depends on the
// database URL being visible at build time); otherwise the URL scheme decides.
const forced = (process.env.DATABASE_PROVIDER || "").toLowerCase();
if (forced && forced !== "postgresql" && forced !== "sqlite") {
  console.error(`[set-db-provider] DATABASE_PROVIDER must be "postgresql" or "sqlite", got "${forced}".`);
  process.exit(1);
}
if (!url && !forced) {
  console.log("[set-db-provider] DATABASE_URL not set; leaving schema provider unchanged.");
  process.exit(0);
}

const provider = forced || (/^postgres(ql)?:\/\//i.test(url) ? "postgresql" : "sqlite");
const schemaPath = resolve(root, "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[a-z]+"/,
  `$1"${provider}"`,
);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[set-db-provider] datasource provider set to "${provider}".`);
} else {
  console.log(`[set-db-provider] datasource provider already "${provider}".`);
}
