/**
 * Full-bleed hero background + transparent layout chrome (same as login/signup).
 * Use the same string for `html` and `body` class, e.g. `is-auth-forgot-page`.
 */
export function getAuthHeroBackdropChromeCss(pageClass: string): string {
  return `
          html.${pageClass} {
            background-color: #1a1a1a !important;
            background-image: none !important;
          }
          body.${pageClass} {
            background-color: #0f0f0f !important;
            background-image:
              linear-gradient(
                rgba(0, 0, 0, 0.58),
                rgba(0, 0, 0, 0.52)
              ),
              url('/motherlandImage.jpg') !important;
            background-size: cover, cover !important;
            background-position: center, center !important;
            background-repeat: no-repeat, no-repeat !important;
            background-attachment: fixed, fixed !important;
          }
          body.${pageClass} > div,
          body.${pageClass} > div > div,
          body.${pageClass} > div > div > div,
          body.${pageClass} > div > div > div > div {
            background-color: transparent !important;
            background: transparent !important;
          }
          body.${pageClass} nav,
          body.${pageClass} [class*="Navbar"],
          body.${pageClass} [class*="navbar"] {
            background-color: transparent !important;
            background: transparent !important;
          }
          body.${pageClass} div[class*="bg-white/10"] {
            background-color: rgba(255, 255, 255, 0.1) !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
          body.${pageClass} form {
            background-color: transparent !important;
            background: transparent !important;
          }
`.trim();
}
