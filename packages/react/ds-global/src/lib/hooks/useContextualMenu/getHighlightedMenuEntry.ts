const HIGHLIGHTED_ENTRY_SELECTOR =
  '[data-contextual-menu-entry][data-highlighted="true"]';

/**
 * The currently highlighted menu entry under `root`, if any.
 */
export const getHighlightedMenuEntry = (root: ParentNode): HTMLElement | null =>
  root.querySelector<HTMLElement>(HIGHLIGHTED_ENTRY_SELECTOR);
