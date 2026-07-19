import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";

/**
 * Application-level AES-256-GCM for individual sensitive columns (bank account
 * numbers today; medical notes and national IDs can follow).
 *
 * GCM gives authenticated encryption, so tampering is detected on read rather
 * than silently returning corrupt plaintext. The stored format is versioned so
 * the scheme can be rotated later without a migration.
 */
const KEY = createHash("sha256").update(env.ENCRYPTION_KEY).digest();
const IV_BYTES = 12;
const PREFIX = "v1";

export function encryptField(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptField(value: string): string {
  // Values written before encryption was enabled are returned as-is.
  if (!value.startsWith(`${PREFIX}.`)) return value;

  const [, ivPart, tagPart, dataPart] = value.split(".");
  if (!ivPart || !tagPart || !dataPart) return "";

  try {
    const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivPart, "base64"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext — never surface partial plaintext.
    return "";
  }
}

/** Masks all but the last four characters, e.g. "••••••4821". */
export function maskTail(value: string, visible = 4): string {
  if (value.length <= visible) return "•".repeat(value.length);
  return "•".repeat(value.length - visible) + value.slice(-visible);
}
