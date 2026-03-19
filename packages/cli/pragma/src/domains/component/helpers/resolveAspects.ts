/**
 * Resolve aspect flags for component detail views.
 *
 * If no aspect is set, all are shown. If any is set,
 * only those selected are shown.
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
