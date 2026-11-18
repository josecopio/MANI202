/**
 * Usage: npm run make-admin -- someone@ciup.fr [--revoke]
 * Creates the user if needed (they can then sign in with a magic link) and sets role = ADMIN.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Usage: npm run make-admin -- someone@example.org [--revoke]");
    process.exit(1);
  }
  const role = revoke ? "ORGANISER" : "ADMIN";
  const user = await db.user.upsert({
    where: { email },
    update: { role },
    create: { email, role },
  });
  console.log(`${user.email} is now ${user.role}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
