import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../db/client";
import { clearLoginFailures, isLoginBlocked, loginKeys, MAX_FAILURES, recordLoginFailure, WINDOW_MS } from "./rate-limit";

describe("login rate limit", () => {
  const email = `rl-${Date.now()}@example.test`;
  const ip = `10.9.${Date.now() % 250}.1`;
  const keys = loginKeys(email, ip);

  afterAll(async () => {
    await prisma.loginFailure.deleteMany({ where: { key: { in: keys } } });
    await prisma.$disconnect();
  });

  it("keys the email in lower case and the IP when known", () => {
    expect(loginKeys(" A@B.Test ", "1.2.3.4")).toEqual(["email:a@b.test", "ip:1.2.3.4"]);
    expect(loginKeys("a@b.test", null)).toEqual(["email:a@b.test"]);
  });

  it("blocks after the limit of failures for one email, and not before", async () => {
    const now = new Date();
    for (let i = 0; i < MAX_FAILURES - 1; i++) await recordLoginFailure([keys[0]], now);
    expect(await isLoginBlocked([keys[0]], now)).toBe(false);
    await recordLoginFailure([keys[0]], now);
    expect(await isLoginBlocked([keys[0]], now)).toBe(true);
  });

  it("unblocks once the window has passed", async () => {
    const later = new Date(Date.now() + WINDOW_MS + 1000);
    expect(await isLoginBlocked([keys[0]], later)).toBe(false);
  });

  it("clears the email count after a successful sign-in", async () => {
    await clearLoginFailures(email);
    expect(await isLoginBlocked([keys[0]])).toBe(false);
  });

  it("allows more failures from one IP than from one email", async () => {
    const now = new Date();
    for (let i = 0; i < MAX_FAILURES; i++) await recordLoginFailure([keys[1]], now);
    expect(await isLoginBlocked([keys[1]], now)).toBe(false);
  });
});
