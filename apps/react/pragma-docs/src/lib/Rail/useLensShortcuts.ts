/**
 * The keyboard grammar's lens digits (A.06 §9: `1–5` switch lenses),
 * wired as an EPHEMERAL document listener — attach on mount, detach on
 * unmount, no stored state anywhere (P-D7: the destination is URL state,
 * owned by the router; the listener itself owns nothing).
 *
 * Guards, in check order: no modifier chords (the browser's own
 * `Alt+digit` etc. stay untouched); no firing mid-IME-composition (the
 * digit is text being composed, not a command) or on key auto-repeat (a
 * held digit navigates once); no firing while the user types in an
 * editable target — digits belong to the text field then, not the
 * compass.
 *
 * WCAG 2.1.4 close-out (user disable toggle in the utility cluster) is
 * deferred — the guards here narrow the surface, they do not satisfy 2.1.4.
 */

import { useRouter } from "@canonical/router-react";
import { useEffect } from "react";
import { LENS_ENTRIES, type LensEntry } from "./constants.js";

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
};

export const useLensShortcuts = (): void => {
  const router = useRouter();
  // `NavigateFn` is an intersection of one overload per route name, which a
  // UNION of names cannot select from. Every lens route is parameterless, so
  // collapsing the intersection to the union member's shape is sound.
  const navigate = router.navigate as (to: LensEntry["to"]) => unknown;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (event.isComposing || event.repeat) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      const entry = LENS_ENTRIES.find((lens) => lens.hint === event.key);
      if (entry === undefined) {
        return;
      }
      event.preventDefault();
      navigate(entry.to);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);
};
