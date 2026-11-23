import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// One client per process, in every environment: in development it survives hot reloads, and in
// production it stops each separately bundled copy of this module (pages, route handlers…) from
// opening its own connection pool, which matters on small instances and capped databases.
export const db = (globalForPrisma.prisma ??= new PrismaClient());
