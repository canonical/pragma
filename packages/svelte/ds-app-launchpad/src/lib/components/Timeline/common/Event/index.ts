/* @canonical/generator-ds 0.10.0-experimental.2 */

import { TitleRow } from "./common/index.js";
import { default as EventRoot } from "./Event.svelte";

const Event = EventRoot as typeof EventRoot & {
  /**
   * `Timeline.Event.TitleRow` is used to display a title row within a timeline event.
   * @example
   * ```svelte
   * <Timeline.Event.TitleRow leadingText="Alvarez Daniella">
   *   added labels: Don't merge, Maintenance, Review: QA needed
   *   {#snippet date()}
   *     <DateTime date="2023-03-15" />
   *   {/snippet}
   * </Timeline.Event.TitleRow>
   * ```
   */
  TitleRow: typeof TitleRow;
};

Event.TitleRow = TitleRow;

export type { TitleRowProps } from "./common/index.js";
export * from "./types.js";
export { Event };
