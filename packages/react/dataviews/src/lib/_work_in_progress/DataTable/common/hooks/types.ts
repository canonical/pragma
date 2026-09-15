/**
 * Hook domain types the table's common parts share: the phase the header
 * menu and the settings menu each move through.
 */

import type { RefObject } from "react";

/**
 * Where a menu stands: only its button (`closed`), mounted closed for
 * one commit so its surface reaches its portal (`mounting`), or `open`. One
 * value, so the menu can never be open while unmounted.
 */
export type MenuPhase = "closed" | "mounting" | "open";

/** What the menu phase hook gives the menu. */
export type UseMenuPhaseResult = {
  readonly phase: MenuPhase;
  /** The button its cell holds while the menu is not mounted. */
  readonly placeholder: RefObject<HTMLButtonElement | null>;
  /** The mounted menu's root. */
  readonly menuRoot: RefObject<HTMLDivElement | null>;
  /** Mount the menu from its button, carrying the focus that button has. */
  readonly openMenu: (trigger: HTMLButtonElement) => void;
  /** Unmount the menu, handing focus back to its button. */
  readonly closeMenu: () => void;
};
