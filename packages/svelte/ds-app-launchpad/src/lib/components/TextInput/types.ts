import type { ModifierFamily } from "modifier-families";
import type { TextInputPrimitiveProps } from "../common/index.js";

export interface TextInputProps
  extends TextInputPrimitiveProps,
    ModifierFamily<"severity"> {
  density?: "dense" | "medium";
}
