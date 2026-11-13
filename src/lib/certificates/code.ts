import { randomInt } from "node:crypto";

// 12 characters, no 0, O, 1, or I, so codes read clearly when typed by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeVerificationCode(rng?: () => number): string {
  let code = "";
  for (let i = 0; i < 12; i++) {
    const index = rng ? Math.floor(rng() * ALPHABET.length) : randomInt(ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}
