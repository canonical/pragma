/**
 * The value {@link execute} produces.
 *
 * `execute` returns a `Task<GeneratorResult>`; the runner interprets it. The
 * result carries what a front-end needs to render an outcome summary — the
 * generator identity, the resolved answers, and a preview of the effects the
 * generation performed (paths, and best-effort content for embedded-template
 * generators). Progress does NOT ride a bespoke event channel: it rides the
 * runner's `onEffectStart`/`onEffectComplete`/`onLog` callbacks and the task
 * alphabet's own `TaskEvent` — summon-core invents no parallel event system.
 */

import type { Effect } from "@canonical/task";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";

/** The outcome of running a generator through {@link execute}. */
export interface GeneratorResult {
  /** The generator that ran (its meta drives the outcome summary + stamp). */
  readonly generator: GeneratorDefinition;
  /** The resolved answers the generation ran with. */
  readonly answers: Record<string, unknown>;
  /** A dry-run preview of the effects the generation performed. */
  readonly effects: Effect[];
}
