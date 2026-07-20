/**
 * Tenant brand theme (admin-owned, inherited by agents).
 */

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

/** Curated fonts — each option is a distinct face (near-duplicates removed). */
export const BRAND_FONT_OPTIONS: BrandFontOption[] = [
  // Sans — UI / body (different silhouettes)
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    // Loaded via next/font in root layout (--font-space-grotesk)
    googleFamily: null,
    cssFamily:
      'var(--font-space-grotesk), "Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "inter",
    label: "Inter",
    googleFamily: "Inter",
    cssFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    googleFamily: "DM Sans",
    cssFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    googleFamily: "Plus Jakarta Sans",
    cssFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "poppins",
    label: "Poppins",
    googleFamily: "Poppins",
    cssFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "nunito",
    label: "Nunito",
    googleFamily: "Nunito",
    cssFamily: '"Nunito", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "rubik",
    label: "Rubik",
    googleFamily: "Rubik",
    cssFamily: '"Rubik", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "source-sans",
    label: "Source Sans 3",
    googleFamily: "Source Sans 3",
    cssFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "ibm-plex",
    label: "IBM Plex Sans",
    googleFamily: "IBM Plex Sans",
    cssFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "outfit",
    label: "Outfit",
    googleFamily: "Outfit",
    cssFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "sora",
    label: "Sora",
    googleFamily: "Sora",
    cssFamily: '"Sora", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "lexend",
    label: "Lexend",
    googleFamily: "Lexend",
    cssFamily: '"Lexend", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "lato",
    label: "Lato",
    googleFamily: "Lato",
    cssFamily: '"Lato", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "montserrat",
    label: "Montserrat",
    googleFamily: "Montserrat",
    cssFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "raleway",
    label: "Raleway",
    googleFamily: "Raleway",
    cssFamily: '"Raleway", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "barlow",
    label: "Barlow",
    googleFamily: "Barlow",
    cssFamily: '"Barlow", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "archivo",
    label: "Archivo",
    googleFamily: "Archivo",
    cssFamily: '"Archivo", ui-sans-serif, system-ui, sans-serif',
  },
  // Serif — headings / editorial
  {
    id: "playfair",
    label: "Playfair Display",
    googleFamily: "Playfair Display",
    cssFamily: '"Playfair Display", ui-serif, Georgia, serif',
  },
  {
    id: "merriweather",
    label: "Merriweather",
    googleFamily: "Merriweather",
    cssFamily: '"Merriweather", ui-serif, Georgia, serif',
  },
  {
    id: "lora",
    label: "Lora",
    googleFamily: "Lora",
    cssFamily: '"Lora", ui-serif, Georgia, serif',
  },
  {
    id: "librebaskerville",
    label: "Libre Baskerville",
    googleFamily: "Libre Baskerville",
    cssFamily: '"Libre Baskerville", ui-serif, Georgia, serif',
  },
  {
    id: "source-serif",
    label: "Source Serif 4",
    googleFamily: "Source Serif 4",
    cssFamily: '"Source Serif 4", ui-serif, Georgia, serif',
  },
  {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    googleFamily: "Cormorant Garamond",
    cssFamily: '"Cormorant Garamond", ui-serif, Georgia, serif',
  },
  {
    id: "fraunces",
    label: "Fraunces",
    googleFamily: "Fraunces",
    cssFamily: '"Fraunces", ui-serif, Georgia, serif',
  },
  {
    id: "instrument-serif",
    label: "Instrument Serif",
    googleFamily: "Instrument Serif",
    cssFamily: '"Instrument Serif", ui-serif, Georgia, serif',
  },
  // Mono
  {
    id: "source-code-pro",
    label: "Source Code Pro",
    googleFamily: "Source Code Pro",
    cssFamily:
      'var(--font-source-code-pro), "Source Code Pro", ui-monospace, monospace',
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    googleFamily: "JetBrains Mono",
    cssFamily:
      'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, monospace',
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    googleFamily: "IBM Plex Mono",
    cssFamily: '"IBM Plex Mono", ui-monospace, monospace',
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
  primary: "#4F46E5",
  primaryEnd: "#9333EA",
  solidPrimary: "#4F46E5",
  focus: "#4F46E5",
  icon: "#4F46E5",
  navbarFrom: "#4F46E5",
  navbarTo: "#9333EA",
  navbarText: "#FFFFFF",
  buttonStyle: "gradient",
  bodyFont: "source-code-pro",
  headingFont: "source-code-pro",
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
  const primary = isValidHexColor(String(p.primary ?? fallback.primary))
    ? normalizeHexColor(String(p.primary))
    : fallback.primary;
  const primaryEnd = isValidHexColor(String(p.primaryEnd ?? fallback.primaryEnd))
    ? normalizeHexColor(String(p.primaryEnd))
    : fallback.primaryEnd;
  // Older saved themes may lack solidPrimary — fall back to primary.
  const solidPrimaryRaw = p.solidPrimary ?? p.primary ?? fallback.solidPrimary;
  const solidPrimary = isValidHexColor(String(solidPrimaryRaw))
    ? normalizeHexColor(String(solidPrimaryRaw))
    : fallback.solidPrimary;

  let bodyFont = resolveBrandFontId(p.bodyFont, fallback.bodyFont);
  let headingFont = resolveBrandFontId(p.headingFont, fallback.headingFont);

  // Migrate the brief JetBrains Mono app default → Source Code Pro.
  // (1) both still on previous default (2) body already new default, heading leftover
  const previousDefaultFont = "jetbrains";
  const currentDefaultFont = "source-code-pro";
  if (
    bodyFont === previousDefaultFont &&
    headingFont === previousDefaultFont
  ) {
    bodyFont = currentDefaultFont;
    headingFont = currentDefaultFont;
  } else if (
    bodyFont === currentDefaultFont &&
    headingFont === previousDefaultFont
  ) {
    headingFont = currentDefaultFont;
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
  const bodyFontRaw = String(raw.bodyFont ?? "source-code-pro").trim();
  const headingFontRaw = String(raw.headingFont ?? "source-code-pro").trim();
  const bodyFont = resolveBrandFontId(bodyFontRaw, "");
  const headingFont = resolveBrandFontId(headingFontRaw, "");

  if (!isValidHexColor(primary)) {
    return { error: "Primary color must be a valid hex (e.g. #4F46E5)" };
  }
  if (!isValidHexColor(primaryEnd)) {
    return { error: "Secondary color must be a valid hex (e.g. #9333EA)" };
  }
  if (!isValidHexColor(solidPrimary)) {
    return { error: "Solid primary color must be a valid hex (e.g. #4F46E5)" };
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
    "--brand-focus": theme.focus,
    "--brand-icon": theme.icon,
    "--brand-navbar-from": theme.navbarFrom,
    "--brand-navbar-to": theme.navbarTo,
    "--brand-navbar-text": theme.navbarText,
    "--brand-font-body": body.cssFamily,
    "--brand-font-heading": heading.cssFamily,
  };
}

export function googleFontsHrefForTheme(theme: BrandTheme): string | null {
  const families = new Set<string>();
  for (const id of [theme.bodyFont, theme.headingFont]) {
    const opt = getBrandFontOption(id);
    if (opt.googleFamily) families.add(opt.googleFamily);
  }
  if (families.size === 0) return null;

  const params = [...families]
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Apply CSS vars + button style + Google fonts to <html> (home, auth, dashboard). */
export function applyBrandThemeToDocument(theme: BrandTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = brandThemeToCssVars(theme);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.brandButtonStyle = theme.buttonStyle;

  const href = googleFontsHrefForTheme(theme);
  const existing = document.getElementById(
    "tenant-brand-fonts",
  ) as HTMLLinkElement | null;

  if (!href) {
    existing?.remove();
    return;
  }

  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }

  const link = document.createElement("link");
  link.id = "tenant-brand-fonts";
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
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
    const href = googleFontsHrefForTheme(merged);
    if (href) {
      window.localStorage.setItem(BRAND_THEME_FONTS_STORAGE_KEY, href);
    } else {
      window.localStorage.removeItem(BRAND_THEME_FONTS_STORAGE_KEY);
    }
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
