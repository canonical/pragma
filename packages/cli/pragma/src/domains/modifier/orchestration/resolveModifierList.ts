import type { PragmaRuntime } from "../../shared/runtime.js";
import { listModifiers } from "../operations/index.js";
import type { ModifierListResolution } from "../types.js";
import modifierEmptyError from "./modifierEmptyError.js";

export default async function resolveModifierList(
  rt: Pick<PragmaRuntime, "store">,
): Promise<ModifierListResolution> {
  const items = await listModifiers(rt.store);

  if (items.length === 0) {
    throw modifierEmptyError();
  }

  return { items };
}
