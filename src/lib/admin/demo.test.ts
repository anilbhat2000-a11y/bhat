import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import { runSeed } from "../seed/run";
import { createAdmin, deactivateDemoAccounts, DEMO_EMAILS } from "./demo";

const tag = `demo-${Date.now()}`;
const realAdmin = `${tag}@company.test`;
let otherAdmins: string[] = [];

beforeAll(async () => {
  await runSeed(prisma, { seedPassword: "Demo-pass-1", contentDir: "content/courses" });
  await prisma.user.updateMany({ where: { email: { in: DEMO_EMAILS } }, data: { active: true } });
  // Hide any other active admins in the shared test database, so the guard is tested alone.
  otherAdmins = (await prisma.user.findMany({ where: { role: "ADMIN", active: true, email: { notIn: DEMO_EMAILS } }, select: { id: true } })).map((u) => u.id);
  await prisma.user.updateMany({ where: { id: { in: otherAdmins } }, data: { active: false } });
});

afterAll(async () => {
  await prisma.user.updateMany({ where: { id: { in: otherAdmins } }, data: { active: true } });
  await prisma.user.updateMany({ where: { email: { in: DEMO_EMAILS } }, data: { active: true } });
  await prisma.user.deleteMany({ where: { email: realAdmin } });
  await prisma.$disconnect();
});

it("refuses to deactivate the demo accounts while no real admin exists", async () => {
  expect(await deactivateDemoAccounts(prisma)).toMatchObject({ ok: false, error: expect.stringContaining("No real admin") });
  expect(await prisma.user.count({ where: { email: { in: DEMO_EMAILS }, active: true } })).toBe(6);
});

it("creates a real admin, checking the email and password", async () => {
  expect(await createAdmin(prisma, { name: "Real Admin", email: "admin@3c.example", password: "a-long-password-1" })).toMatchObject({ ok: false });
  expect(await createAdmin(prisma, { name: "Real Admin", email: realAdmin, password: "short" })).toMatchObject({ ok: false });
  expect(await createAdmin(prisma, { name: "Real Admin", email: realAdmin, password: "a-long-password-1" })).toEqual({ ok: true, created: true });
});

it("then deactivates all six demo accounts, ends their sessions, and logs it", async () => {
  const demoAdmin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@3c.example" } });
  await prisma.session.create({ data: { id: `${tag}-session`, userId: demoAdmin.id, expiresAt: new Date(Date.now() + 3600_000) } });
  const r = await deactivateDemoAccounts(prisma);
  expect(r.ok && r.deactivated.sort()).toEqual([...DEMO_EMAILS].sort());
  expect(await prisma.user.count({ where: { email: { in: DEMO_EMAILS }, active: true } })).toBe(0);
  expect(await prisma.session.count({ where: { userId: demoAdmin.id } })).toBe(0);
  expect(await prisma.auditEvent.count({ where: { entityId: demoAdmin.id, action: "user.deactivate" } })).toBeGreaterThan(0);
  expect(await deactivateDemoAccounts(prisma)).toEqual({ ok: true, deactivated: [] });
});

it("re-running the seed leaves them deactivated", async () => {
  await runSeed(prisma, { seedPassword: "Demo-pass-1", contentDir: "content/courses" });
  expect(await prisma.user.count({ where: { email: { in: DEMO_EMAILS }, active: true } })).toBe(0);
});
