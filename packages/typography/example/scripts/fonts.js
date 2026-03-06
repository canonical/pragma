/**
 * Font registry – consumed by sidebar.js.
 *
 * Each entry carries the three metric values the baseline engine needs
 * (ascender, descender, unitsPerEm) as extracted by `extractFontData.ts`.
 *
 * `source` tells the loader how to make the font available:
 *   - "local"  → a @font-face is injected pointing at `file`
 *   - "google" → a <link> is injected with the Google Fonts `url`
 *
 * All Ubuntu Sans variants share the same vertical metrics (940 / -260 / 1000).
 * Inter and Roboto have their own distinct metrics.
 */
export const fonts = [
  // ── Ubuntu Sans family (local) ────────────────────────────────
  {
    name: "Ubuntu Sans Regular",
    family: "Ubuntu Sans",
    source: "local",
    file: "./fonts/UbuntuSans-Regular.woff2",
    weight: 400,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Ubuntu Sans Bold",
    family: "Ubuntu Sans Bold",
    source: "local",
    file: "./fonts/UbuntuSans-Bold.woff2",
    weight: 700,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Ubuntu Sans Italic",
    family: "Ubuntu Sans Italic",
    source: "local",
    file: "./fonts/UbuntuSans-Italic.woff2",
    weight: 400,
    style: "italic",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Ubuntu Sans Bold Italic",
    family: "Ubuntu Sans Bold Italic",
    source: "local",
    file: "./fonts/UbuntuSans-BoldItalic.woff2",
    weight: 700,
    style: "italic",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Ubuntu Sans Light",
    family: "Ubuntu Sans Light",
    source: "local",
    file: "./fonts/UbuntuSans-Light.woff2",
    weight: 300,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Ubuntu Sans Medium",
    family: "Ubuntu Sans Medium",
    source: "local",
    file: "./fonts/UbuntuSans-Medium.woff2",
    weight: 500,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },

  // ── Ubuntu Sans Condensed (local) ────────────────────────────
  {
    name: "Ubuntu Sans Condensed",
    family: "Ubuntu Sans Condensed",
    source: "local",
    file: "./fonts/UbuntuSansCondensed-Regular.woff2",
    weight: 400,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Ubuntu Sans Condensed Bold",
    family: "Ubuntu Sans Condensed Bold",
    source: "local",
    file: "./fonts/UbuntuSansCondensed-Bold.woff2",
    weight: 700,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },

  // ── Inter (local) ────────────────────────────────────────────
  {
    name: "Inter",
    family: "Inter",
    source: "local",
    file: "./fonts/Inter-Regular.woff2",
    weight: 400,
    style: "normal",
    metrics: { ascender: 1984, descender: -494, unitsPerEm: 2048 },
  },

  // ── Google Fonts (remote) ────────────────────────────────────
  {
    name: "Lato",
    family: "Lato",
    source: "google",
    url: "https://fonts.googleapis.com/css2?family=Lato:wght@400&display=swap",
    weight: 400,
    style: "normal",
    metrics: { ascender: 940, descender: -260, unitsPerEm: 1000 },
  },
  {
    name: "Roboto",
    family: "Roboto",
    source: "google",
    url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap",
    weight: 400,
    style: "normal",
    metrics: { ascender: 1900, descender: -500, unitsPerEm: 2048 },
  },
];
