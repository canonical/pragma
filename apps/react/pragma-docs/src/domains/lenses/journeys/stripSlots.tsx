import type React from "react";
import { JourneyViewSwitch } from "./JourneyViewSwitch/index.js";
import { useJourneyView } from "./journeyViewContext.js";

/**
 * The Journeys lens's mode-strip tenant — the component the routes park on
 * their `meta` under `SHELL_STRIP_META_KEY`, which the Shell mounts into the
 * strip's `controls` socket (the P-5 handshake). RULING 1 moved the Table ⇄
 * Graph switch here from the canvas, mirroring the Definitions lens.
 *
 * It takes NO props: `StripSlotsEntry` carries component types, not elements,
 * so the frame constructs it with nothing. The ephemeral VIEW reaches it
 * through `journeyViewContext` (see that module for why a context is the
 * smallest mechanism that crosses the frame boundary).
 *
 * NO Relay read, and no Suspense guard — unlike the Definitions chips, this
 * tenant's content is DATA-INDEPENDENT (the fixed "Table"/"Graph" labels), so
 * it never touches the graph and therefore can never suspend the frame on a
 * cold store. The switch renders identically on the server and the client
 * (the default is a constant), so there is no empty-then-populated hydration
 * mismatch to guard against either.
 */
const ControlsContent = (): React.ReactElement => {
  const { view, setView } = useJourneyView();
  return <JourneyViewSwitch onViewChange={setView} view={view} />;
};

export const journeysStripSlots = {
  Controls: ControlsContent,
} as const;
