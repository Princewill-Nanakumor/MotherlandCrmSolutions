import crypto from "crypto";

/**
 * Reversible password storage for the admin "view agent password" feature.
 *
 * IMPORTANT: This is intentionally reversible (AES-256-GCM) so an admin can
 * recover and re-share an agent's password. It is NOT a replacement for the
 * bcrypt hash used for authentication — the bcrypt hash remains the source of
 * truth for login. This encrypted copy only exists so the value can be shown
 * back to the owning admin.
 *
 * Security notes:
 * - The plaintext is never stored; only the AES-GCM ciphertext is persisted.
 * - Decryption requires PASSWORD_RECOVERY_SECRET (falls back to
 *   NEXTAUTH_SECRET), so a database leak alone does not expose passwords.
 * - Only ever exposed through an admin-only, tenant-scoped, agent-only endpoint.
 */

const VERSION = "v1";

function getKey(): Buffer | null {
  const secret =
    process.env.PASSWORD_RECOVERY_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!secret) return null;
  // Derive a stable 32-byte key from whatever secret length is configured.
  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypts a plaintext password for recoverable storage. Returns null if no secret is configured. */
export function encryptRecoverablePassword(plain: string): string | null {
  if (!plain) return null;
  const key = getKey();
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/** Decrypts a stored recoverable password. Returns null if missing/invalid or no secret configured. */
export function decryptRecoverablePassword(stored?: string | null): string | null {
  if (!stored) return null;
  const key = getKey();
  if (!key) return null;

  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;

  try {
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const data = Buffer.from(parts[3], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
