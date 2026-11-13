import { it, expect } from "vitest";
import { cookieSecure } from "./cookie";

it("is secure in production by default, and can be turned off for plain HTTP", () => {
  expect(cookieSecure({ NODE_ENV: "production" })).toBe(true);
  expect(cookieSecure({ NODE_ENV: "production", COOKIE_SECURE: "false" })).toBe(false);
  expect(cookieSecure({ NODE_ENV: "development" })).toBe(false);
  expect(cookieSecure({ NODE_ENV: "production", COOKIE_SECURE: "true" })).toBe(true);
});
