export const ADDON_ID = "storybook-addon-utils";
export const TOOL_ID = `${ADDON_ID}/tool`;

// Global keys — addon owns these
export const KEY_GRID = "grid";
export const KEY_SCHEME = "scheme";
export const KEY_BASELINE = "baseline";
export const KEY_OUTLINES = "outlines";
export const KEY_DENSITY = "density";
export const KEY_CONTEXT = "context";

export type GridMode = "none" | "intrinsic" | "responsive";
export const GRID_MODES: GridMode[] = ["none", "intrinsic", "responsive"];

export type SchemeMode = "none" | "light" | "dark";
export const SCHEME_MODES: SchemeMode[] = ["none", "light", "dark"];

// Density modifier. Defaults to "comfortable" — a control always has a density;
// there is no "none".
export type DensityMode = "comfortable" | "dense";
export const DENSITY_MODES: DensityMode[] = ["comfortable", "dense"];
export const DEFAULT_DENSITY: DensityMode = "comfortable";

// Context (surface) modifier. Defaults to "app" (the base surface); there is no
// "none" — a surface is always one of app/site/docs.
export type ContextMode = "app" | "site" | "docs";
export const CONTEXT_MODES: ContextMode[] = ["app", "site", "docs"];
export const DEFAULT_CONTEXT: ContextMode = "app";

/**
 * Class-name maps for each modifier: mode value → the class it applies (null =
 * apply no class, e.g. the "none"/default option). `withUtilStyles` reads these
 * instead of hard-coding `.light`/`.dense`/… inline, so adding a modifier value
 * only touches this file. Keyed by mode; every value in the *_MODES array must
 * have an entry.
 */
export const SCHEME_CLASSES: Record<SchemeMode, string | null> = {
  none: null,
  light: "light",
  dark: "dark",
};

export const DENSITY_CLASSES: Record<DensityMode, string | null> = {
  comfortable: "comfortable",
  dense: "dense",
};

export const GRID_CLASSES: Record<GridMode, string | null> = {
  none: null,
  intrinsic: "intrinsic",
  responsive: "responsive",
};

export const CONTEXT_CLASSES: Record<ContextMode, string | null> = {
  app: "app",
  site: "site",
  docs: "docs",
};
