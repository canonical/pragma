import { useContext } from "react";
import SidePanelContext from "../Context.js";
import type { SidePanelContextValue } from "../types.js";

/**
 * Read the panel API. Returns `null` outside a SidePanel so that a part can
 * degrade — `Header` simply omits its close button — rather than throwing.
 */
export const useSidePanelContext = (): SidePanelContextValue | null =>
  useContext(SidePanelContext);

export default useSidePanelContext;
