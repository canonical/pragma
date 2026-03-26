import type { HTMLAttributes } from "react";
import type { KEY_LABELS } from "./constants.js";

/** Valid keyboard key identifiers, derived from KEY_LABELS */
export type Key = keyof typeof KEY_LABELS;

export interface KeyboardKeyProps extends HTMLAttributes<HTMLElement> {
  /** The keyboard key to display */
  keyValue: Key;
}
