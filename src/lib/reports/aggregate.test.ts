import { it, expect } from "vitest";
import { certsBySubject, passRateByDepartment, toCsv, latestPerPerson } from "./aggregate";

const now = new Date("2026-06-01T00:00:00Z");

it("counts active and expired certifications per subject, by level", () => {
  const rows = certsBySubject(
    [
      { subject: "Networking", level: "BASIC", expiresAt: new Date("2027-01-01Z") },
      { subject: "Networking", level: "ADVANCED", expiresAt: new Date("2026-01-01Z") },
    ],
    now,
  );
  expect(rows).toEqual([
    { subject: "Networking", byLevel: { BASIC: 1, INTERMEDIATE: 0, ADVANCED: 1 }, active: 1, expired: 1 },
  ]);
});

it("pass rate by department is a percentage to one decimal place", () => {
  const rates = passRateByDepartment([
    { department: "Sales", passed: true },
    { department: "Sales", passed: false },
    { department: "Sales", passed: false },
  ]);
  expect(rates).toEqual([{ department: "Sales", rate: 33.3 }]);
});

it("CSV quotes fields with commas and doubles embedded quotes", () => {
  const csv = toCsv([{ name: "Rao, Priya", note: 'said "hi"' }]);
  expect(csv).toBe('name,note\r\n"Rao, Priya","said ""hi"""\r\n');
});

it("CSV of no rows is an empty string", () => {
  expect(toCsv([])).toBe("");
  expect(toCsv([], ["name", "email"])).toBe("name,email\r\n");
});

it("counts each person once per subject and level, using their latest certificate", () => {
  const rows = latestPerPerson([
    { userId: "u1", subject: "Networking", level: "BASIC", issuedAt: new Date("2026-01-01Z"), expiresAt: new Date("2027-01-01Z") },
    { userId: "u1", subject: "Networking", level: "BASIC", issuedAt: new Date("2026-06-01Z"), expiresAt: new Date("2027-06-01Z") },
    { userId: "u2", subject: "Networking", level: "BASIC", issuedAt: new Date("2026-02-01Z"), expiresAt: new Date("2027-02-01Z") },
  ]);
  expect(rows).toHaveLength(2);
  expect(rows.find((r) => r.userId === "u1")?.expiresAt.toISOString()).toBe("2027-06-01T00:00:00.000Z");
});
