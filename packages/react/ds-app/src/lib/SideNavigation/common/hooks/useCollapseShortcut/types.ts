export interface UseCollapseShortcutProps {
  /**
   * Whether the shortcut listener is attached. Defaults to `false` at the
   * hook level; `SideNavigation` passes its own `keyboardShortcut` prop
   * (default `true`).
   */
  enabled?: boolean;
  /** Called when the shortcut is triggered. */
  onTrigger: () => void;
}

/** The hook attaches a window listener as a side effect; it returns nothing. */
export type UseCollapseShortcutResult = undefined;
