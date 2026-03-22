/**
 * Component generator command with framework dispatch.
 *
 * Wraps the three component generators (react/svelte/lit) from
 * @canonical/summon-component behind a single `create component` command
 * with `framework` as a required positional parameter.
 *
 * GN.01 — pragma create replaces summon
 * PA.13 — selective generator inclusion
 */

import {
  type CommandDefinition,
  executeGenerator,
  type ParameterDefinition,
  promptToParameter,
} from "@canonical/cli-core";
import { generators } from "@canonical/summon-component";
import type { AnyGenerator } from "@canonical/summon-core";
import { PragmaError } from "#error";

const FRAMEWORK_CHOICES = [
  { label: "react", value: "react" },
  { label: "svelte", value: "svelte" },
  { label: "lit", value: "lit" },
] as const;

const GENERATOR_MAP: Record<string, AnyGenerator> = {
  react: generators["component/react"],
  svelte: generators["component/svelte"],
  lit: generators["component/lit"],
};

/** Reference generator for deriving shared prompt parameters. */
const referenceGenerator = generators["component/react"];

/**
 * Build the `pragma create component` command.
 *
 * Uses a dispatch pattern: `framework` is a required positional select
 * parameter. The execute function looks up the matching generator and
 * delegates to `executeGenerator` from cli-core.
 */
export default function buildComponentCommand(): CommandDefinition {
  const frameworkParam: ParameterDefinition = {
    name: "framework",
    description: "Component framework (react, svelte, lit)",
    type: "select",
    choices: [...FRAMEWORK_CHOICES],
    positional: true,
    required: true,
  };

  // Derive prompt parameters from the reference generator
  const promptParams = referenceGenerator.prompts.map(promptToParameter);

  // Execution-mode parameters (same as generatorToCommand appends)
  const execParams: ParameterDefinition[] = [
    {
      name: "dryRun",
      description: "Preview without writing files",
      type: "boolean",
    },
    {
      name: "yes",
      description: "Skip confirmation prompts",
      type: "boolean",
    },
    {
      name: "showFiles",
      description: "Show file contents in dry-run",
      type: "boolean",
    },
    {
      name: "preview",
      description: "Show file preview before writing",
      type: "boolean",
      default: true,
    },
    {
      name: "generatedStamp",
      description: "Add generated file stamps",
      type: "boolean",
      default: true,
    },
  ];

  const parameters = [frameworkParam, ...promptParams, ...execParams];

  return {
    path: ["create", "component"],
    description:
      "Generate a component with TypeScript, tests, stories, and styles",
    parameters,
    execute: async (params, ctx) => {
      const framework = params.framework as string | undefined;
      if (!framework) {
        throw PragmaError.invalidInput("framework", "(missing)", {
          validOptions: ["react", "svelte", "lit"],
          recovery:
            "Provide a framework: `pragma create component react --component-path src/components/Button`",
        });
      }

      const gen = GENERATOR_MAP[framework];
      if (!gen) {
        throw PragmaError.invalidInput("framework", framework, {
          validOptions: Object.keys(GENERATOR_MAP),
          recovery: `Valid frameworks: ${Object.keys(GENERATOR_MAP).join(", ")}`,
        });
      }

      return executeGenerator(gen, params, ctx);
    },
    meta: {
      examples: [
        "pragma create component react --component-path src/components/Button",
        "pragma create component svelte --component-path src/lib/components/Toggle",
        "pragma create component lit --component-path src/lib/Accordion",
        "pragma create component react --component-path src/components/Button --dry-run",
      ],
    },
    parameterGroups: {
      Component: ["componentPath"],
      Options: ["withStyles", "withStories", "withSsrTests"],
    },
  };
}
