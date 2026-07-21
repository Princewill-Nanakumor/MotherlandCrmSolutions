/**
 * Tenant brand theme (admin-owned, inherited by agents).
 */

import { applyBrandFavicon } from "@/lib/brandFavicon";

export type BrandButtonStyle = "solid" | "gradient";

export type BrandTheme = {
  /** Gradient start color */
  primary: string;
  /** Gradient end color */
  primaryEnd: string;
  /** Solid-mode fill — kept separate so switching styles never loses colors */
  solidPrimary: string;
  /** Input / select focus ring */
  focus: string;
  /** Icons, inactive nav accents */
  icon: string;
  /** Top navbar gradient start */
  navbarFrom: string;
  /** Top navbar gradient end */
  navbarTo: string;
  /** Top navbar text / control color */
  navbarText: string;
  buttonStyle: BrandButtonStyle;
  /** CSS font-family stack name for body UI */
  bodyFont: string;
  /** CSS font-family stack name for headings */
  headingFont: string;
};

/** Active fill/start color for the current button style */
export function getActiveBrandPrimary(theme: BrandTheme): string {
  return theme.buttonStyle === "solid" ? theme.solidPrimary : theme.primary;
}

/** Active end color for the current button style (solid = solidPrimary) */
export function getActiveBrandSecondary(theme: BrandTheme): string {
  return theme.buttonStyle === "solid" ? theme.solidPrimary : theme.primaryEnd;
}

export type BrandFontOption = {
  id: string;
  label: string;
  /** Google Fonts family name, or null for system stack */
  googleFamily: string | null;
  cssFamily: string;
};

/** Curated fonts — each option is a distinct face (near-duplicates removed).
 *  Faces are self-hosted via next/font (`src/lib/brandFontLoaders.ts`). */
export const BRAND_FONT_OPTIONS: BrandFontOption[] = [
  // Sans — UI / body (different silhouettes)
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    googleFamily: null,
    cssFamily:
      'var(--font-space-grotesk), "Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "inter",
    label: "Inter",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-inter), Inter, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-dm-sans), "DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-plus-jakarta), "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "poppins",
    label: "Poppins",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-poppins), Poppins, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "nunito",
    label: "Nunito",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-nunito), Nunito, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "rubik",
    label: "Rubik",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-rubik), Rubik, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "source-sans",
    label: "Source Sans 3",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-source-sans), "Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "ibm-plex",
    label: "IBM Plex Sans",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-ibm-plex), "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "outfit",
    label: "Outfit",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-outfit), Outfit, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "sora",
    label: "Sora",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-sora), Sora, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "lexend",
    label: "Lexend",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-lexend), Lexend, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "lato",
    label: "Lato",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-lato), Lato, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "montserrat",
    label: "Montserrat",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-montserrat), Montserrat, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "raleway",
    label: "Raleway",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-raleway), Raleway, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "barlow",
    label: "Barlow",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-barlow), Barlow, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "archivo",
    label: "Archivo",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-archivo), Archivo, ui-sans-serif, system-ui, sans-serif',
  },
  // Serif — headings / editorial
  {
    id: "playfair",
    label: "Playfair Display",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-playfair), "Playfair Display", ui-serif, Georgia, serif',
  },
  {
    id: "merriweather",
    label: "Merriweather",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-merriweather), Merriweather, ui-serif, Georgia, serif',
  },
  {
    id: "lora",
    label: "Lora",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-lora), Lora, ui-serif, Georgia, serif',
  },
  {
    id: "librebaskerville",
    label: "Libre Baskerville",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-libre-baskerville), "Libre Baskerville", ui-serif, Georgia, serif',
  },
  {
    id: "source-serif",
    label: "Source Serif 4",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-source-serif), "Source Serif 4", ui-serif, Georgia, serif',
  },
  {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-cormorant), "Cormorant Garamond", ui-serif, Georgia, serif',
  },
  {
    id: "fraunces",
    label: "Fraunces",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-fraunces), Fraunces, ui-serif, Georgia, serif',
  },
  {
    id: "instrument-serif",
    label: "Instrument Serif",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-instrument-serif), "Instrument Serif", ui-serif, Georgia, serif',
  },
  // Mono
  {
    id: "source-code-pro",
    label: "Source Code Pro",
    googleFamily: null,
    cssFamily:
      'var(--font-source-code-pro), "Source Code Pro", ui-monospace, monospace',
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    googleFamily: null,
    cssFamily:
      'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, monospace',
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    googleFamily: null,
    cssFamily:
      'var(--font-brand-ibm-plex-mono), "IBM Plex Mono", ui-monospace, monospace',
  },
];

