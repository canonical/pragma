/**
 * Write TUI-rendered output to stdout.
 *
 * The ink renderers in pragma produce chalk-styled strings directly
 * (not React elements), so this function simply writes the string
 * to stdout. The dynamic import boundary is preserved so that domain
 * command files can reference the `#tui` barrel without pulling in
 * React/Ink at parse time for non-TTY invocations.
 *
 * @param output - A chalk-styled string produced by a TUI view.
 *
 * @note Impure — writes to process.stdout.
 */
export default async function renderInk(output: unknown): Promise<void> {
  if (typeof output === "string" && output.length > 0) {
    process.stdout.write(`${output}\n`);
  }
}
