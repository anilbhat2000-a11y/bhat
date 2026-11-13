import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// One client per process, created on first use. Importing this module never connects,
// so `next build` can load routes without a database.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let instance: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (instance) return instance;
  if (globalForPrisma.prisma) {
    instance = globalForPrisma.prisma;
    return instance;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  instance = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  // Keep one client across hot reloads in development.
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = instance;
  return instance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
