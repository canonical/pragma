/**
 * Re-export shim: the effect-formatting helpers moved to
 * `@canonical/summon-core`, so the summon bin and the pragma kernel share one
 * surface. Removed with cli-core in PR8.
 */

export {
  buildReplayCommand,
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
} from "@canonical/summon-core";
