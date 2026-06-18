import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Authenticated symmetric encryption for secrets at rest (Salesforce tokens,
// third-party API keys). Uses Node's built-in crypto — no external dependency.
//
// Format: "f1:" + base64( iv(12) | authTag(16) | ciphertext )
// The "f1:" marker lets us distinguish our ciphertext from legacy plaintext,
// enabling a zero-downtime migration (see decrypt()).

const MARKER = "f1:";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const source = process.env.ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!source) {
    throw new Error("ENCRYPTION_KEY or SESSION_SECRET is required to encrypt/decrypt secrets");
  }
  // Derive a stable 32-byte key. Static salt is fine here: the salt only needs
  // to be constant so the same source yields the same key across restarts.
  cachedKey = scryptSync(source, "f42-enc-v1", 32);
  return cachedKey;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(MARKER);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return MARKER + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decrypt(value: string): string {
  // Legacy plaintext passthrough — values written before encryption was added
  // (or any non-marked value) are returned unchanged so reads never break.
  if (!isEncrypted(value)) return value;

  const raw = Buffer.from(value.slice(MARKER.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
