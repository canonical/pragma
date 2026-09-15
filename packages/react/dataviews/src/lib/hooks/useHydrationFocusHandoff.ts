import { useLayoutEffect, useRef } from "react";
import type {
  UseHydrationFocusHandoffProps,
  UseHydrationFocusHandoffResult,
} from "./types.js";

/**
 * The refs of a link a server renders and of the button that replaces it
 * once scripts take over, and the handoff between them: whether the link
 * held focus is noted before hydration, and the button takes that focus
 * after, so a reader who tabbed to the link while the page loaded is not left
 * on nothing. Focus the link did not hold stays where it is.
 *
 * @note Impure: moves focus to the button in a layout effect.
 */
export default function useHydrationFocusHandoff({
  hydrated,
}: UseHydrationFocusHandoffProps): UseHydrationFocusHandoffResult {
  const link = useRef<HTMLAnchorElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const linkHadFocus = useRef(false);
  useLayoutEffect(() => {
    if (!hydrated) {
      linkHadFocus.current =
        link.current !== null &&
        link.current === link.current.ownerDocument.activeElement;
      return;
    }
    if (linkHadFocus.current) {
      linkHadFocus.current = false;
      button.current?.focus();
    }
  }, [hydrated]);
  return { link, button };
}
