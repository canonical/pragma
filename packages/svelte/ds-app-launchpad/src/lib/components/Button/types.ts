import type { ModifierFamilyValues } from "modifier-families";
import type { Snippet } from "svelte";
import type { ButtonPrimitiveProps } from "../common/ButtonPrimitive";

export type ButtonProps = ButtonPrimitiveProps & {
  iconLeft?: Snippet;
  iconRight?: Snippet;
  loading?: boolean;
  severity?: ModifierFamilyValues["severity"] | "base" | "brand";
  density?: ModifierFamilyValues["density"];
};
