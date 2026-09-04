import type { Snippet } from "svelte";
import type { ModifierFamilyValues } from "../../modifier-families/index.js";
import type { ButtonPrimitiveProps } from "../common/ButtonPrimitive/index.js";

export type ButtonProps = ButtonPrimitiveProps & {
  iconLeft?: Snippet;
  iconRight?: Snippet;
  loading?: boolean;
  importance?: ModifierFamilyValues["importance"];
  anticipation?: ModifierFamilyValues["anticipation"];
  emphasis?: Extract<ModifierFamilyValues["emphasis"], "branded">;
  criticality?: Extract<ModifierFamilyValues["criticality"], "information">;
  density?: ModifierFamilyValues["density"];
};
