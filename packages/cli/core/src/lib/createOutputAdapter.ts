/**
 * Create an OutputAdapter for the given render mode.
 */

import type {
  GlobalFlags,
  OutputAdapter,
  RenderMode,
  RenderPair,
} from "./types.js";

/**
 * Detect the appropriate render mode from global flags and terminal state.
 *
 * Returns "ink" when stdout is an interactive terminal and no
 * machine-readable format (`--llm`, `--format json`) is requested.
 * Returns "plain" in all other cases: piped output, redirected
 * files, CI environments, or explicit machine-readable flags.
 *
 * @note Impure — reads process.stdout.isTTY.
 */
export function detectRenderMode(
  flags: Pick<GlobalFlags, "llm" | "format">,
): RenderMode {
  if (flags.llm || flags.format === "json") return "plain";
  if (process.stdout.isTTY) return "ink";
  return "plain";
}

/**
 * Create an OutputAdapter for the given render mode.
 */
export default function createOutputAdapter(mode: RenderMode): OutputAdapter {
  return {
    mode,
    render<T>(data: T, renderers: RenderPair<T>): void {
      switch (mode) {
        case "plain": {
          const text = renderers.plain(data);
          if (text) {
            process.stdout.write(`${text}\n`);
          }
          break;
        }
        case "ink": {
          // Ink rendering is handled by handleResult via HandleResultOptions.
          // OutputAdapter.render() falls back to plain when called directly.
          const text = renderers.plain(data);
          if (text) {
            process.stdout.write(`${text}\n`);
          }
          break;
        }
      }
    },
  };
}
