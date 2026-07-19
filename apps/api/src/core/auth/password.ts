import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { env } from "../config/env";

// Ambiguous characters (O/0, l/1) omitted so codes can be read aloud reliably.
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*";

/**
 * Cryptographically random temporary password that satisfies the policy.
 * Issued on user creation; the account is flagged mustChangePassword.
 */
export function generateTemporaryPassword(length = 14): string {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [
    UPPER[randomInt(UPPER.length)] as string,
    LOWER[randomInt(LOWER.length)] as string,
    DIGITS[randomInt(DIGITS.length)] as string,
    SYMBOLS[randomInt(SYMBOLS.length)] as string,
  ];
  while (chars.length < length) chars.push(all[randomInt(all.length)] as string);

  // Fisher-Yates, so the guaranteed character classes aren't always leading.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars.join("");
}

/** Hash a plaintext password with the configured bcrypt cost. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_COST);
}

/** Constant-time comparison of a plaintext password against a stored hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
