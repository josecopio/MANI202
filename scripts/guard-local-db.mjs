// Stops `npm run db:push` and `npm run db:reset` from running against a PostgreSQL database.
// PostgreSQL databases here are shared (the Supabase database behind the test site, used by
// the whole team) and change only through migrations (`npm run db:deploy`); `db push` would
// bypass them and `db:reset` would wipe everybody's data. Those two commands are for the local
// SQLite file. On a throwaway PostgreSQL database, set ALLOW_DB_PUSH=1 to run them anyway.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile(name) {
  const file = resolve(root, name);
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

// Same lookup order as scripts/set-db-provider.mjs and Prisma.
const url = process.env.DATABASE_URL || readEnvFile(".env.local").DATABASE_URL || readEnvFile(".env").DATABASE_URL || "";

if (/^postgres(ql)?:\/\//i.test(url) && process.env.ALLOW_DB_PUSH !== "1") {
  console.error(
    [
      "[guard-local-db] DATABASE_URL points at PostgreSQL (the shared Supabase database?).",
      "  db:push and db:reset only run against the local SQLite file (DATABASE_URL=\"file:./dev.db\").",
      "  Shared databases change through migrations: npm run db:deploy (see README, \"Shared database on Supabase\").",
      "  On a throwaway PostgreSQL database, run it with ALLOW_DB_PUSH=1.",
    ].join("\n"),
  );
  process.exit(1);
}
