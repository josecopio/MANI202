/**
 * Copies every row from one PostgreSQL database into another: used once to move the test site
 * from its Render database to Supabase without losing what testers created.
 *
 * `npm run start:render` runs it at every start, but it only acts when COPY_FROM_DATABASE_URL is
 * set, points at another database than DATABASE_URL, and the target is still empty (freshly
 * migrated). The source is only read, and the copy is a single transaction on the target: it
 * lands completely or not at all, so a failed start can simply be retried.
 *
 *   COPY_FROM_DATABASE_URL=postgresql://old… DATABASE_URL=postgresql://new… npx tsx scripts/copy-db.ts
 */
import { PrismaClient } from "@prisma/client";

// Parents before children, so every foreign key points at a row that is already there.
const TABLES = [
  "user",
  "account",
  "session",
  "verificationToken",
  "category",
  "house",
  "venue",
  "event",
  "interest",
  "subscriber",
  "pushSubscription",
  "upload",
] as const;
type Table = (typeof TABLES)[number];

type Row = Record<string, unknown>;
type Delegate = {
  count(): Promise<number>;
  findMany(): Promise<Row[]>;
  createMany(args: { data: Row[] }): Promise<{ count: number }>;
};
const table = (client: unknown, name: Table) => (client as Record<Table, Delegate>)[name];

/** Same server, port and database name (credentials and query parameters aside). */
function sameDatabase(a: string, b: string) {
  if (a === b) return true;
  try {
    const [x, y] = [new URL(a), new URL(b)];
    return x.hostname === y.hostname && (x.port || "5432") === (y.port || "5432") && x.pathname === y.pathname;
  } catch {
    return false;
  }
}

async function countAll(client: PrismaClient) {
  const counts = await Promise.all(TABLES.map((name) => table(client, name).count()));
  return counts.reduce((sum, n) => sum + n, 0);
}

async function main() {
  const from = process.env.COPY_FROM_DATABASE_URL;
  const to = process.env.DATABASE_URL;
  if (!from) return;
  if (!to) throw new Error("DATABASE_URL is not set.");
  if (sameDatabase(from, to)) {
    console.log("[copy-db] COPY_FROM_DATABASE_URL is the current database: nothing to copy.");
    return;
  }

  const target = new PrismaClient({ datasourceUrl: to });
  const source = new PrismaClient({ datasourceUrl: from });
  try {
    const existing = await countAll(target);
    if (existing > 0) {
      console.log(`[copy-db] The target database already holds ${existing} row(s): copy skipped.`);
      return;
    }

    const copied = {} as Record<Table, number>;
    await target.$transaction(
      async (tx) => {
        for (const name of TABLES) {
          const rows = await table(source, name).findMany();
          // Small batches: upload rows carry whole images.
          const size = name === "upload" ? 10 : 200;
          for (let i = 0; i < rows.length; i += size) {
            await table(tx, name).createMany({ data: rows.slice(i, i + size) });
          }
          copied[name] = rows.length;
        }
      },
      { maxWait: 30_000, timeout: 10 * 60_000 },
    );

    for (const name of TABLES) {
      const n = await table(target, name).count();
      if (n !== copied[name]) throw new Error(`[copy-db] ${name}: ${copied[name]} row(s) copied but ${n} found afterwards.`);
    }
    console.log(`[copy-db] Copied into the new database: ${TABLES.map((name) => `${name} ${copied[name]}`).join(", ")}.`);
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