const FONT_IDS = new Set(BRAND_FONT_OPTIONS.map((f) => f.id));

/** Map removed / redundant font ids → closest kept option (saved themes stay valid). */
const BRAND_FONT_MIGRATIONS: Record<string, string> = {
  // Old Space Grotesk id before rename
  system: "space-grotesk",
  manrope: "plus-jakarta",
  "nunito-sans": "nunito",
  "work-sans": "source-sans",
  figtree: "dm-sans",
  urbanist: "montserrat",
  mulish: "nunito",
  cabin: "lato",
  karla: "inter",
  "open-sans": "source-sans",
  quicksand: "nunito",
  "public-sans": "source-sans",
  "schibsted-grotesk": "space-grotesk",
  "instrument-sans": "inter",
  onest: "outfit",
  "albert-sans": "inter",
  "libre-franklin": "source-sans",
  "crimson-pro": "lora",
  "eb-garamond": "cormorant-garamond",
  "fira-code": "jetbrains",
};

function resolveBrandFontId(id: string | undefined | null, fallback: string): string {
  const raw = String(id ?? "").trim();
  if (!raw) return fallback;
  const migrated = BRAND_FONT_MIGRATIONS[raw] ?? raw;
  if (FONT_IDS.has(migrated)) return migrated;
  return fallback;
}

export function syncDerivedBrandColors(theme: BrandTheme): BrandTheme {
  const active = getActiveBrandPrimary(theme);
  const navbarTo = getActiveBrandSecondary(theme);
  return {
    ...theme,
    focus: active,
    icon: active,
    navbarFrom: active,
    navbarTo,
    navbarText: "#FFFFFF",
  };
}

/** Inline background for navbar / preview surfaces */
export function brandSurfaceBackground(theme: BrandTheme): {
  backgroundColor?: string;
  backgroundImage?: string;
} {
  if (theme.buttonStyle === "solid") {
    return {
      backgroundColor: theme.solidPrimary,
      backgroundImage: "none",
    };
  }
  return {
    backgroundColor: "transparent",
    backgroundImage: `linear-gradient(to right, ${theme.primary}, ${theme.primaryEnd})`,
  };
}

export const DEFAULT_BRAND_THEME: BrandTheme = syncDerivedBrandColors({
  primary: "#2D6F8B",
  primaryEnd: "#2E8EB8",
  solidPrimary: "#2D6F8B",
  focus: "#2D6F8B",
  icon: "#2D6F8B",
  navbarFrom: "#2D6F8B",
  navbarTo: "#2E8EB8",
  navbarText: "#FFFFFF",
  buttonStyle: "gradient",
  bodyFont: "ibm-plex-mono",
  headingFont: "jetbrains",
});

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(String(value ?? "").trim());
}

export function normalizeHexColor(value: string): string {
  const raw = String(value ?? "").trim();
  if (!HEX_RE.test(raw)) return DEFAULT_BRAND_THEME.primary;
  if (raw.length === 4) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return raw.toUpperCase();
}

export function getBrandFontOption(id: string): BrandFontOption {
  const resolved = resolveBrandFontId(id, BRAND_FONT_OPTIONS[0]!.id);
  return (
    BRAND_FONT_OPTIONS.find((f) => f.id === resolved) ?? BRAND_FONT_OPTIONS[0]!
  );
}

