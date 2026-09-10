export interface UseCollapseShortcutProps {
  /**
   * Whether the shortcut listener is attached at all. Defaults to `false` —
   * the spec's own prose is self-contradictory on the key (states "Ctrl + E",
   * then argues for a single letter instead, in the same paragraph), so this
   * ships disabled pending a design ruling (the 24.04 spec §5, §10.1).
   */
  enabled?: boolean;
  /** Called when the shortcut is triggered. */
  onTrigger: () => void;
}

/** The hook attaches a window listener as a side effect; it returns nothing. */
export type UseCollapseShortcutResult = undefined;
