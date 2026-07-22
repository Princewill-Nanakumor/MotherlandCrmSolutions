/**
 * Glass input rules for auth hero pages (login, signup, forgot, reset).
 * Wrap fields in `<div data-auth-glass-fields>...</div>` and set body class
 * to one of: is-login-page | is-signup-page | is-auth-forgot-page | is-auth-reset-page
 *
 * Visual language matches sign-in: solid white 1px border, hover fill, focus inset ring
 * (no border-width change — avoids card layout shift).
 */
const AUTH_HERO_GLASS_PAGE_ROOTS = [
  ":is(html, body).is-login-page",
  ":is(html, body).is-signup-page",
  ":is(html, body).is-auth-forgot-page",
  ":is(html, body).is-auth-reset-page",
  ":is(html, body).is-verify-email-page",
] as const;

function scope(selectorTail: string): string {
  return AUTH_HERO_GLASS_PAGE_ROOTS.map((root) => `${root} ${selectorTail}`).join(
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
  color-scheme: dark !important;
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
/* Kill Chrome/Safari autofill yellow/blue so fields stay glass (same fill as base). */
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):-webkit-autofill')},
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):-webkit-autofill:hover')},
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):-webkit-autofill:focus')},
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):-webkit-autofill:active')},
${scope('[data-auth-glass-fields] textarea:-webkit-autofill')},
${scope('[data-auth-glass-fields] textarea:-webkit-autofill:hover')},
${scope('[data-auth-glass-fields] textarea:-webkit-autofill:focus')},
${scope('[data-auth-glass-fields] textarea:-webkit-autofill:active')} {
  /* Delay UA autofill background so our fill + inset shadow stay visible (Chrome/Safari). */
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 600000s ease 0s !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
  box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
  -webkit-text-fill-color: rgb(255, 255, 255) !important;
  caret-color: rgb(255, 255, 255) !important;
  color-scheme: dark !important;
}
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"]):-webkit-autofill')},
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"]):-webkit-autofill:hover')},
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"]):-webkit-autofill:focus')},
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"]):-webkit-autofill:active')} {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 600000s ease 0s !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
  box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
  -webkit-text-fill-color: rgb(255, 255, 255) !important;
  caret-color: rgb(255, 255, 255) !important;
  color-scheme: dark !important;
}
${scope('[data-auth-glass-fields] input:not([type="checkbox"]):not(.border-red-500):-webkit-autofill:focus-visible')} {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 600000s ease 0s !important;
  background-color: rgba(255, 255, 255, 0.24) !important;
  -webkit-box-shadow:
    0 0 0 1000px rgba(255, 255, 255, 0.24) inset,
    inset 0 0 0 2px rgba(255, 255, 255, 0.45) !important;
  box-shadow:
    0 0 0 1000px rgba(255, 255, 255, 0.24) inset,
    inset 0 0 0 2px rgba(255, 255, 255, 0.45) !important;
  -webkit-text-fill-color: rgb(255, 255, 255) !important;
  caret-color: rgb(255, 255, 255) !important;
  color-scheme: dark !important;
}
${scope('[data-auth-glass-fields] input.border-red-500:not([type="checkbox"]):-webkit-autofill:focus-visible')} {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 600000s ease 0s !important;
  background-color: rgba(255, 255, 255, 0.16) !important;
  -webkit-box-shadow:
    0 0 0 1000px rgba(255, 255, 255, 0.16) inset,
    inset 0 0 0 2px rgba(248, 113, 113, 0.5) !important;
  box-shadow:
    0 0 0 1000px rgba(255, 255, 255, 0.16) inset,
    inset 0 0 0 2px rgba(248, 113, 113, 0.5) !important;
  -webkit-text-fill-color: rgb(255, 255, 255) !important;
  caret-color: rgb(255, 255, 255) !important;
  color-scheme: dark !important;
}
/* Captcha / "I'm not a robot" — always white on auth hero (ignore dashboard dark mode) */
${scope("[data-auth-robot-verify]")},
${scope("[data-auth-robot-verify] span")} {
  color: rgb(255, 255, 255) !important;
  -webkit-text-fill-color: rgb(255, 255, 255) !important;
}
${scope("[data-auth-captcha] label")},
${scope("[data-auth-captcha] label svg")},
${scope("[data-auth-captcha] .font-mono")},
${scope("[data-auth-captcha] div > span")} {
  color: rgb(255, 255, 255) !important;
}
`.trim();
}
