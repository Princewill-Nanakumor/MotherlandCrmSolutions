/**
 * Default NextAuth session/JWT max age in seconds.
 * Used when the user did NOT tick "Remember me".
 */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * Extended session/JWT max age in seconds when the user tick "Remember me"
 * at sign-in. The chosen value is stored on the JWT itself (`maxAgeSec`) so
 * middleware/session callbacks honor the per-login choice.
 */
export const SESSION_REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
