import { create } from "storybook/theming";
// Two assets, one per theme. The mark is identical in both; only the wordmark
// differs — black for light chrome, white for dark — and that difference is
// load-bearing. `brandImage` renders as an <img> from a data URI, which cannot
// inherit a colour from the manager, so the wordmark cannot follow the theme
// unless there are two files.
import canonicalDarkLogo from "../assets/canonical-dark.svg?inline";
import canonicalLightLogo from "../assets/canonical-light.svg?inline";
import { tokens } from "./tokens.js";

/**
 * SURFACE MAPPING — read before changing an `app*Bg`.
 *
 * The design system's surfaces work by DOM nesting: a `.surface` inside a
 * `.surface` picks up layer 2 through CSS custom properties. Storybook's chrome
 * cannot participate in that — it is themed from a JavaScript object of literal
 * values (see tokens.ts on the polished.js constraint) — so we mirror the
 * RESOLVED values of the surface scale rather than joining the cascade.
 *
 * Content is surface 1; chrome is surface 2:
 *
 *   appContentBg / appPreviewBg  surface 1  --color-background         #ffffff / #1d1d1d
 *   appBg / barBg                surface 2  --color-background-layer2  #f8f8f8 / #131313
 *
 * Why chrome sits DEEPER than the content it frames, which reads backwards at
 * first glance:
 *
 *  1. The sidebar does not contain the content column — they are siblings in
 *     the DOM. Surface depth here is a borrowed palette, not a nesting claim,
 *     so it is free to follow the design system's semantics instead.
 *  2. The design system already places navigation chrome at layer 2:
 *     `--color-foreground-navigation-primary` resolves to exactly the layer-2
 *     pair. `appHoverBg` below is that token's `-hover` variant, so anchoring
 *     the sidebar anywhere else mismatches the scales. Against surface 1 the
 *     dark hover is #1f1f1f on #1d1d1d — a 2-in-255 delta, invisible.
 *  3. Storybook's own light and dark themes do the same: chrome recedes, the
 *     reading surface advances.
 *
 * The scale is three deep and NON-MONOTONIC — layer 3 returns to layer 1's
 * values — so it offers two usable tones, not a gradient. Sidebar and toolbar
 * therefore share a tone and are separated by `appBorderColor`, rather than by
 * an invented third surface. See SurfacesAndThemes.mdx in storybook-hub.
 */
const BASE_THEME = {
  fontBase: "var(--font-ubuntu-sans)",
  fontCode: "var(--font-ubuntu-sans-mono)",
  // --dimension-radius-medium is 0 across the design system; these are not
  // arbitrary squared corners.
  appBorderRadius: 0,
  inputBorderRadius: 0,
};

const LIGHT_THEME = create({
  ...BASE_THEME,
  base: "light",
  brandImage: canonicalLightLogo,

  // Colors. `colorSecondary` is Storybook's single accent slot — it drives
  // sidebar selection, focus rings, and the hover/active text of the toolbar's
  // ghost buttons (the controls our addons contribute). A Canonical theme owns
  // that slot, so it is the branded token rather than the link blue it used to
  // be; blue was only ever there because it was the nearest available colour.
  colorPrimary: tokens.semanticColorLightBrandPrimary,
  colorSecondary: tokens.semanticColorLightTextBranded,

  // UI — see the SURFACE MAPPING note above.
  appBg: tokens.semanticColorLightBackgroundLayer2, // chrome — surface 2
  appContentBg: tokens.semanticColorLightBackground, // content — surface 1
  appPreviewBg: tokens.semanticColorLightBackground, // content — surface 1
  appBorderColor: tokens.semanticColorLightBorderMuted,
  appHoverBg: tokens.semanticColorLightForegroundNavigationPrimaryHover,

  // Text
  textColor: tokens.semanticColorLightText,
  textInverseColor: tokens.semanticColorLightTextOnForegroundPrimary,
  textMutedColor: tokens.semanticColorLightTextMuted,

  // Toolbar
  barTextColor: tokens.semanticColorLightText,
  // barSelectedColor is the active addon-panel tab's label, and a 7%-opacity
  // wash behind an active toolbar button. It was previously the same black as
  // barTextColor, leaving the active tab with no accent at all.
  barSelectedColor: tokens.semanticColorLightTextBranded,
  barHoverColor: tokens.semanticColorLightText,
  barBg: tokens.semanticColorLightForegroundNavigationPrimary, // chrome — layer-2 pair

  // Buttons sit ON the content surface, so they take the chrome tone — the
  // resting ghost-branded token resolves to surface 1, identical to
  // appContentBg, which would leave a button with no fill at all on a docs page.
  buttonBg: tokens.semanticColorLightBackgroundLayer2,
  buttonBorder: tokens.semanticColorLightBorderBranded,

  // Boolean (toggle) inputs. `booleanBg` is the track, which has a purpose-built
  // token. `booleanSelectedBg` is Storybook's selected segment and has no direct
  // counterpart — the design system's switch-selected colour is blue, which here
  // would read as a different control — so it stays on the input fill.
  booleanBg: tokens.semanticColorLightForegroundSwitchUnselected,
  booleanSelectedBg: tokens.semanticColorLightForegroundInput,

  // Form inputs
  inputBg: tokens.semanticColorLightForegroundInput,
  inputBorder: tokens.semanticColorLightBorder,
  inputTextColor: tokens.semanticColorLightText,
});

const DARK_THEME = create({
  ...BASE_THEME,
  base: "dark",
  brandImage: canonicalDarkLogo,

  // Colors — see LIGHT_THEME on owning the accent slot.
  colorPrimary: tokens.semanticColorDarkBrandPrimary,
  colorSecondary: tokens.semanticColorDarkTextBranded,

  // UI — same surface mapping as LIGHT_THEME.
  appBg: tokens.semanticColorDarkBackgroundLayer2, // chrome — surface 2
  appContentBg: tokens.semanticColorDarkBackground, // content — surface 1
  appPreviewBg: tokens.semanticColorDarkBackground, // content — surface 1
  appBorderColor: tokens.semanticColorDarkBorderMuted,
  appHoverBg: tokens.semanticColorDarkForegroundNavigationPrimaryHover,

  // Text
  textColor: tokens.semanticColorDarkText,
  textInverseColor: tokens.semanticColorDarkTextOnForegroundPrimary,
  textMutedColor: tokens.semanticColorDarkTextMuted,

  // Toolbar
  barTextColor: tokens.semanticColorDarkText,
  // See LIGHT_THEME — the active toolbar tab carries the branded accent.
  barSelectedColor: tokens.semanticColorDarkTextBranded,
  barHoverColor: tokens.semanticColorDarkText,
  barBg: tokens.semanticColorDarkForegroundNavigationPrimary, // chrome — layer-2 pair

  // See LIGHT_THEME — chrome tone, so the fill reads against the content.
  buttonBg: tokens.semanticColorDarkBackgroundLayer2,
  buttonBorder: tokens.semanticColorDarkBorderBranded,

  // Boolean (toggle) inputs — see LIGHT_THEME.
  booleanBg: tokens.semanticColorDarkForegroundSwitchUnselected,
  booleanSelectedBg: tokens.semanticColorDarkForegroundInput,

  // Form inputs
  inputBg: tokens.semanticColorDarkForegroundInput,
  inputBorder: tokens.semanticColorDarkBorder,
  inputTextColor: tokens.semanticColorDarkText,
});

export const THEME = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
} as const;
