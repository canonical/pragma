import type { Snippet } from "svelte";
import type { ModifierFamilyValues } from "../../modifier-families/index.js";
import type { ButtonPrimitiveProps } from "../common/ButtonPrimitive/index.js";

export type ButtonProps = ButtonPrimitiveProps & {
  iconLeft?: Snippet;
  iconRight?: Snippet;
  loading?: boolean;
  severity?: ModifierFamilyValues["severity"] | "base" | "brand";
  density?: ModifierFamilyValues["density"];
};
