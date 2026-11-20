import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Encrypts small secrets stored in the database (the SMTP password) with AES-256-GCM. The
// key comes from SETTINGS_SECRET, or from CRON_SECRET (always set in .env). A database
// backup on its own therefore does not reveal the password. If the secret in .env changes,
// stored secrets can no longer be read and must be entered again.
function key(env: Record<string, string | undefined> = process.env): Buffer {
  const material = env.SETTINGS_SECRET?.trim() || env.CRON_SECRET?.trim();
  if (!material) throw new Error("Set SETTINGS_SECRET or CRON_SECRET in .env to store secrets");
  return createHash("sha256").update(`lms-settings:${material}`).digest();
}

export function encryptSecret(plain: string, env?: Record<string, string | undefined>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(env), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(stored: string, env?: Record<string, string | undefined>): string | null {
  const [v, iv, tag, data] = stored.split(":");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(env), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