export function mergeBrandTheme(
  partial?: Partial<BrandTheme> | null,
): BrandTheme {
  const p = partial ?? {};
  const fallback = DEFAULT_BRAND_THEME;

  // Only user-editable fields are read from input — derived colors are always
  // recomputed. solidPrimary / primary / primaryEnd stay independent so
  // switching button style never overwrites the other mode's colors.
  let primary = isValidHexColor(String(p.primary ?? fallback.primary))
    ? normalizeHexColor(String(p.primary))
    : fallback.primary;
  let primaryEnd = isValidHexColor(String(p.primaryEnd ?? fallback.primaryEnd))
    ? normalizeHexColor(String(p.primaryEnd))
    : fallback.primaryEnd;
  // Older saved themes may lack solidPrimary — fall back to primary.
  const solidPrimaryRaw = p.solidPrimary ?? p.primary ?? fallback.solidPrimary;
  let solidPrimary = isValidHexColor(String(solidPrimaryRaw))
    ? normalizeHexColor(String(solidPrimaryRaw))
    : fallback.solidPrimary;

  // Migrate former purple / previous teal-secondary defaults → current brand palette.
  if (
    (primary === "#4F46E5" &&
      primaryEnd === "#9333EA" &&
      (solidPrimary === "#4F46E5" || solidPrimary === primary)) ||
    (primary === "#2D6F8B" &&
      primaryEnd === "#1A556E" &&
      (solidPrimary === "#2D6F8B" || solidPrimary === primary))
  ) {
    primary = fallback.primary;
    primaryEnd = fallback.primaryEnd;
    solidPrimary = fallback.solidPrimary;
  }

  let bodyFont = resolveBrandFontId(p.bodyFont, fallback.bodyFont);
  let headingFont = resolveBrandFontId(p.headingFont, fallback.headingFont);

  // Migrate prior app defaults → IBM Plex Mono (body) + JetBrains Mono (heading).
  // Only when both sides still match an old paired default (not a custom mix).
  const oldPairedDefaults: Array<[string, string]> = [
    ["jetbrains", "jetbrains"],
    ["source-code-pro", "source-code-pro"],
    ["ibm-plex-mono", "rubik"],
  ];
  for (const [oldBody, oldHeading] of oldPairedDefaults) {
    if (bodyFont === oldBody && headingFont === oldHeading) {
      bodyFont = fallback.bodyFont;
      headingFont = fallback.headingFont;
      break;
    }
  }

  const core = {
    primary,
    primaryEnd,
    solidPrimary,
    buttonStyle:
      p.buttonStyle === "solid" ? ("solid" as const) : ("gradient" as const),
    bodyFont,
    headingFont,
  };

  return syncDerivedBrandColors({
    ...fallback,
    ...core,
    focus: fallback.focus,
    icon: fallback.icon,
    navbarFrom: fallback.navbarFrom,
    navbarTo: fallback.navbarTo,
    navbarText: fallback.navbarText,
  });
}

export function parseBrandThemeInput(input: unknown): BrandTheme | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid theme payload" };
  }
  const raw = input as Record<string, unknown>;

  const primary = String(raw.primary ?? "").trim();
  const primaryEnd = String(raw.primaryEnd ?? "").trim();
  const solidPrimary = String(
    raw.solidPrimary ?? raw.primary ?? "",
  ).trim();
  const buttonStyle = String(raw.buttonStyle ?? "gradient").trim();
  const bodyFontRaw = String(raw.bodyFont ?? "ibm-plex-mono").trim();
  const headingFontRaw = String(raw.headingFont ?? "jetbrains").trim();
  const bodyFont = resolveBrandFontId(bodyFontRaw, "");
  const headingFont = resolveBrandFontId(headingFontRaw, "");

  if (!isValidHexColor(primary)) {
    return { error: "Primary color must be a valid hex (e.g. #2D6F8B)" };
  }
  if (!isValidHexColor(primaryEnd)) {
    return { error: "Secondary color must be a valid hex (e.g. #2E8EB8)" };
  }
  if (!isValidHexColor(solidPrimary)) {
    return { error: "Solid primary color must be a valid hex (e.g. #2D6F8B)" };
  }
  if (buttonStyle !== "solid" && buttonStyle !== "gradient") {
    return { error: "Button style must be solid or gradient" };
  }
  if (!bodyFont) {
    return { error: "Invalid body font" };
  }
  if (!headingFont) {
    return { error: "Invalid heading font" };
  }

  return mergeBrandTheme({
    primary,
    primaryEnd,
    solidPrimary,
    buttonStyle,
    bodyFont,
    headingFont,
  });
}

