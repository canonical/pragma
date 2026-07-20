/**
 * Re-export shim: `answerPromptWithDefaults` moved to `@canonical/summon-core`.
 * cli-core re-exports it so the summon bin keeps compiling unchanged; removed
 * with cli-core in PR8.
 */

export { answerPromptWithDefaults as default } from "@canonical/summon-core";
