import type {
  ModifierFamily,
  ModifierFamilyValues,
} from "../../modifier-families/index.js";
import type { TextInputPrimitiveProps } from "../common/index.js";

export interface TextInputProps
  extends TextInputPrimitiveProps,
    ModifierFamily<"severity"> {
  density?: Extract<ModifierFamilyValues["density"], "dense" | "medium">;
}
