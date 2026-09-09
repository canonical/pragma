import { createContext } from "react";
import type { ModalContextValue } from "./types.js";

/**
 * The shared modal API threaded to the composed subcomponents. There is ONE
 * modal instance per dialog — the subcomponents are render-only and read this
 * context rather than being handed props, so a composed `Modal.Header` names
 * the dialog and closes it without the consumer wiring either by hand.
 */
const Context = createContext<ModalContextValue | null>(null);

export default Context;
