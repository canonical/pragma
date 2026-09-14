const HIGHLIGHTED_ENTRY_SELECTOR =
  '[data-contextual-menu-entry][data-highlighted="true"]';
const PANEL_FOCUSABLE_SELECTOR =
  'input, select, textarea, button, a[href], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * The currently highlighted menu entry under `root`, if any.
 */
export const getHighlightedMenuEntry = (root: ParentNode): HTMLElement | null =>
  root.querySelector<HTMLElement>(HIGHLIGHTED_ENTRY_SELECTOR);

/**
 * Where DOM focus should land for a highlighted entry. A panel is not a
 * command row: focus the first native control inside it, otherwise the entry
 * itself.
 */
export const getMenuEntryFocusTarget = (
  item: HTMLElement | null,
): HTMLElement | null => {
  if (!item) return null;
  if (!item.matches("[data-contextual-menu-panel]")) return item;
  return item.querySelector<HTMLElement>(PANEL_FOCUSABLE_SELECTOR) ?? item;
};
