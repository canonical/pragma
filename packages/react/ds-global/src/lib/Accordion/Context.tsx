import { createContext } from "react";
import type { AccordionContextOptions } from "./types.js";

/**
 * Context for managing keyboard navigation between accordion items.
 * Implements WAI-ARIA Accordion Pattern keyboard interactions.
 */
const Context = createContext<AccordionContextOptions | undefined>(undefined);

export default Context;
