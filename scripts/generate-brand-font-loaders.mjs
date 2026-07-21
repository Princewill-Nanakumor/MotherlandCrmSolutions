/**
 * Copies latin woff2 files from @fontsource into src/assets/brand-fonts/
 * and regenerates src/lib/brandFontLoaders.ts with literal next/font/local loaders.
 *
 * Run after adding a font: node scripts/generate-brand-font-loaders.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "src/assets/brand-fonts");
const outFile = path.join(root, "src/lib/brandFontLoaders.ts");

/** @type {Array<{ exportName: string; packageName: string; filePrefix: string; variable: string; weights: string[]; preload?: boolean }>} */
const FONTS = [
  { exportName: "brandFontSpaceGrotesk", packageName: "space-grotesk", filePrefix: "space-grotesk", variable: "--font-space-grotesk", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontInter", packageName: "inter", filePrefix: "inter", variable: "--font-brand-inter", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontDmSans", packageName: "dm-sans", filePrefix: "dm-sans", variable: "--font-brand-dm-sans", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontPlusJakarta", packageName: "plus-jakarta-sans", filePrefix: "plus-jakarta-sans", variable: "--font-brand-plus-jakarta", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontPoppins", packageName: "poppins", filePrefix: "poppins", variable: "--font-brand-poppins", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontNunito", packageName: "nunito", filePrefix: "nunito", variable: "--font-brand-nunito", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontRubik", packageName: "rubik", filePrefix: "rubik", variable: "--font-brand-rubik", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontSourceSans", packageName: "source-sans-3", filePrefix: "source-sans-3", variable: "--font-brand-source-sans", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontIbmPlex", packageName: "ibm-plex-sans", filePrefix: "ibm-plex-sans", variable: "--font-brand-ibm-plex", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontOutfit", packageName: "outfit", filePrefix: "outfit", variable: "--font-brand-outfit", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontSora", packageName: "sora", filePrefix: "sora", variable: "--font-brand-sora", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontLexend", packageName: "lexend", filePrefix: "lexend", variable: "--font-brand-lexend", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontLato", packageName: "lato", filePrefix: "lato", variable: "--font-brand-lato", weights: ["400", "700"] },
  { exportName: "brandFontMontserrat", packageName: "montserrat", filePrefix: "montserrat", variable: "--font-brand-montserrat", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontRaleway", packageName: "raleway", filePrefix: "raleway", variable: "--font-brand-raleway", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontBarlow", packageName: "barlow", filePrefix: "barlow", variable: "--font-brand-barlow", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontArchivo", packageName: "archivo", filePrefix: "archivo", variable: "--font-brand-archivo", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontPlayfair", packageName: "playfair-display", filePrefix: "playfair-display", variable: "--font-brand-playfair", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontMerriweather", packageName: "merriweather", filePrefix: "merriweather", variable: "--font-brand-merriweather", weights: ["400", "700"] },
  { exportName: "brandFontLora", packageName: "lora", filePrefix: "lora", variable: "--font-brand-lora", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontLibreBaskerville", packageName: "libre-baskerville", filePrefix: "libre-baskerville", variable: "--font-brand-libre-baskerville", weights: ["400", "700"] },
  { exportName: "brandFontSourceSerif", packageName: "source-serif-4", filePrefix: "source-serif-4", variable: "--font-brand-source-serif", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontCormorant", packageName: "cormorant-garamond", filePrefix: "cormorant-garamond", variable: "--font-brand-cormorant", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontFraunces", packageName: "fraunces", filePrefix: "fraunces", variable: "--font-brand-fraunces", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontInstrumentSerif", packageName: "instrument-serif", filePrefix: "instrument-serif", variable: "--font-brand-instrument-serif", weights: ["400"] },
  { exportName: "brandFontSourceCodePro", packageName: "source-code-pro", filePrefix: "source-code-pro", variable: "--font-source-code-pro", weights: ["400", "500", "600", "700"] },
  { exportName: "brandFontJetbrains", packageName: "jetbrains-mono", filePrefix: "jetbrains-mono", variable: "--font-jetbrains-mono", weights: ["400", "500", "600", "700"], preload: true },
  { exportName: "brandFontIbmPlexMono", packageName: "ibm-plex-mono", filePrefix: "ibm-plex-mono", variable: "--font-brand-ibm-plex-mono", weights: ["400", "500", "600", "700"], preload: true },
];

fs.mkdirSync(assetsDir, { recursive: true });

const lines = [
  "/**",
  " * Self-hosted brand fonts via next/font/local (generated — do not edit by hand).",
  " * Regenerate: node scripts/generate-brand-font-loaders.mjs",
  " */",
  'import localFont from "next/font/local";',
  "",
];

for (const font of FONTS) {
  const destDir = path.join(assetsDir, font.packageName);
  fs.mkdirSync(destDir, { recursive: true });
  const srcEntries = [];

  for (const weight of font.weights) {
    const fileName = `${font.filePrefix}-latin-${weight}-normal.woff2`;
    const from = path.join(
      root,
      "node_modules",
      `@fontsource/${font.packageName}`,
      "files",
      fileName,
    );
    const to = path.join(destDir, fileName);
    if (!fs.existsSync(from)) {
      console.error(`Missing font file: ${from}`);
      process.exit(1);
    }
    fs.copyFileSync(from, to);
    const relPath = `../assets/brand-fonts/${font.packageName}/${fileName}`;
    srcEntries.push(
      `    { path: "${relPath}", weight: "${weight}", style: "normal" },`,
    );
  }

  lines.push(`export const ${font.exportName} = localFont({`);
  lines.push("  src: [");
  lines.push(...srcEntries);
  lines.push(`  ],`);
  lines.push(`  variable: "${font.variable}",`);
  lines.push(`  display: "swap",`);
  lines.push(`  preload: ${font.preload ? "true" : "false"},`);
  lines.push("});");
  lines.push("");
}

lines.push("/** Apply on <html> so every brand CSS variable is defined app-wide. */");
lines.push("export const brandFontVariablesClassName = [");
for (const font of FONTS) {
  lines.push(`  ${font.exportName},`);
}
lines.push("]");
lines.push("  .map((font) => font.variable)");
lines.push('  .join(" ");');
lines.push("");

fs.writeFileSync(outFile, lines.join("\n"));
console.log(`Wrote ${outFile} and copied fonts to ${assetsDir}`);
