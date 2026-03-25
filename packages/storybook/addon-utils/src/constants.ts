export const ADDON_ID = "ds-debug-addon";
export const TOOL_ID = `${ADDON_ID}/tool`;

// Global keys
export const KEY_GRID = `${ADDON_ID}/grid`;
export const KEY_SCHEME = `${ADDON_ID}/scheme`;
export const KEY_BASELINE = `${ADDON_ID}/baseline`;
export const KEY_OUTLINES = `${ADDON_ID}/outlines`;

// Cycle modes
export type GridMode = "none" | "intrinsic" | "responsive";
export const GRID_MODES: GridMode[] = ["none", "intrinsic", "responsive"];

export type SchemeMode = "none" | "light" | "dark";
export const SCHEME_MODES: SchemeMode[] = ["none", "light", "dark"];
