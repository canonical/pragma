/**
 * TUI rendering domain for the pragma CLI.
 *
 * Provides Ink-based React components for rich terminal output of list
 * and lookup commands. Activated when stdout is an interactive TTY and
 * no machine-readable format flag is set.
 *
 * @module tui
 */

export { default as createListView } from "./createListView.js";
export { default as createLookupView } from "./createLookupView.js";
export { default as renderInk } from "./renderInk.js";
export type { ListViewProps, LookupViewProps } from "./views/index.js";
export { ListView, LookupView } from "./views/index.js";
