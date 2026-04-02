import type { DomainColorPair } from "./types.js";

/**
 * Per-domain color assignments for TUI rendering.
 *
 * Each domain gets a distinct hue. Class-level labels (e.g., "Component",
 * "Token") use the background variant; instance values (e.g., "Button",
 * "color.primary") use the foreground text variant of the same hue.
 * This creates visual coherence within a domain while distinguishing
 * domains from each other.
 */
export const DOMAIN_COLORS: Readonly<Record<string, DomainColorPair>> = {
  block: { classBg: "bgBlue", instanceFg: "blue" },
  token: { classBg: "bgGreen", instanceFg: "green" },
  modifier: { classBg: "bgYellow", instanceFg: "yellow" },
  standard: { classBg: "bgCyan", instanceFg: "cyan" },
  tier: { classBg: "bgMagenta", instanceFg: "magenta" },
  ontology: { classBg: "bgWhite", instanceFg: "white" },
};

/** Box-drawing characters for card borders and separators. */
export const BOX = {
  topLeft: "╔",
  topRight: "╗",
  bottomLeft: "╚",
  bottomRight: "╝",
  horizontal: "═",
  vertical: "║",
  dividerLeft: "╠",
  dividerRight: "╣",
  dividerHorizontal: "─",
  thinVertical: "│",
} as const;

/** Column gap width (characters between columns in list view). */
export const COL_GAP = 2;

/** Minimum width for any visible column (characters). */
export const MIN_COL_WIDTH = 8;
