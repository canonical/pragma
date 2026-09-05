import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LENS_FILTER, type LensFilter } from "./lensFilter.js";

/**
 * THE ONE CONTEXT IN THIS LENS, and the constraint that forced it.
 *
 * The spec's judgement was "lifted state and props, not context — UNLESS
 * wiring the strip's Controls forces one". It does, and here is the exact
 * reason, so the next reader does not undo this on principle:
 *
 * The mode strip is rendered by `Shell`, which reads the active route's
 * static `meta` and mounts the claimed `Controls`/`Status` components
 * itself. The strip therefore lives OUTSIDE the page's React subtree — a
 * sibling of the canvas, not a descendant. `StripSlotsEntry` is plain
 * route data (component TYPES, never elements), so there is no prop path
 * from `DefinitionsExplorer` up to the chips: the toolbar is mounted by
 * the frame, above the state it needs to read and write.
 *
 * Props cannot cross that boundary. Context can, and it is the smallest
 * mechanism that does: no store, no router change, no widening of the
 * strip handshake (which would make every future lens pay for this one's
 * needs). The provider wraps the Shell (see `routes.tsx`), so the chips
 * and the canvas share ONE filter.
 *
 * WHAT THIS CONTEXT DELIBERATELY DOES NOT CARRY: the graph data. An
 * earlier attempt had the explorer ANNOUNCE its ontologies here, which
 * could only happen in an effect — client-only, after paint — so the strip
 * rendered empty on the server and populated on the client: a hydration
 * mismatch in the frame itself, caught by the frame certification. The
 * strip instead reads the same Relay operation from the same warm store
 * (see `stripSlots.tsx`). This context holds ONLY the reader's ephemeral
 * choices, which is all that genuinely needs sharing.
 *
 * THE SSR DETERMINISM RULE. The initial value is `DEFAULT_LENS_FILTER`,
 * whose `namespaces` is empty — read by every consumer as "no chip has
 * been touched, so show everything", exactly as the explorer's own seed
 * does. It is therefore a no-op producing byte-identical markup on both
 * sides. Nothing here may be seeded from `localStorage`, `window` or the
 * query string.
 *
 * The fallback matters too: a consumer outside any provider degrades to
 * the same no-op rather than throwing, so a stray mount can never take the
 * shell down.
 */

/** What the lens's consumers share: the filter and the way to change it. */
export interface LensFilterValue {
  readonly filter: LensFilter;
  readonly setFilter: (next: LensFilter) => void;
}

const FALLBACK: LensFilterValue = {
  filter: DEFAULT_LENS_FILTER,
  setFilter: () => {},
};

const LensFilterContext = createContext<LensFilterValue>(FALLBACK);

export interface LensFilterProviderProps {
  readonly children: ReactNode;
}

export const LensFilterProvider = ({
  children,
}: LensFilterProviderProps): ReactNode => {
  const [filter, setFilter] = useState<LensFilter>(DEFAULT_LENS_FILTER);
  const value = useMemo<LensFilterValue>(
    () => ({ filter, setFilter }),
    [filter],
  );
  return (
    <LensFilterContext.Provider value={value}>
      {children}
    </LensFilterContext.Provider>
  );
};

/** Read the lens's filter. Degrades to the no-op default outside a
 * provider (see the module doc) rather than throwing. */
export const useLensFilter = (): LensFilterValue =>
  useContext(LensFilterContext);
