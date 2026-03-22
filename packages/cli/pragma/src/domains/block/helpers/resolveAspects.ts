/**
 * Resolves partial aspect flags into a complete {@link AspectFlags} object.
 *
 * When no individual aspect is selected, all aspects default to `true` so
 * the full detail view is shown. When at least one aspect is explicitly
 * selected, only the selected aspects are enabled.
 *
 * @param flags - partial aspect selection from CLI flags
 * @returns fully resolved aspect flags
 */

import type { AspectFlags } from "../types.js";

const ALL_ASPECTS: AspectFlags = {
  anatomy: true,
  modifiers: true,
  tokens: true,
  implementations: true,
};

export default function resolveAspects(
  flags: Partial<AspectFlags>,
): AspectFlags {
  const anySet =
    flags.anatomy || flags.modifiers || flags.tokens || flags.implementations;

  if (!anySet) return ALL_ASPECTS;

  return {
    anatomy: flags.anatomy ?? false,
    modifiers: flags.modifiers ?? false,
    tokens: flags.tokens ?? false,
    implementations: flags.implementations ?? false,
  };
}