export function brandThemeToCssVars(theme: BrandTheme): Record<string, string> {
  const body = getBrandFontOption(theme.bodyFont);
  const heading = getBrandFontOption(theme.headingFont);
  const from = getActiveBrandPrimary(theme);
  const to = getActiveBrandSecondary(theme);

  return {
    "--brand-from": from,
    "--brand-to": to,
    "--brand-solid": theme.solidPrimary,
    "--brand-focus": theme.focus,
    "--brand-icon": theme.icon,
    "--brand-navbar-from": theme.navbarFrom,
    "--brand-navbar-to": theme.navbarTo,
    "--brand-navbar-text": theme.navbarText,
    "--brand-font-body": body.cssFamily,
    "--brand-font-heading": heading.cssFamily,
  };
}

export function googleFontsHrefForTheme(): string | null {
  // Brand faces are self-hosted via next/font — no runtime Google Fonts CSS.
  return null;
}

/** @deprecated Catalog fonts are self-hosted; kept for call-site compatibility. */
export function ensureBrandFontCatalogLoaded(): void {
  // no-op
}

/** Apply CSS vars + button style to <html> (home, auth, dashboard). */
export function applyBrandThemeToDocument(theme: BrandTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = brandThemeToCssVars(theme);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.brandButtonStyle = theme.buttonStyle;

  // Remove any legacy Google Fonts <link> from older clients / cached boots.
  document.getElementById("tenant-brand-fonts")?.remove();
  document.getElementById("tenant-brand-fonts-catalog")?.remove();
  document.getElementById("preconnect-fonts-googleapis")?.remove();
  document.getElementById("preconnect-fonts-gstatic")?.remove();
  // Stale Google Fonts href from before self-hosted fonts.
  try {
    window.localStorage.removeItem(BRAND_THEME_FONTS_STORAGE_KEY);
  } catch {
    // ignore
  }

  applyBrandFavicon(getActiveBrandPrimary(theme));
}

/** localStorage keys — keep in sync with the boot script in app/layout.tsx */
export const BRAND_THEME_STORAGE_KEY = "motherland-brand-theme";
export const BRAND_THEME_CSS_STORAGE_KEY = "motherland-brand-theme-css";
export const BRAND_THEME_FONTS_STORAGE_KEY = "motherland-brand-theme-fonts";

export function readBrandThemeCache(): BrandTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRAND_THEME_STORAGE_KEY);
    if (!raw) return null;
    return mergeBrandTheme(JSON.parse(raw) as Partial<BrandTheme>);
  } catch {
    return null;
  }
}

/** Persist theme + resolved CSS vars so refresh can restore before the API returns. */
export function persistBrandThemeCache(theme: BrandTheme): void {
  if (typeof window === "undefined") return;
  try {
    const merged = mergeBrandTheme(theme);
    window.localStorage.setItem(
      BRAND_THEME_STORAGE_KEY,
      JSON.stringify(merged),
    );
    window.localStorage.setItem(
      BRAND_THEME_CSS_STORAGE_KEY,
      JSON.stringify(brandThemeToCssVars(merged)),
    );
    // Legacy key from Google Fonts era — clear so old boots don't inject links.
    window.localStorage.removeItem(BRAND_THEME_FONTS_STORAGE_KEY);
  } catch {
    // Ignore quota / private-mode failures
  }
}

/** Shared react-select tokens — use CSS vars so tenant theme applies in inline styles. */
export const countrySelectBrand = {
  focus: "var(--brand-focus)",
  focusRing: "0 0 0 1px var(--brand-focus)",
  focusRingHero: "0 0 0 3px color-mix(in srgb, var(--brand-focus) 40%, transparent)",
  selectedLight: "color-mix(in srgb, var(--brand-from) 12%, white)",
  selectedDark: "color-mix(in srgb, var(--brand-from) 22%, #111827)",
  selectedHero: "color-mix(in srgb, var(--brand-from) 35%, transparent)",
  selectedHeroActive: "color-mix(in srgb, var(--brand-from) 45%, transparent)",
  scrollbarDark: "var(--brand-from)",
} as const;
