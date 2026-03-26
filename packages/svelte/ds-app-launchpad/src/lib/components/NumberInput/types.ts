import type { ModifierFamily } from "../../modifier-families/index.js";
import type { NumberInputPrimitiveProps } from "../common/index.js";

export interface NumberInputProps
  extends Omit<NumberInputPrimitiveProps, "type">,
    ModifierFamily<"severity"> {
  density?: "dense" | "medium";
}
