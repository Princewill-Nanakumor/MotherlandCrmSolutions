/** Shown when Atlas/OpenSSL drops the handshake (common on a very weak link). */
export const DATABASE_UNREACHABLE_USER_MESSAGE =
  "Could not reach the database because the connection is too slow or dropped. Wait a moment and try again.";

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

/** MongoDB Atlas / Node OpenSSL failed the TLS handshake or the socket died. */
export function isTlsOrNetworkFailure(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  return (
    message.includes("ssl alert number 80") ||
    message.includes("tlsv1 alert") ||
    message.includes("ssl routines") ||
    message.includes("ssl3_read_bytes") ||
    message.includes("error:0a000438") ||
    message.includes("openssl") ||
    message.includes("etimedout") ||
    message.includes("etimeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("socket hang up") ||
    message.includes("client network socket disconnected") ||
    message.includes("mongonetworkerror") ||
    message.includes("mongoserverselectionerror") ||
    message.includes("server selection timed out") ||
    message.includes("connection timed out") ||
    (message.includes("timed out") && message.includes("mongo"))
  );
}

export function friendlyDatabaseConnectMessage(error: unknown): string {
  const message = errorText(error);
  if (message.includes("Authentication failed")) {
    return "Database authentication failed. Please check your credentials.";
  }
  if (isTlsOrNetworkFailure(error)) {
    return DATABASE_UNREACHABLE_USER_MESSAGE;
  }
  return message || "An unexpected error occurred while connecting to the database.";
}

/** Login form: never show raw OpenSSL / Mongo handshake dumps. */
export function humanizeSignInError(raw: string): string {
  const text = raw.trim();
  if (!text) return "Sign in failed. Please try again.";
  if (text === DATABASE_UNREACHABLE_USER_MESSAGE) return text;
  if (
    isTlsOrNetworkFailure(text) ||
    text.toLowerCase().includes("could not reach the database")
  ) {
    return DATABASE_UNREACHABLE_USER_MESSAGE;
  }
  return text;
}

export function isRetryableFilterFetch(error: unknown): boolean {
  if (isTlsOrNetworkFailure(error)) return true;
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("HTTP 5") ||
    error.message.includes("timed out")
  );
}
