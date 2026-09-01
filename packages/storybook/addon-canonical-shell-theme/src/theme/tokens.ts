/**
 * Design tokens for the Storybook shell theme.
 *
 * Source: @canonical/design-tokens — dist/modifiers.theme.css for the semantic
 * light/dark pairs, dist/sets.primitive.css for the palette entries they
 * resolve to.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE EDITING A VALUE BY HAND.
 *
 * There are NO hex values anywhere in the design tokens. Every palette entry is
 * an `oklch()` literal, so EVERY hex below is a colour-space conversion, not a
 * copy. Do not "read the hex off the token" — there is none to read.
 *
 * This table was previously wrong in 18 of its 30 values. Twelve of those were
 * a single mistake repeated: the conversion was floor-truncated instead of
 * rounded, so each channel landed one low (`#e9531f` is the floor of
 * 233.005, 83.989, 31.951 — the correct Ubuntu orange is `#e95420`). The rest
 * were mis-mappings: two `light-dark()` pairs recorded as if mode-invariant,
 * and the dark background and container colours transposed.
 *
 * If you must convert by hand: OKLab → linear sRGB → gamma, and ROUND. Every
 * value here lands within 0.03 of an integer channel, so a correct conversion
 * is never ambiguous.
 *
 * TODO(PRA-141): generate this table from @canonical/design-tokens at build
 * time, so hand conversion stops being possible.
 * ---------------------------------------------------------------------------
 *
 * All values MUST be hex. Storybook's UI components use polished.js
 * (parseToRgb, opacify, darken, lighten, transparentize) pervasively
 * in styled-components — not just in the theme conversion layer but
 * throughout the manager UI (buttons, tooltips, tabs, etc.).
 * polished.js only supports hex, rgb, rgba, hsl, and hsla.
 * CSS var() and oklch will crash at runtime. This constraint is why the shell
 * theme mirrors resolved values instead of consuming the tokens directly.
 *
 * Each entry records the semantic token it mirrors and the palette token that
 * token resolves to, so the pair can be re-checked against the design tokens.
 * Entries marked "computed" resolve to an `oklch()` literal in the semantic
 * layer itself rather than to a named palette entry; the state tokens among
 * them (`-hover`, `-active`) must stay baked, because the design system derives
 * them at runtime with `oklch(from … calc(l + var(--delta-…)))` in states.css,
 * which Storybook cannot evaluate.
 */

export const tokens = {
  // --color-brand-primary → palette-orange-398 (mode-invariant)
  semanticColorLightBrandPrimary: "#e95420",
  semanticColorDarkBrandPrimary: "#e95420",

  // --color-text-branded → light: palette-orange-590, dark: palette-orange-398.
  // The branded TEXT colour, deliberately darker than --color-brand-primary in
  // light mode. This carries the theme's accent wherever it lands ON text — the
  // active addon-panel tab, and the hover/active label of the toolbar's ghost
  // buttons — so it must clear WCAG AA against barBg. It gives 6.11:1 light and
  // 5.09:1 dark; brand-primary (#e95420) would give only 3.44:1 in light, which
  // is why the accent is not simply the brand orange.
  semanticColorLightTextBranded: "#a9370c",
  semanticColorDarkTextBranded: "#e95420",

  // Surface depth scale (see @canonical/design-tokens
  // dist/modifiers.surfaces.css). Layer 1 is the unsuffixed
  // `--color-background`; nesting a `.surface` inside a `.surface` steps to
  // layer 2, and layer 3 caps the scale by returning to the layer-1 values.

  // Surface 1 — --color-background → light: palette-white, dark: palette-gray-930
  semanticColorLightBackground: "#ffffff",
  semanticColorDarkBackground: "#1d1d1d",

  // Surface 2 — --color-background-layer2 → light: palette-gray-20, dark: palette-gray-960
  semanticColorLightBackgroundLayer2: "#f8f8f8",
  semanticColorDarkBackgroundLayer2: "#131313",

  // Surface 3 — --color-background-layer3 → light: palette-white, dark: palette-gray-930
  semanticColorLightBackgroundLayer3: "#ffffff",
  semanticColorDarkBackgroundLayer3: "#1d1d1d",

  // --color-background-container → light: palette-gray-40, dark: palette-gray-990.
  // NOT part of the surface scale — it is the static-container (media/image
  // placeholder) colour, and in dark mode it is DARKER than surface 1.
  semanticColorLightBackgroundContainer: "#f1f1f1",
  semanticColorDarkBackgroundContainer: "#060606",

  // --color-border → light: palette-gray-520, dark: palette-gray-398
  semanticColorLightBorder: "#717171",
  semanticColorDarkBorder: "#8c8c8c",

  // --color-text → light: palette-black, dark: palette-white
  semanticColorLightText: "#000000",
  semanticColorDarkText: "#ffffff",

  // --color-text-onForegroundPrimary → light: palette-white, dark: palette-black
  semanticColorLightTextOnForegroundPrimary: "#ffffff",
  semanticColorDarkTextOnForegroundPrimary: "#000000",

  // --color-text-muted → light: palette-gray-590, dark: palette-gray-398
  semanticColorLightTextMuted: "#636363",
  semanticColorDarkTextMuted: "#8c8c8c",

  // --color-foreground-navigation-primary → light: palette-gray-20, dark: palette-gray-960
  semanticColorLightForegroundNavigationPrimary: "#f8f8f8",
  semanticColorDarkForegroundNavigationPrimary: "#131313",

  // --color-foreground-navigation-primary-active → light: oklch(92% 0 0), dark: oklch(27% 0 0) (computed)
  semanticColorLightForegroundNavigationPrimaryActive: "#e4e4e4",
  semanticColorDarkForegroundNavigationPrimaryActive: "#262626",

  // --color-foreground-navigation-primary-hover → light: oklch(94% 0 0), dark: oklch(24% 0 0) (computed)
  semanticColorLightForegroundNavigationPrimaryHover: "#ebebeb",
  semanticColorDarkForegroundNavigationPrimaryHover: "#1f1f1f",

  // --color-foreground-ghost-branded-hover → light: oklch(96% 0.04 37.5), dark: oklch(27% 0.0436 38.46) (computed)
  semanticColorLightForegroundGhostBrandedHover: "#ffe9df",
  semanticColorDarkForegroundGhostBrandedHover: "#391f16",

  // --color-foreground-switch-unselected → light: palette-gray-520, dark: palette-gray-398.
  // The purpose-built toggle-track colour. It resolves to the same palette
  // entries as --color-border, so the pixels match what this theme used before;
  // the distinction is provenance, so a future change to either token does not
  // silently drag the other along.
  semanticColorLightForegroundSwitchUnselected: "#717171",
  semanticColorDarkForegroundSwitchUnselected: "#8c8c8c",

  // --color-border-branded → light: palette-orange-520, dark: palette-orange-398
  semanticColorLightBorderBranded: "#c13f0b",
  semanticColorDarkBorderBranded: "#e95420",

  // --color-border-muted → light: palette-gray-100, dark: palette-gray-820
  semanticColorLightBorderMuted: "#dddddd",
  semanticColorDarkBorderMuted: "#363636",

  // --color-foreground-input → light: palette-gray-20, dark: palette-gray-960
  semanticColorLightForegroundInput: "#f8f8f8",
  semanticColorDarkForegroundInput: "#131313",
} as const;
