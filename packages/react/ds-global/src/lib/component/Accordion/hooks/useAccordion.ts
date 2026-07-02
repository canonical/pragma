import { useContext } from "react";
import Context from "../Context.js";
import type { AccordionContextOptions } from "../types.js";

/**
 * Hook to access accordion keyboard navigation context.
 * Returns undefined if used outside of Accordion.
 */
const useAccordion = (): AccordionContextOptions | undefined => {
  return useContext(Context);
};

export default useAccordion;
