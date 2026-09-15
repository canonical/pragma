import { type ToggleEvent, useLayoutEffect, useRef, useState } from "react";
import { useIsHydrated } from "../../../hooks/index.js";
import type {
  UseMoreFiltersPinProps,
  UseMoreFiltersPinResult,
} from "./types.js";

/**
 * The placement More filters holds while it stays open: the fields shown by
 * default when it opened, under the marks they were placed under, so no
 * control moves in or out of it while a reader works inside. A pin placed
 * under other marks places nothing, since the marks moved it. The pin is set
 * as the disclosure toggles, and, where a reader opened it before scripts
 * took over and no toggle was heard, in the commit where the filters hydrate.
 *
 * @note Impure: reads the disclosure's open state from the document.
 */
export default function useMoreFiltersPin({
  marks,
  listShownFields,
}: UseMoreFiltersPinProps): UseMoreFiltersPinResult {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const hydrated = useIsHydrated();
  const [pin, setPin] = useState<{
    readonly marks: string;
    readonly fields: ReadonlySet<string>;
  } | null>(null);
  /** The pin an opening places: the fields shown by default as it opens. */
  const pinShownFields = () => ({ marks, fields: new Set(listShownFields()) });
  const handleToggle = (event: ToggleEvent<HTMLDetailsElement>): void => {
    setPin(event.currentTarget.open ? pinShownFields() : null);
  };
  // Opened before scripts took over, the disclosure's toggle had no listener
  // to place its pin: in the commit where the filters hydrate, an open
  // disclosure with no pin is pinned as its opening would have pinned it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: hydrated is the trigger; later pins are the toggle's to place
  useLayoutEffect(() => {
    if (hydrated && pin === null && detailsRef.current?.open === true) {
      setPin(pinShownFields());
    }
  }, [hydrated]);
  return {
    pinned: pin?.marks === marks ? pin.fields : null,
    detailsRef,
    handleToggle,
  };
}
