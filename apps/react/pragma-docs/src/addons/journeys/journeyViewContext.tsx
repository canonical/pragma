import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_JOURNEY_VIEW,
  type JourneyView,
} from "./JourneysExplorer/types.js";

/**
 * THE ONE CONTEXT IN THIS LENS, and the constraint that forced it (RULING 1,
 * mirroring the Definitions lens's `lensFilterContext`).
 *
 * The Table ⇄ Graph switch moved out of the canvas and into the mode strip's
 * `controls` socket, exactly as the Definitions chips fill it. The strip is
 * rendered by `Shell`, which reads the active route's static `meta` and
 * mounts the claimed `Controls` component ITSELF — so the toolbar lives
 * OUTSIDE the page's React subtree, a sibling of the canvas rather than a
 * descendant. `StripSlotsEntry` is plain route data (component TYPES, never
 * elements), so there is no prop path from `JourneysExplorer` up to the
 * switch: the toolbar is mounted by the frame, above the state it needs to
 * read and write.
 *
 * Props cannot cross that boundary. Context can, and it is the smallest
 * mechanism that does: no store, no router change, no widening of the strip
 * handshake (which would make every future lens pay for this one's needs).
 * The provider wraps the Shell (see `routes.tsx`), so the switch and the
 * canvas share ONE ephemeral view.
 *
 * THE SSR DETERMINISM RULE. The initial value is `DEFAULT_JOURNEY_VIEW` —
 * "table", the primary surface — read from NOTHING: never `localStorage`,
 * `window` or the query string. It is therefore a no-op producing
 * byte-identical markup on both sides (the server's first paint is the table,
 * the two-track grid), and switching to the graph is a client transition.
 *
 * The fallback matters too: a consumer outside any provider degrades to the
 * same no-op default rather than throwing, so a stray mount can never take
 * the shell down.
 */

/** What the lens's consumers share: the view and the way to change it. */
export interface JourneyViewValue {
  readonly view: JourneyView;
  readonly setView: (next: JourneyView) => void;
}

const FALLBACK: JourneyViewValue = {
  view: DEFAULT_JOURNEY_VIEW,
  setView: () => {},
};

const JourneyViewContext = createContext<JourneyViewValue>(FALLBACK);

export interface JourneyViewProviderProps {
  readonly children: ReactNode;
}

export const JourneyViewProvider = ({
  children,
}: JourneyViewProviderProps): ReactNode => {
  const [view, setView] = useState<JourneyView>(DEFAULT_JOURNEY_VIEW);
  const value = useMemo<JourneyViewValue>(() => ({ view, setView }), [view]);
  return (
    <JourneyViewContext.Provider value={value}>
      {children}
    </JourneyViewContext.Provider>
  );
};

/** Read the lens's view. Degrades to the no-op default outside a provider
 * (see the module doc) rather than throwing. */
export const useJourneyView = (): JourneyViewValue =>
  useContext(JourneyViewContext);
