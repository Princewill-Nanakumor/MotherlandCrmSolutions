import crypto from "crypto";

/** Store only SHA-256 of raw tokens (verification / reset) in the database. */
export function hashAuthTokenForStorage(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}
