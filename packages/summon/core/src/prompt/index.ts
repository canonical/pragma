/**
 * The prompt-strategy barrel. STATIC exports only — no JSX, no static
 * `import` of `ink`/`react`. The Ink strategy ({@link inkPrompt}) reaches its
 * React UI ONLY through `await import("./ink/mount.js")` on first draw, so
 * importing this barrel (or summon-core's root) never loads React. The
 * lazy-React guard test enforces exactly this boundary.
 */

export { default as answerPromptWithDefaults } from "./answerPromptWithDefaults.js";
export {
  default as autoPrompt,
  MISSING_REQUIRED_ANSWER,
  missingRequiredError,
} from "./autoPrompt.js";
export type { InkPromptOptions, InkSession } from "./inkPrompt.js";
export { default as inkPrompt } from "./inkPrompt.js";
export { default as mcpPrompt } from "./mcpPrompt.js";
export type {
  ConfirmPrompt,
  MultiselectPrompt,
  PromptEffect,
  PromptHandler,
  PromptQuestion,
  SelectPrompt,
  TextPrompt,
} from "./types.js";
