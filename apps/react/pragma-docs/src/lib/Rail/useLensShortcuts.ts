/**
 * The keyboard grammar's lens digits (A.06 §9: `1–5` switch lenses),
 * wired as an EPHEMERAL document listener — attach on mount, detach on
 * unmount, no stored state anywhere (P-D7: the destination is URL state,
 * owned by the router; the listener itself owns nothing).
 *
 * The allocation comes from the ROUTE TABLE, not from a table beside it:
 * each lens route claims its own digit (`#lib/routeShortcut`) and this hook
 * collects them off `useRouter().routes`. The routes arrive through the
 * hook rather than through an `appRoutes` import on purpose — `routes.tsx`
 * imports Shell, Shell imports Rail, so importing back would close a cycle
 * that ESM survives only by accident of laziness. The hook also reflects
 * the table the router is ACTUALLY running, which is what makes the digits
 * derived rather than merely parallel.
 *
 * The hook RETURNS the allocation so the rail can display exactly what it
 * wires: one walk per render, one source, no way for the shown digit and
 * the live digit to disagree.
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

import type { RouteName } from "@canonical/router-core";
import { type RegisteredRouteMap, useRouter } from "@canonical/router-react";
import { useEffect, useMemo } from "react";
import {
  collectShortcuts,
  type ShortcutAllocation,
} from "#lib/routeShortcut/index.js";

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
};

// Named through the router's REGISTERED map rather than by importing
// `AppRoutes`: same precision, and `#lib` keeps knowing nothing about the
// app's route module (which imports Shell, which imports this rail).
export const useLensShortcuts = (): ShortcutAllocation<
  RouteName<RegisteredRouteMap>
> => {
  const router = useRouter();
  // Keyed on the route table, a stable object reference for the router's
  // lifetime — so the walk, and the invariants it enforces, run once.
  const allocation = useMemo(
    () => collectShortcuts(router.routes),
    [router.routes],
  );
  // `NavigateFn` is an intersection of one overload per route name, which a
  // UNION of names cannot select from. Every shortcut-bearing route is
  // parameterless — no longer by assumption but by `collectShortcuts`' own
  // invariant, which throws on a `:param` route that claims a key — so
  // collapsing the intersection to the union member's shape is sound.
  const navigate = router.navigate as (to: string) => unknown;

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
      const name = allocation.byKey.get(event.key);
      if (name === undefined) {
        return;
      }
      event.preventDefault();
      navigate(name);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate, allocation]);

  return allocation;
};
