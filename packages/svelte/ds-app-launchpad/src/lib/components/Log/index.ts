/* @canonical/generator-ds 0.10.0-experimental.5 */

import { Line } from "./common/index.js";
import { default as LogRoot } from "./Log.svelte";

const Log = LogRoot as typeof LogRoot & {
  /**
   * The Log Line component for individual log entries.
   *
   * @example
   * ```svelte
   * <Log>
   *   <Log.Line
   *     line={1}
   *     timestamp={new Date()}
   *   >
   *    Application started successfully.
   *   </Log.Line>
   * </Log>
   * ```
   */
  Line: typeof Line;
};

Log.Line = Line;

export type { LineProps as LogLineProps } from "./common/index.js";
export type { LogProps, TimeZone as LogTimeZone } from "./types.js";
export { Log };
