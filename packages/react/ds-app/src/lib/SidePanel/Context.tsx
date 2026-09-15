import { createContext } from "react";
import type { SidePanelContextValue } from "./types.js";

/**
 * The shared side panel API threaded to the composed subcomponents. There is
 * ONE panel instance per dialog — the subcomponents are render-only and read
 * this context rather than being handed props, so a composed `SidePanel.Header`
 * names the panel and closes it without the consumer wiring either by hand.
 * Defaults to `null` so a part rendered outside a panel degrades rather than
 * throws.
 */
const Context = createContext<SidePanelContextValue | null>(null);

export default Context;
