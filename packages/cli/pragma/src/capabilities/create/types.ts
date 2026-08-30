import type { CREATE_GENERATORS } from "./constants.js";

/**
 * The `create` nouns — one per declared generator binding (path capped at two
 * segments). Derived from {@link CREATE_GENERATORS} so the union cannot drift
 * from the bindings.
 *
 * Deliberately free of any summon-core / generator import, so a module that only
 * needs this type (e.g. `create.verb`) does not drag `pickGenerator` — and its
 * heavy generator imports — into the static graph.
 */
export type CreateKind = keyof typeof CREATE_GENERATORS;

/**
 * The REGISTERED CLI spelling of one generator prompt, baked into
 * `createSurface.generated.ts` at build time (the build derives it with the
 * same summon-core helpers the mount registers through). Consumers that need
 * only the spelling — completion tokens, the reference's usage lines — read
 * this baked record instead of calling the projection, which keeps the
 * `--help`/`__complete` fast paths free of the registration machinery.
 */
export interface PromptCliSyntax {
  /**
   * The registered flag token (`--component-path`; a default-true confirm
   * registers ONLY its `--no-<kebab>` form).
   */
  readonly flag: string;
  /** Whether the registered flag takes a value (`--styles` does not). */
  readonly takesValue: boolean;
  /** The prompt name's kebab-case CLI spelling (`componentPath` → `component-path`). */
  readonly kebabName: string;
}
