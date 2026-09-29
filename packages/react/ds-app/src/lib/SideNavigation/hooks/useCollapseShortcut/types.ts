export interface UseCollapseShortcutProps {
  /**
   * The condition that activates the shortcut's listener — named for the
   * state it represents, not a bare on/off switch. Defaults to `false`;
   * `SideNavigation` passes its own `keyboardShortcut` prop (default
   * `true`).
   */
  condition?: boolean;
  /** Called when the shortcut is triggered. */
  onTrigger: () => void;
}

/** The hook attaches a window listener as a side effect; it returns nothing. */
export type UseCollapseShortcutResult = undefined;
