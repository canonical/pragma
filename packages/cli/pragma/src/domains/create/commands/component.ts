import {
  type CommandDefinition,
  executeGenerator,
  type ParameterDefinition,
  promptToParameter,
} from "@canonical/cli-core";
import { generators } from "@canonical/summon-component";
import { PragmaError } from "#error";
import { COMPONENT_GENERATORS } from "../generators.js";

const FRAMEWORK_CHOICES = [
  { label: "react", value: "react" },
  { label: "svelte", value: "svelte" },
  { label: "lit", value: "lit" },
] as const;

/** Reference generator used to derive shared prompt parameters. */
const referenceGenerator = generators["component/react"];

/**
 * Build the `pragma create component` command definition.
 *
 * Uses a dispatch pattern: `framework` is a required positional select
 * parameter. The execute function looks up the matching generator and
 * delegates to `executeGenerator` from cli-core.
 *
 * @returns The command definition for `pragma create component`.
 * @note Impure
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
      name: "undo",
      description: "Reverse a previously generated component",
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
          recovery: {
            message: "Provide a framework for component generation.",
            cli: "pragma create component react --component-path src/components/Button",
          },
        });
      }

      const gen = COMPONENT_GENERATORS[framework];
      if (!gen) {
        throw PragmaError.invalidInput("framework", framework, {
          validOptions: Object.keys(COMPONENT_GENERATORS),
          recovery: {
            message: `Valid frameworks: ${Object.keys(COMPONENT_GENERATORS).join(", ")}`,
          },
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
