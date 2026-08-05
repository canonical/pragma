import type { CREATE_SURFACE } from "./surface.generated.js";

/**
 * The `create` nouns. Derived from the GENERATED surface, which the build
 * derives from `pragma.conf.ts`'s `generators` declaration — so the union is
 * whatever the distribution declares, and a fork that declares a different set
 * gets a different union with no edit here.
 *
 * Deliberately free of any summon-core / generator import, so a module that only
 * needs this type (e.g. `create.verb`) does not drag `pickGenerator` — and its
 * heavy generator imports — into the static graph.
 */
export type CreateKind = keyof typeof CREATE_SURFACE;

/**
 * A generator prompt as the DATA module carries it: the JSON-serialisable
 * subset of summon's `PromptDefinition`.
 *
 * `when` and `validate` are functions and cannot cross into a data module.
 * `when` survives as {@link conditional}, which is all the grammar adapter reads
 * it for (`required = default === undefined && !when`); `validate` stays on the
 * live generator, where summon's `validateAnswers` enforces it inside `execute`
 * — so a flag or MCP-arg run is rejected by the same rule a wizard applies.
 */
export interface SerializedPrompt {
  readonly name: string;
  readonly type: "text" | "confirm" | "select" | "multiselect";
  readonly message: string;
  readonly default?: unknown;
  readonly positional?: boolean;
  readonly choices?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  readonly conditional?: boolean;
}
