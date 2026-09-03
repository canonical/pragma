import { createContext, useContext } from "react";

/** The small API a SidePanel threads down to its header, content and footer. */
export interface SidePanelContextValue {
  /** Ask the panel to close. Reports to the consumer; never closes directly. */
  requestClose: () => void;
  /** Id the panel is labelled by. `Header` puts it on its heading. */
  titleId: string;
}

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

/**
 * Read the panel API. Returns `null` outside a SidePanel so that a part can
 * degrade — `Header` simply omits its close button — rather than throwing.
 */
export const useSidePanelContext = (): SidePanelContextValue | null =>
  useContext(SidePanelContext);

export default SidePanelContext;
