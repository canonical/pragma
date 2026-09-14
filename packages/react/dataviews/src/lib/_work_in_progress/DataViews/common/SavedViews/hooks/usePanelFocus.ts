import { type FocusEvent, useLayoutEffect, useRef, useState } from "react";
import type {
  SavedViewsPanel,
  UsePanelFocusProps,
  UsePanelFocusResult,
} from "./types.js";

/**
 * The panel beneath the saved-view commands, and where the focus goes when
 * it closes or is stranded.
 *
 * Once nothing is pending, a closed panel returns the focus to the command
 * that opened it, and a control that became unavailable or went away under
 * the focus hands it to the view select — or, while the views are
 * unavailable and the select with them, to Try again. Only focus that was
 * lost is taken back, never from another element the user moved it to. A
 * rename or delete panel closes with the view it was about.
 */
export default function usePanelFocus({
  pending,
  hasView,
}: UsePanelFocusProps): UsePanelFocusResult {
  const [panel, setPanel] = useState<SavedViewsPanel>(null);
  const select = useRef<HTMLSelectElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  // What the focus was last on inside the control, until it leaves. A
  // control disabled or removed under the focus reports no blur, so this
  // finds the focus stranded.
  const focused = useRef<HTMLElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  // Where a closing panel sends the focus: state, so closing always renders.
  const [returnTo, setReturnTo] = useState<HTMLElement | null>(null);

  // A layout effect, so the focus moves in the commit that stranded it,
  // never after a paint.
  useLayoutEffect(() => {
    if (pending) {
      return;
    }
    if (returnTo !== null) {
      // Taking the focus records it as focused; a target that cannot take
      // it leaves the focus stranded where it was.
      returnTo.focus();
      setReturnTo(null);
    }
    const stranded = focused.current;
    if (
      stranded !== null &&
      (!stranded.isConnected || stranded.matches(":disabled"))
    ) {
      focused.current = null;
      const { activeElement, body } = stranded.ownerDocument;
      const lost: readonly (Element | null)[] = [stranded, body, null];
      if (lost.includes(activeElement)) {
        (select.current?.disabled ? retry.current : select.current)?.focus();
      }
    }
  });

  if (!hasView && (panel === "rename" || panel === "remove")) {
    setPanel(null);
  }

  const closePanel = (focus: HTMLElement | null = opener.current): void => {
    setReturnTo(focus);
    setPanel(null);
  };

  return {
    panel,
    openPanel(next, from) {
      opener.current = from;
      setPanel(next);
    },
    closePanel,
    // Never `closePanel` itself as a handler: an event is no focus target.
    cancelPanel() {
      closePanel();
    },
    select,
    opener,
    retry,
    recordFocus(event: FocusEvent<HTMLElement>) {
      focused.current = event.target;
    },
    recordBlur(event: FocusEvent<HTMLElement>) {
      // Focus leaving for nowhere may be its control going away.
      if (event.relatedTarget !== null) {
        focused.current = null;
      }
    },
  };
}
