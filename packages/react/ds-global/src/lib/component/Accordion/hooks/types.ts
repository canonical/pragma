import type { RefObject } from "react";
import type { AccordionContextOptions } from "../types.js";

/**
 * Props for the useAccordionState hook
 */
export type UseAccordionStateProps = Record<string, never>;

/**
 * Result of the useAccordionState hook - matches AccordionContextOptions
 */
export type UseAccordionStateResult = AccordionContextOptions;

/**
 * Header ref type for keyboard navigation registration
 */
export type HeaderRef = RefObject<HTMLButtonElement | null>;
