/**
 * The interactivity vocabulary — three named questions over three streams.
 *
 * Every one of these used to be spelled inline as a bare `process.<stream>
 * .isTTY === true` at the site that needed it, in four places, and the
 * spellings did not agree — because they are NOT the same question. Naming them
 * is the point: the names are what stop the next reader from "simplifying"
 * three probes into one flag.
 *
 * - {@link stdoutIsCaptured} reads **stdout**. It governs OUTPUT SHAPE: whether
 *   a consumer is piping the data stream somewhere (the shape an agent
 *   captures), which is what selects the condensed `llm` default and drops the
 *   root-help wordmark.
 * - {@link canPrompt} reads **stdin AND stderr** — never stdout. The step
 *   sequence renders to stderr and reads stdin, so `<verb> 2>/dev/null` is
 *   non-interactive while `<verb> | cat` is not. Gating this one on stdout
 *   would mount an invisible render that then blocks on stdin.
 * - `canColor` (`render/style.ts`) reads **stdout** plus chalk's own color
 *   level, so piped, redirected and MCP output stays byte-stable even where
 *   `supports-color` fires off a TTY. It is the one question of the three that
 *   lives with the styler rather than here, because it needs `chalk` and this
 *   module is imported by global-flag parsing — which runs before `--version`
 *   answers, on a path that must load nothing it does not use. It still asks
 *   its stdout half through {@link stdoutIsCaptured}, so the three stay one
 *   vocabulary.
 *
 * The distinction is not academic: an agent running a mutating verb with its
 * stdout captured but a terminal still attached is CAPTURED and PROMPTABLE at
 * the same time. Answering either question with the other's probe would either
 * hang a pipeline or refuse a human.
 *
 * These are the only sanctioned readers of `process.*.isTTY` outside a test.
 * Each is a plain function rather than a module-load constant because a test
 * assigns the streams' `isTTY` per case, and a constant would freeze the first
 * value the process ever saw.
 */

/**
 * Whether stdout is going somewhere other than an attended terminal — piped,
 * redirected, or read by a parent process.
 *
 * The OUTPUT-SHAPE question, and stdout's alone: it says nothing about whether
 * a human is available to answer a prompt (see {@link canPrompt}).
 *
 * @returns True when stdout is not a TTY.
 * @note Impure — reads `process.stdout.isTTY`.
 */
export function stdoutIsCaptured(): boolean {
  return process.stdout.isTTY !== true;
}

/**
 * Whether this invocation may ask the user a question: stdin AND stderr are
 * both attended terminals.
 *
 * THE interactivity gate (H3). One exported fact, so the kernel's interaction
 * context and a mounted subtree's own decision can never disagree about what
 * "a TTY" means. Deliberately blind to stdout — see the module docblock.
 *
 * @returns True when a prompt can be both drawn and answered.
 * @note Impure — reads `process.stdin.isTTY` and `process.stderr.isTTY`.
 */
export function canPrompt(): boolean {
  return process.stdin.isTTY === true && process.stderr.isTTY === true;
}
