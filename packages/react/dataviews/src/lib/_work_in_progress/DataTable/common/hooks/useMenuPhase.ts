import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MenuPhase, UseMenuPhaseResult } from "./types.js";

/**
 * A menu's phase, and the focus that goes with it: the menu mounts
 * only while it is open, its mounted button holds the focus its placeholder
 * had until the menu moves it to the first item, and closing hands focus
 * back to the placeholder that returns.
 */
export default function useMenuPhase(): UseMenuPhaseResult {
  const [phase, setPhase] = useState<MenuPhase>("closed");
  // The button its cell holds while the menu is not mounted, and whether
  // the menu has just closed: its button then takes back the focus the menu
  // returned to a trigger that is no longer there.
  const placeholder = useRef<HTMLButtonElement>(null);
  const reclaimFocus = useRef(false);
  // The mounted menu's root, and whether its button should take the focus
  // the placeholder had: the placeholder unmounts as the menu mounts, and the
  // menu moves focus to its first item only frames after it opens, so focus
  // would otherwise sit on the document in between.
  const menuRoot = useRef<HTMLDivElement>(null);
  const focusOnMount = useRef(false);
  useLayoutEffect(() => {
    if (phase === "closed" && reclaimFocus.current) {
      reclaimFocus.current = false;
      placeholder.current?.focus();
    }
    if (phase === "mounting" && focusOnMount.current) {
      focusOnMount.current = false;
      // By the contract the menu's trigger states, not its class name.
      menuRoot.current
        ?.querySelector<HTMLButtonElement>(
          ":scope > button[aria-haspopup='menu']",
        )
        ?.focus();
    }
  }, [phase]);
  // Opened one commit after the menu mounts closed. The menu moves its
  // surface into a portal in its own first commit after mounting; this open
  // lands in that same re-render, so the menu opens in the portal and its
  // first item takes focus there. Mounted open, it would focus an item in
  // the inline surface that move discards.
  useEffect(() => {
    if (phase === "mounting") {
      setPhase("open");
    }
  }, [phase]);
  const openMenu = useCallback((trigger: HTMLButtonElement) => {
    focusOnMount.current = trigger.ownerDocument.activeElement === trigger;
    setPhase("mounting");
  }, []);
  // What the menu reports is only ever its closing: it is opened through
  // its `open` prop, which reports nothing, and it unmounts as it closes, so
  // it is never mounted closed to report opening. Closed, it drops its
  // surface, its observers and its window listeners until it is opened
  // again, and its button takes back the focus.
  const closeMenu = useCallback(() => {
    reclaimFocus.current = true;
    setPhase("closed");
  }, []);
  return { phase, placeholder, menuRoot, openMenu, closeMenu };
}
