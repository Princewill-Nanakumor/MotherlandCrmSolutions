/**
 * Glass input rules for auth hero pages (login, signup, forgot, reset).
 * Wrap fields in `<div data-auth-glass-fields>...</div>` and set body class
 * to one of: is-login-page | is-signup-page | is-auth-forgot-page | is-auth-reset-page
 *
 * Visual language matches sign-in: solid white 1px border, hover fill, focus inset ring
 * (no border-width change — avoids card layout shift).
 */
const AUTH_HERO_GLASS_BODY_SELECTORS = [
  "body.is-login-page",
  "body.is-signup-page",
  "body.is-auth-forgot-page",
  "body.is-auth-reset-page",
] as const;

function scope(selectorTail: string): string {
  return AUTH_HERO_GLASS_BODY_SELECTORS.map((b) => `${b} ${selectorTail}`).join(
    ",\n",
  );
}

export function getAuthHeroGlassFieldsCss(): string {
  return `
${scope('[data-auth-glass-fields] input:not([type="checkbox"])')} {
  border-width: 1px !important;
  border-style: solid !important;
  border-color: rgb(255, 255, 255) !important;
  border-radius: 0.375rem !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: rgb(255, 255, 255) !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  outline: none !important;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease !important;
}
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):hover:not(:disabled):not(:focus-visible)')} {
  border-color: rgb(255, 255, 255) !important;
  background-color: rgba(255, 255, 255, 0.14) !important;
}
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):not(.border-red-500):focus-visible')} {
  outline: none !important;
  border-width: 1px !important;
  border-style: solid !important;
  border-color: rgb(255, 255, 255) !important;
  background-color: rgba(255, 255, 255, 0.24) !important;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.45) !important;
}
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"])')} {
  border-color: rgb(239, 68, 68) !important;
}
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"]):focus-visible')} {
  outline: none !important;
  border-width: 1px !important;
  border-style: solid !important;
  border-color: rgb(248, 113, 113) !important;
  background-color: rgba(255, 255, 255, 0.16) !important;
  box-shadow: inset 0 0 0 2px rgba(248, 113, 113, 0.5) !important;
}
${scope('[data-auth-glass-fields] input:not([type="checkbox"])::placeholder')},
${scope('[data-auth-glass-fields] textarea::placeholder')} {
  color: rgba(255, 255, 255, 0.72) !important;
  font-weight: 600 !important;
}
`.trim();
}
