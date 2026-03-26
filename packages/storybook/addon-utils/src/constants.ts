export const ADDON_ID = "storybook-addon-utils";
export const TOOL_ID = `${ADDON_ID}/tool`;

// Global keys — addon owns these
export const KEY_GRID = "grid";
export const KEY_SCHEME = "scheme";
export const KEY_BASELINE = "baseline";
export const KEY_OUTLINES = "outlines";

export type GridMode = "none" | "intrinsic" | "responsive";
export const GRID_MODES: GridMode[] = ["none", "intrinsic", "responsive"];

export type SchemeMode = "none" | "light" | "dark";
export const SCHEME_MODES: SchemeMode[] = ["none", "light", "dark"];
