import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { createInstructor } from "./instructors";

const tag = `instr-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
const employee: SessionUser = { id: "", role: "EMPLOYEE", active: true, name: "E", email: "", department: null };

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  employee.id = (await prisma.user.create({ data: { name: "E", email: `${tag}-e@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
});

afterAll(async () => {
  await prisma.instructor.deleteMany({ where: { name: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("an admin adds an instructor with a location and a list of expertise", async () => {
  const r = await createInstructor(admin, { name: `${tag} Priya`, bio: "Network architect", location: "Pune, India", expertise: "Networking, Cloud , Cyber Security" });
  expect(r.ok).toBe(true);
  const row = await prisma.instructor.findFirst({ where: { name: `${tag} Priya` } });
  expect(row?.expertise).toEqual(["Networking", "Cloud", "Cyber Security"]);
  expect(row?.location).toBe("Pune, India");
});

it("the name is required", async () => {
  const r = await createInstructor(admin, { name: "  ", bio: "", location: "", expertise: "" });
  expect(r.ok).toBe(false);
});

it("only an admin can add an instructor", async () => {
  await expect(createInstructor(employee, { name: `${tag} X`, bio: "", location: "", expertise: "" })).rejects.toMatchObject({ status: 403 });
});
