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
import type { AnyGenerator } from "@canonical/summon-core";
import { PragmaError } from "#error";
import type { ToolParamDef, ToolSpec } from "../../shared/ToolSpec.js";
import renderGeneratorUi from "../renderGeneratorUi.js";

/** A package's generator set: generator key → generator. */
export type GeneratorSet = Readonly<Record<string, AnyGenerator>>;

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

/** Map a summon prompt to a neutral MCP tool parameter. */
function promptToToolParam(prompt: {
  type: "text" | "confirm" | "select" | "multiselect";
  message: string;
  default?: unknown;
  when?: unknown;
  choices?: ReadonlyArray<{ value: string }>;
}): ToolParamDef {
  const optional = prompt.default !== undefined || prompt.when != null;
  const enumValues = prompt.choices?.map((choice) => choice.value);
  if (prompt.type === "confirm") {
    return { type: "boolean", description: prompt.message, optional };
  }
  if (prompt.type === "multiselect") {
    return {
      type: "string[]",
      description: prompt.message,
      optional,
      ...(enumValues ? { enum: enumValues } : {}),
    };
  }
  // text / select → string
  return {
    type: "string",
    description: prompt.message,
    optional,
    ...(enumValues ? { enum: enumValues } : {}),
  };
}

/**
 * Build the MCP param map for a generator from its prompts.
 *
 * A generator that throws at execute (e.g. an unmet hard requirement) is
 * mapped to a typed INVALID_INPUT by {@link runGeneratorTool} instead of
 * bubbling untyped — the generic replacement for the per-generator validation
 * the hand-written specs did.
 */
function toolParamsFor(gen: AnyGenerator): Record<string, ToolParamDef> {
  const params: Record<string, ToolParamDef> = {};
  for (const prompt of gen.prompts) {
    params[prompt.name] = promptToToolParam(prompt);
  }
  return params;
}

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
  const genParams: Record<string, unknown> = { ...params, runInstall: false };
  if (discriminator) delete genParams[discriminator];
  try {
    const result = await executeGenerator(gen, genParams, batchCtx);
    if (result.tag === "output") {
      // json mode: result.value is already the structured plan.
      return { data: result.value };
    }
    throw PragmaError.invalidInput("input", "(generation produced no plan)");
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    throw PragmaError.invalidInput(
      "input",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Compiled surfaces for one generator pack. */
export interface CompiledGeneratorPack {
  readonly commands: CommandDefinition[];
  readonly specs: ToolSpec[];
}

/**
 * Compile a package's generator set into `create <noun>` commands and
 * `create_<noun>` MCP tools.
 */
export default function compileGeneratorPack(
  generators: GeneratorSet,
): CompiledGeneratorPack {
  const commands: CommandDefinition[] = [];
  const specs: ToolSpec[] = [];

  for (const [noun, group] of groupByNoun(generators)) {
    const variants = group
      .map((g) => g.variant)
      .filter((v): v is string => v !== undefined);
    const multiVariant = group.length > 1 && variants.length === group.length;

    if (multiVariant) {
      commands.push(buildVariantCommand(noun, group, variants));
      specs.push(buildVariantSpec(noun, group, variants));
    } else {
      // Single generator (bare noun, or a lone variant that collapses).
      const gen = group[0]?.gen;
      if (!gen) continue;
      commands.push(buildSingleCommand(noun, gen));
      specs.push(buildSingleSpec(noun, gen));
    }
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

/** `create <noun> <variant>` dispatch over several generators. */
function buildVariantCommand(
  noun: string,
  group: GroupedGenerator[],
  variants: string[],
): CommandDefinition {
  const byVariant = new Map(group.map((g) => [g.variant, g.gen]));
  // biome-ignore lint/style/noNonNullAssertion: multiVariant guarantees ≥1 entry
  const reference = group[0]!.gen;
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
    execute: (params, ctx) => {
      const variant = params.variant as string | undefined;
      const gen = variant ? byVariant.get(variant) : undefined;
      if (!gen) {
        throw PragmaError.invalidInput("variant", variant ?? "(missing)", {
          validOptions: variants,
        });
      }
      return renderGeneratorUi(gen, params, ctx);
    },
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

/** `create_<noun>` MCP tool with a `variant` discriminator. */
function buildVariantSpec(
  noun: string,
  group: GroupedGenerator[],
  variants: string[],
): ToolSpec {
  const byVariant = new Map(group.map((g) => [g.variant, g.gen]));
  // biome-ignore lint/style/noNonNullAssertion: multiVariant guarantees ≥1 entry
  const reference = group[0]!.gen;
  const params: Record<string, ToolParamDef> = {
    variant: {
      type: "string",
      description: `Which ${noun} to scaffold`,
      optional: false,
      enum: variants,
    },
    ...toolParamsFor(reference),
  };
  return {
    name: `create_${noun}`,
    description: `${reference.meta.description} Returns a JSON generation plan (dry-run).`,
    params,
    readOnly: false,
    destructive: false,
    execute: (rt, params) => {
      const variant = params.variant as string | undefined;
      const gen = variant ? byVariant.get(variant) : undefined;
      if (!gen) {
        throw PragmaError.invalidInput("variant", variant ?? "(missing)", {
          validOptions: variants,
        });
      }
      return runGeneratorTool(gen, rt, params, "variant");
    },
  };
}
