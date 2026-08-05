/**
 * The effect-formatting surface this package publishes.
 *
 * `buildReplayCommand`, `getLanguageHint`, `getLlmActionLabel` and
 * `getLlmEffectPath` are deliberately NOT here. They are private helpers of
 * `formatLlmMarkdown`/`formatLlmJson`, and the only thing that ever made them
 * look consumed was a re-export shim in the CLI framework package, which was
 * folded away. They stay exported from `effects.js` so the colocated test can
 * reach them directly.
 */

export {
  formatContentPreview,
  formatEffectLine,
  formatEffectWithContent,
  formatLlmHelp,
  formatLlmJson,
  formatLlmMarkdown,
  getActionColor,
  getActionLabel,
  getEffectPayload,
  isVisibleEffect,
} from "./effects.js";
