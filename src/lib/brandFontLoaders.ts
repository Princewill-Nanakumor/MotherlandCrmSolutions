/**
 * Self-hosted brand fonts via next/font (served from /_next/static).
 * Options must be literal objects — next/font forbids spreads.
 * preload: false so only the active family is downloaded when CSS uses it.
 */
import {
  Archivo,
  Barlow,
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Lato,
  Lexend,
  Libre_Baskerville,
  Lora,
  Merriweather,
  Montserrat,
  Nunito,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Rubik,
  Sora,
  Source_Code_Pro,
  Source_Sans_3,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";

export const brandFontSpaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  preload: false,
});

export const brandFontInter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-brand-inter",
});

export const brandFontDmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-dm-sans",
});

export const brandFontPlusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-plus-jakarta",
});

export const brandFontPoppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-poppins",
});

export const brandFontNunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-nunito",
});

export const brandFontRubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-rubik",
});

export const brandFontSourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-source-sans",
});

export const brandFontIbmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-ibm-plex",
});

export const brandFontOutfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-outfit",
});

export const brandFontSora = Sora({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-sora",
});

export const brandFontLexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-lexend",
});

export const brandFontLato = Lato({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  variable: "--font-brand-lato",
});

export const brandFontMontserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-montserrat",
});

export const brandFontRaleway = Raleway({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-raleway",
});

export const brandFontBarlow = Barlow({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-barlow",
});

export const brandFontArchivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-archivo",
});

export const brandFontPlayfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-playfair",
});

export const brandFontMerriweather = Merriweather({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  variable: "--font-brand-merriweather",
});

export const brandFontLora = Lora({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-lora",
});

export const brandFontLibreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  variable: "--font-brand-libre-baskerville",
});

export const brandFontSourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-source-serif",
});

export const brandFontCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-cormorant",
});

export const brandFontFraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-fraunces",
});

export const brandFontInstrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-brand-instrument-serif",
});

export const brandFontSourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-code-pro",
});

export const brandFontJetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
});

export const brandFontIbmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-ibm-plex-mono",
});

/** Apply on <body> so every brand CSS variable is defined app-wide. */
export const brandFontVariablesClassName = [
  brandFontSpaceGrotesk.variable,
  brandFontInter.variable,
  brandFontDmSans.variable,
  brandFontPlusJakarta.variable,
  brandFontPoppins.variable,
  brandFontNunito.variable,
  brandFontRubik.variable,
  brandFontSourceSans.variable,
  brandFontIbmPlex.variable,
  brandFontOutfit.variable,
  brandFontSora.variable,
  brandFontLexend.variable,
  brandFontLato.variable,
  brandFontMontserrat.variable,
  brandFontRaleway.variable,
  brandFontBarlow.variable,
  brandFontArchivo.variable,
  brandFontPlayfair.variable,
  brandFontMerriweather.variable,
  brandFontLora.variable,
  brandFontLibreBaskerville.variable,
  brandFontSourceSerif.variable,
  brandFontCormorant.variable,
  brandFontFraunces.variable,
  brandFontInstrumentSerif.variable,
  brandFontSourceCodePro.variable,
  brandFontJetbrains.variable,
  brandFontIbmPlexMono.variable,
].join(" ");
