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

/** Curated Google / system fonts (any color is free; fonts need a loaded face). */
export const BRAND_FONT_OPTIONS: BrandFontOption[] = [
  {
    id: "system",
    label: "Default (Space Grotesk)",
    googleFamily: null,
    cssFamily:
      'var(--font-space-grotesk), "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
    id: "manrope",
    label: "Manrope",
    googleFamily: "Manrope",
    cssFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
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
    id: "space-grotesk",
    label: "Space Grotesk",
    googleFamily: "Space Grotesk",
    cssFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "outfit",
    label: "Outfit",
    googleFamily: "Outfit",
    cssFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  },
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
    id: "jetbrains",
    label: "JetBrains Mono",
    googleFamily: "JetBrains Mono",
    cssFamily: '"JetBrains Mono", ui-monospace, monospace',
  },
];

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
  bodyFont: "system",
  headingFont: "system",
});

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
const FONT_IDS = new Set(BRAND_FONT_OPTIONS.map((f) => f.id));

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
  return (
    BRAND_FONT_OPTIONS.find((f) => f.id === id) ?? BRAND_FONT_OPTIONS[0]!
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

  const core = {
    primary,
    primaryEnd,
    solidPrimary,
    buttonStyle:
      p.buttonStyle === "solid" ? ("solid" as const) : ("gradient" as const),
    bodyFont: FONT_IDS.has(String(p.bodyFont ?? ""))
      ? String(p.bodyFont)
      : fallback.bodyFont,
    headingFont: FONT_IDS.has(String(p.headingFont ?? ""))
      ? String(p.headingFont)
      : fallback.headingFont,
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
  const bodyFont = String(raw.bodyFont ?? "system").trim();
  const headingFont = String(raw.headingFont ?? "system").trim();

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
  if (!FONT_IDS.has(bodyFont)) {
    return { error: "Invalid body font" };
  }
  if (!FONT_IDS.has(headingFont)) {
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
