import { createContext, type ReactNode } from "react";

/**
 * Each settings menu item's content by its key, for the one label every item
 * renders; empty while the menu lists nothing.
 */
const LabelsContext = createContext<ReadonlyMap<string, ReactNode>>(new Map());

export default LabelsContext;
