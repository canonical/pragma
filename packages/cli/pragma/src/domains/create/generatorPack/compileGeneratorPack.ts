/**
 * Generator packs — the write-side analog of story packs.
 *
 * A generator pack is a set of summon generators (a package's `generators`
 * export). This compiler enumerates them, groups by noun, and emits `create
 * <noun>` CLI commands and `create_<noun>` MCP tools — the same data-driven
 * surface story packs give read commands. The core stops hardcoding which
 * generators exist; a package's full set is exposed automatically.
 *
 * Key convention (summon's own): `"<noun>/<variant>"` (e.g. `component/react`)
 * groups under `<noun>` with a `<variant>` discriminator; a bare `"<noun>"`
 * (e.g. `package`) is a single generator. A noun with one variant collapses to
 * `create <noun>`; a noun with several becomes `create <noun> <variant>`.
 */

import {
  type CommandDefinition,
  executeGenerator,
  generatorToCommand,
  type ParameterDefinition,
} from "@canonical/cli-core";
import type { AnyGenerator, PromptDefinition } from "@canonical/summon-core";
import { PragmaError } from "#error";
import type { ToolParamDef, ToolSpec } from "../../shared/ToolSpec.js";
import renderGeneratorUi from "../renderGeneratorUi.js";

/** A package's generator set: generator key → generator. */
export type GeneratorSet = Readonly<Record<string, AnyGenerator>>;

/** Compiled surfaces for one generator pack. */
export interface CompiledGeneratorPack {
  readonly commands: readonly CommandDefinition[];
  readonly specs: readonly ToolSpec[];
}

/** A generator grouped under a noun, with its optional variant. */
interface GroupedGenerator {
  readonly variant?: string;
  readonly gen: AnyGenerator;
}

/** Split a generator key into `{ noun, variant? }` on the first slash. */
function parseGeneratorKey(key: string): { noun: string; variant?: string } {
  const slash = key.indexOf("/");
  if (slash === -1) return { noun: key };
  return { noun: key.slice(0, slash), variant: key.slice(slash + 1) };
}

/** Group a generator set by noun, preserving declaration order. */
function groupByNoun(
  generators: GeneratorSet,
): Map<string, GroupedGenerator[]> {
  const groups = new Map<string, GroupedGenerator[]>();
  for (const [key, gen] of Object.entries(generators)) {
    const { noun, variant } = parseGeneratorKey(key);
    const group = groups.get(noun) ?? [];
    group.push(variant !== undefined ? { variant, gen } : { gen });
    groups.set(noun, group);
  }
  return groups;
}

/** Prompt type → tool param type, mirroring cli-core's `promptToParameter`. */
const PROMPT_TYPE_MAP: Record<PromptDefinition["type"], ToolParamDef["type"]> =
  {
    text: "string",
    confirm: "boolean",
    select: "string",
    multiselect: "string[]",
  };

/** Map a summon prompt to a neutral MCP tool parameter. */
function promptToToolParam(prompt: PromptDefinition): ToolParamDef {
  const enumValues =
    prompt.type === "confirm"
      ? undefined
      : prompt.choices?.map((choice) => choice.value);
  return {
    type: PROMPT_TYPE_MAP[prompt.type],
    description: prompt.message,
    // A prompt with a default or a `when` condition is answerable without
    // input; only an unconditional, defaultless prompt is required.
    optional: prompt.default !== undefined || prompt.when !== undefined,
    ...(enumValues ? { enum: enumValues } : {}),
  };
}

/** Build the MCP param map for a generator from its prompts. */
function toolParamsFor(gen: AnyGenerator): Record<string, ToolParamDef> {
  return Object.fromEntries(
    gen.prompts.map((prompt) => [prompt.name, promptToToolParam(prompt)]),
  );
}

/**
 * Run one generator as an MCP tool call: json-mode dry-run plan.
 *
 * A generator that throws (e.g. an unmet hard requirement such as
 * application's ssr/router pairing) is mapped to a typed INVALID_INPUT
 * carrying the generator's own message as the recovery hint — the generic
 * replacement for the per-generator validation the hand-written specs did.
 */
