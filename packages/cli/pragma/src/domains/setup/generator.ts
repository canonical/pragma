/**
 * The `pragma setup` generator.
 *
 * `setup` is one level more general than `pragma create <thing>`: rather than
 * scaffolding a single artefact it configures the whole local environment
 * (shell completions, the Terrazzo LSP extension, and the MCP server for AI
 * harnesses). Expressing it as a summon {@link GeneratorDefinition} lets it
 * reuse the shared generator execution path — the rich prompt UI, `--yes`,
 * `--dry-run`, and `--llm`/`--format json` handling — exactly as `create` does,
 * instead of hand-rolling its own prompt gates.
 *
 * Each step is already a `Task<void>`; the generator turns the per-step
 * confirm gates into upfront prompts and composes the selected steps.
 */

import type { GeneratorDefinition } from "@canonical/summon-core";
import { $, gen, info, type Task, when } from "@canonical/task";
import { VERSION } from "../../constants.js";
import setupCompletions from "./operations/setupCompletions.js";
import setupLsp from "./operations/setupLsp.js";
import setupMcp from "./operations/setupMcp.js";

/** Answers collected by the setup generator's prompts. */
interface SetupAnswers {
  readonly root: string;
  readonly withCompletions: boolean;
  readonly withLsp: boolean;
  readonly withMcp: boolean;
}

/**
 * Compose the selected setup steps into a single Task.
 *
 * @param answers - The resolved setup answers (which steps, and the root).
 * @returns A Task that runs each enabled step in sequence.
 */
function generateSetup(answers: SetupAnswers): Task<void> {
  return gen(function* () {
    yield* $(info("Setting up pragma for this project...\n"));
    yield* $(when(answers.withCompletions, setupCompletions()));
    yield* $(when(answers.withLsp, setupLsp(answers.root)));
    yield* $(when(answers.withMcp, setupMcp(answers.root)));
    yield* $(info("\nSetup complete. Run `pragma doctor` to verify."));
  });
}

/**
 * Coerce the raw answers record into typed {@link SetupAnswers}, applying the
 * confirm defaults so an omitted step still resolves to a boolean.
 */
function toSetupAnswers(answers: Record<string, unknown>): SetupAnswers {
  return {
    root: typeof answers.root === "string" ? answers.root : process.cwd(),
    withCompletions: answers.withCompletions !== false,
    withLsp: answers.withLsp !== false,
    withMcp: answers.withMcp !== false,
  };
}

/**
 * The `pragma setup` generator definition, consumed by the setup command's
 * bridge to `executeGenerator`.
 */
export const setupGenerator: GeneratorDefinition = {
  meta: {
    name: "setup",
    displayName: "setup",
    description:
      "Configure this project's environment: completions, LSP, and MCP",
    version: VERSION,
    examples: [
      "pragma setup",
      "pragma setup --no-with-lsp",
      "pragma setup --yes",
    ],
  },
  prompts: [
    {
      name: "withCompletions",
      type: "confirm",
      message: "Set up shell completions?",
      default: true,
    },
    {
      name: "withLsp",
      type: "confirm",
      message: "Install the Terrazzo LSP extension?",
      default: true,
    },
    {
      name: "withMcp",
      type: "confirm",
      message: "Configure the MCP server for AI harnesses?",
      default: true,
    },
  ],
  generate: (answers) => generateSetup(toSetupAnswers(answers)),
};

export default setupGenerator;
