import { it, expect } from "vitest";
import { verificationView } from "./verify";
import { makeVerificationCode } from "./code";

const cert = {
  holderName: "Priya Rao",
  subject: "Networking",
  level: "ADVANCED" as const,
  issuedAt: new Date("2026-01-01T00:00:00Z"),
  expiresAt: new Date("2027-01-01T00:00:00Z"),
};

it("a current certificate verifies as valid, with name, subject, level, and dates only", () => {
  const v = verificationView(cert, new Date("2026-06-01T00:00:00Z"));
  expect(v).toEqual({ valid: true, ...cert });
  expect(v).not.toHaveProperty("score");
  expect(v).not.toHaveProperty("scorePercent");
});

it("expiry at exactly now is not valid (Review Focus 1)", () => {
  expect(verificationView(cert, new Date("2027-01-01T00:00:00Z")).valid).toBe(false);
});

it("verification codes are 12 characters from the unambiguous alphabet", () => {
  for (let i = 0; i < 50; i++) {
    const code = makeVerificationCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  }
});

it("a fixed rng gives a fixed code", () => {
  expect(makeVerificationCode(() => 0)).toBe("AAAAAAAAAAAA");
});