async function runGeneratorTool(
  gen: AnyGenerator,
  rt: { cwd: string },
  params: Record<string, unknown>,
  discriminator?: string,
): Promise<{ data: unknown }> {
  const batchCtx = {
    cwd: rt.cwd,
    globalFlags: { llm: false, format: "json" as const, verbose: false },
  };
  // Never install during a dry-run plan; the discriminator is dispatch
  // metadata, not a generator answer.
  const genParams: Record<string, unknown> = { ...params, runInstall: false };
  if (discriminator) delete genParams[discriminator];
  try {
    const result = await executeGenerator(gen, genParams, batchCtx);
    if (result.tag === "output") {
      // json mode: result.value is already the structured plan.
      return { data: result.value };
    }
    throw PragmaError.invalidInput("parameters", "(no plan produced)", {
      recovery: { message: `The ${gen.meta.name} generator rejected them.` },
    });
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    throw PragmaError.invalidInput("parameters", "(rejected)", {
      recovery: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

/**
 * Build the variant → generator resolver shared by the CLI and MCP dispatch.
 *
 * @returns A function resolving a raw `variant` param to its generator.
 * @throws PragmaError with code INVALID_INPUT for a missing/unknown variant.
 */
function buildVariantResolver(
  group: readonly GroupedGenerator[],
  variants: readonly string[],
): (variant: unknown) => AnyGenerator {
  const byVariant = new Map(group.map((g) => [g.variant, g.gen]));
  return (variant) => {
    const gen =
      typeof variant === "string" ? byVariant.get(variant) : undefined;
    if (!gen) {
      throw PragmaError.invalidInput(
        "variant",
        typeof variant === "string" ? variant : "(missing)",
        { validOptions: [...variants] },
      );
    }
    return gen;
  };
}

/**
 * Compile a package's generator set into `create <noun>` commands and
 * `create_<noun>` MCP tools.
 *
 * @note Impure — warns on stderr when a degenerate group (duplicate noun
 *   with mixed bare/variant keys) forces generators to be skipped.
 */
export default function compileGeneratorPack(
  generators: GeneratorSet,
): CompiledGeneratorPack {
  const commands: CommandDefinition[] = [];
  const specs: ToolSpec[] = [];

  for (const [noun, group] of groupByNoun(generators)) {
    const [first, ...rest] = group;
    if (!first) continue; // groupByNoun never emits empty groups

    const variants = group
      .map((g) => g.variant)
      .filter((v): v is string => v !== undefined);

    if (rest.length > 0 && variants.length === group.length) {
      commands.push(buildVariantCommand(noun, first.gen, group, variants));
      specs.push(buildVariantSpec(noun, first.gen, group, variants));
      continue;
    }

    if (rest.length > 0) {
      // Mixed bare/variant keys under one noun is a malformed set — expose
      // the first generator rather than none, but never drop the rest
      // silently.
      process.stderr.write(
        `Warning: generator noun "${noun}" mixes bare and variant keys; ` +
          `only "${first.gen.meta.name}" is exposed.\n`,
      );
    }
    commands.push(buildSingleCommand(noun, first.gen));
    specs.push(buildSingleSpec(noun, first.gen));
  }

  return { commands, specs };
}

/** `create <noun>` for a single generator, with summon's rich Ink UI. */
function buildSingleCommand(
  noun: string,
  gen: AnyGenerator,
): CommandDefinition {
  const base = generatorToCommand(["create", noun], gen);
  return {
    ...base,
    execute: (params, ctx) => renderGeneratorUi(gen, params, ctx),
  };
}

/**
 * `create <noun> <variant>` dispatch over several generators.
 *
 * Help and parameters project from the reference (first-declared) generator —
 * variants of one noun are assumed prompt-compatible, the same assumption the
 * hand-written component command made.
 */
function buildVariantCommand(
  noun: string,
  reference: AnyGenerator,
  group: readonly GroupedGenerator[],
  variants: readonly string[],
): CommandDefinition {
  const resolve = buildVariantResolver(group, variants);
  const base = generatorToCommand(["create", noun], reference);
  const variantParam: ParameterDefinition = {
    name: "variant",
    description: `Which ${noun} to scaffold (${variants.join(", ")})`,
    type: "select",
    choices: variants.map((v) => ({ label: v, value: v })),
    positional: true,
    required: true,
  };
  return {
    ...base,
    parameters: [variantParam, ...base.parameters],
    // async so an unknown variant rejects instead of throwing synchronously.
    execute: async (params, ctx) =>
      renderGeneratorUi(resolve(params.variant), params, ctx),
  };
}

/** `create_<noun>` MCP tool for a single generator. */
function buildSingleSpec(noun: string, gen: AnyGenerator): ToolSpec {
  return {
    name: `create_${noun}`,
    description: `${gen.meta.description} Returns a JSON generation plan (dry-run).`,
    params: toolParamsFor(gen),
    readOnly: false,
    destructive: false,
    execute: (rt, params) => runGeneratorTool(gen, rt, params),
  };
}

/**
 * `create_<noun>` MCP tool with a `variant` discriminator.
 *
 * The param schema projects from the reference generator's prompts (see
 * {@link buildVariantCommand} for the compatibility assumption).
 */
function buildVariantSpec(
  noun: string,
  reference: AnyGenerator,
  group: readonly GroupedGenerator[],
  variants: readonly string[],
): ToolSpec {
  const resolve = buildVariantResolver(group, variants);
  return {
    name: `create_${noun}`,
    description: `${reference.meta.description} Returns a JSON generation plan (dry-run).`,
    params: {
      variant: {
        type: "string",
        description: `Which ${noun} to scaffold`,
        optional: false,
        enum: [...variants],
      },
      ...toolParamsFor(reference),
    },
    readOnly: false,
    destructive: false,
    // async so an unknown variant rejects instead of throwing synchronously.
    execute: async (rt, params) =>
      runGeneratorTool(resolve(params.variant), rt, params, "variant"),
  };
}
