import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { createSubject, deleteSubject, updateSubject } from "./users";

const tag = `subj-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
});
afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
  await prisma.course.deleteMany({ where: { subject: { name: { startsWith: tag } } } });
  await prisma.subject.deleteMany({ where: { name: { startsWith: tag } } });
  await prisma.user.delete({ where: { id: admin.id } });
  await prisma.$disconnect();
});

it("checks names and validity, refuses duplicates, and deletes only unused subjects", async () => {
  expect(await createSubject(admin, { name: "  ", category: "TECHNICAL", certificationValidityMonths: 12 })).toMatchObject({ ok: false, error: "Enter a subject name" });
  expect(await createSubject(admin, { name: `${tag} A`, category: "TECHNICAL", certificationValidityMonths: 0 })).toMatchObject({ ok: false });
  const a = await createSubject(admin, { name: `${tag} A`, category: "TECHNICAL", certificationValidityMonths: 12 });
  const b = await createSubject(admin, { name: `${tag} B`, category: "BUSINESS", certificationValidityMonths: 24 });
  if (!a.ok || !b.ok) throw new Error("create failed");
  expect(await createSubject(admin, { name: `${tag} a`.toUpperCase(), category: "TECHNICAL", certificationValidityMonths: 12 })).toMatchObject({ ok: false, error: expect.stringContaining("already exists") });
  expect(await updateSubject(admin, b.id!, { name: `${tag} A` })).toMatchObject({ ok: false, error: expect.stringContaining("already exists") });
  expect(await updateSubject(admin, b.id!, { name: `${tag} B2`, certificationValidityMonths: 36 })).toMatchObject({ ok: true });
  expect((await prisma.subject.findUniqueOrThrow({ where: { id: b.id! } })).certificationValidityMonths).toBe(36);

  await prisma.course.create({ data: { subjectId: a.id!, title: `${tag} c`, level: "BASIC", passMarkPercent: 70 } });
  expect(await deleteSubject(admin, a.id!)).toMatchObject({ ok: false, error: expect.stringContaining("in use") });
  expect(await deleteSubject(admin, b.id!)).toMatchObject({ ok: true });
  expect(await prisma.subject.findUnique({ where: { id: b.id! } })).toBeNull();
});
