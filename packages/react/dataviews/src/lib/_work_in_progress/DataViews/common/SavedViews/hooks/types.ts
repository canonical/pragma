/**
 * Hook domain types for the SavedViews part: the panel and focus hook's
 * props and result.
 */

import type { FocusEvent, RefObject } from "react";

/** The panel open beneath the commands, if any. */
export type SavedViewsPanel = "save-as" | "rename" | "remove" | null;

/** What the panel and focus hook takes: the state that closes a panel or holds the focus. */
export type UsePanelFocusProps = {
  /** Whether a command is in flight; the focus waits for it to settle. */
  readonly pending: boolean;
  /** Whether a view is open; a rename or delete panel closes without one. */
  readonly hasView: boolean;
};

/**
 * What the panel and focus hook returns: the open panel, its commands and
 * the refs the focus moves between.
 */
export type UsePanelFocusResult = {
  /** The panel open now, or none. */
  readonly panel: SavedViewsPanel;
  /** Open a panel from the command that asked for it, which the focus returns to. */
  readonly openPanel: (panel: SavedViewsPanel, from: HTMLButtonElement) => void;
  /** Close the panel, sending the focus to the given element or the opener. */
  readonly closePanel: (focus?: HTMLElement | null) => void;
  /** Close the panel from an event handler, back to the opener. */
  readonly cancelPanel: () => void;
  /** The view select, where a stranded focus lands. */
  readonly select: RefObject<HTMLSelectElement | null>;
  /** The command that opened the panel. */
  readonly opener: RefObject<HTMLButtonElement | null>;
  /** Try again, where a stranded focus lands while the select is disabled. */
  readonly retry: RefObject<HTMLButtonElement | null>;
  /** Record where the focus is inside the control, so its loss can be seen. */
  readonly recordFocus: (event: FocusEvent<HTMLElement>) => void;
  /** Record that the focus left an element, and where it went. */
  readonly recordBlur: (event: FocusEvent<HTMLElement>) => void;
};
