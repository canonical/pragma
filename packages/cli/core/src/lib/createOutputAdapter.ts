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
 * Detect the appropriate render mode from global flags.
 *
 * v0.1: always returns "plain". Future versions may return "ink"
 * when stdout is a TTY and no machine-readable format is requested.
 */
export function detectRenderMode(
  flags: Pick<GlobalFlags, "llm" | "format">,
): RenderMode {
  void flags;
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
          // Future: render via Ink React component — fall back to plain
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
