import { it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

it("hashes with bcrypt cost 12 and verifies only the right password", async () => {
  const h = await hashPassword("S3cret-pass");
  expect(h).not.toBe("S3cret-pass");
  expect(h).toMatch(/^\$2[aby]\$12\$/);
  expect(await verifyPassword("S3cret-pass", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
});
