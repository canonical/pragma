/**
 * Re-export shim: `promptForAnswers` moved to `@canonical/summon-core` as
 * `collectAnswers` (the answer-collection phase of the seam's `execute`). The
 * behaviour is unchanged; the export name is preserved here for the summon bin
 * and old pragma shell. Removed with cli-core in PR8.
 */

export type { AnswerablePrompt } from "@canonical/summon-core";
export { collectAnswers as default } from "@canonical/summon-core";
