/**
 * Resolve aspect flags for component detail views.
 *
 * If no aspect is set, all are shown. If any is set,
 * only those selected are shown.
 */

export interface AspectFlags {
  readonly anatomy: boolean;
  readonly modifiers: boolean;
  readonly tokens: boolean;
  readonly standards: boolean;
  readonly implementations: boolean;
}

const ALL_ASPECTS: AspectFlags = {
  anatomy: true,
  modifiers: true,
  tokens: true,
  standards: true,
  implementations: true,
};

export default function resolveAspects(
  flags: Partial<AspectFlags>,
): AspectFlags {
  const anySet =
    flags.anatomy ||
    flags.modifiers ||
    flags.tokens ||
    flags.standards ||
    flags.implementations;

  if (!anySet) return ALL_ASPECTS;

  return {
    anatomy: flags.anatomy ?? false,
    modifiers: flags.modifiers ?? false,
    tokens: flags.tokens ?? false,
    standards: flags.standards ?? false,
    implementations: flags.implementations ?? false,
  };
}
