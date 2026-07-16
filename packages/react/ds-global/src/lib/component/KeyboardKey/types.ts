import type { ComponentProps } from "react";
import type { KEY_LABELS } from "./constants.js";

/** Valid keyboard key identifiers, derived from KEY_LABELS */
export type Key = keyof typeof KEY_LABELS;

type OwnProps = {
  /** The keyboard key to display */
  keyValue: Key;
};

/** Props for the KeyboardKey component, extending its native `<kbd>` root. */
export type KeyboardKeyProps = OwnProps &
  Omit<ComponentProps<"kbd">, keyof OwnProps>;
