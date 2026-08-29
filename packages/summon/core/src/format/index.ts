/**
 * The effect-formatting seam, served as its own export subpath.
 *
 * `@canonical/summon-core/format` exists so a host can reach the plan rules —
 * {@link visiblePlanEffects}, {@link formatEffectLine} and friends — WITHOUT
 * loading summon-core proper: the barrel pulls the generator runtime and, with
 * it, React, which the pragma CLI keeps off its `--help` / `__complete` fast
 * paths. This module's runtime graph is `chalk` and Node built-ins, so a host
 * pays for the plan rules and nothing else — whether it imports them eagerly,
 * as the summon bin does, or behind a dynamic `import()` at render time, as
 * the pragma kernel does to keep its own fast paths free of this package
 * altogether.
 *
 * One surface, two bins: the summon bin renders its dry-run through these, and
 * so now does the pragma kernel — the reason the rules live here rather than
 * in either host.
 */

// The wizard's outcome glyphs. Re-exported off this LIGHT seam (progressWindow
// imports nothing) so a host can pin its own rendering vocabulary against the
// wizard's without loading summon-core proper — the pragma CLI's
// renderVocabularySync test does exactly that.
export {
  COMPLETED_GLYPH,
  FAILURE_GLYPH,
} from "../prompt/ink/progressWindow.js";
export type { EffectColor, EffectStyle } from "./effects.js";
export {
  buildReplayCommand,
  effectStyleFor,
  formatContentPreview,
  formatEffectLine,
  formatEffectWithContent,
  formatLlmHelp,
  formatLlmJson,
  formatLlmMarkdown,
  getActionColor,
  getActionLabel,
  getEffectPayload,
  getLanguageHint,
  getLlmActionLabel,
  getLlmEffectPath,
  isVisibleEffect,
  visiblePlanEffects,
} from "./effects.js";
export { default as formatFlagName } from "./formatFlagName.js";
