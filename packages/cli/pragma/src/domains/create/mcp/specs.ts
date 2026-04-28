/**
 * MCP tool specs for create domain — create_component, create_package.
 */

import { executeGenerator } from "@canonical/cli-core";
import type { AnyGenerator } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import { PragmaError } from "#error";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { COMPONENT_GENERATORS } from "../generators.js";

const specs: readonly ToolSpec[] = [
  {
    name: "create_component",
    description:
      "Generate a design system component with TypeScript, tests, stories, and styles. Returns a JSON generation plan (dry-run).",
    params: {
      framework: {
        type: "string",
        description: "Component framework",
        optional: false,
        enum: ["react", "svelte", "lit"],
      },
      componentPath: {
        type: "string",
        description:
          "Path for the component directory (e.g. 'src/components/Button')",
        optional: false,
      },
      withStyles: {
        type: "boolean",
        description: "Include CSS styles (default: true)",
        optional: true,
      },
      withStories: {
        type: "boolean",
        description: "Include Storybook stories (default: true)",
        optional: true,
      },
      withSsrTests: {
        type: "boolean",
        description: "Include SSR tests (default: true)",
        optional: true,
      },
    },
    readOnly: false,
    destructive: false,
    async execute(rt, params) {
      const batchCtx = {
        cwd: rt.cwd,
        globalFlags: {
          llm: false,
          format: "json" as const,
          verbose: false,
        },
      };

      const framework = params.framework as string;
      const gen = COMPONENT_GENERATORS[framework];
      if (!gen) {
        throw PragmaError.invalidInput("framework", framework, {
          validOptions: Object.keys(COMPONENT_GENERATORS),
        });
      }

      const genParams: Record<string, unknown> = {
        componentPath: params.componentPath,
        ...(params.withStyles !== undefined && {
          withStyles: params.withStyles,
        }),
        ...(params.withStories !== undefined && {
          withStories: params.withStories,
        }),
        ...(params.withSsrTests !== undefined && {
          withSsrTests: params.withSsrTests,
        }),
      };

      const result = await executeGenerator(gen, genParams, batchCtx);
      if (result.tag === "output") {
        const text = result.render.plain(result.value);
        return { data: JSON.parse(text) };
      }

      throw PragmaError.invalidInput(
        "componentPath",
        String(params.componentPath),
      );
    },
  },
  {
    name: "create_package",
    description:
      "Generate a new npm package with proper configuration. Returns a JSON generation plan (dry-run).",
    params: {
      name: {
        type: "string",
        description: "Full package name (e.g. '@canonical/my-package')",
        optional: false,
      },
      type: {
        type: "string",
        description: "Package type",
        optional: false,
        enum: ["tool-ts", "library", "css"],
      },
      description: {
        type: "string",
        description: "Package description",
        optional: true,
      },
      withReact: {
        type: "boolean",
        description: "Add React dependencies (default: false)",
        optional: true,
      },
      withStorybook: {
        type: "boolean",
        description: "Add Storybook config (default: false)",
        optional: true,
      },
      withCli: {
        type: "boolean",
        description: "Add CLI entry point (default: false)",
        optional: true,
      },
    },
    readOnly: false,
    destructive: false,
    async execute(rt, params) {
      const batchCtx = {
        cwd: rt.cwd,
        globalFlags: {
          llm: false,
          format: "json" as const,
          verbose: false,
        },
      };

      const gen = packageGenerators.package as AnyGenerator | undefined;
      if (!gen) throw PragmaError.internalError("Package generator not found");

      const genParams: Record<string, unknown> = {
        name: params.name,
        type: params.type,
        ...(params.description !== undefined && {
          description: params.description,
        }),
        ...(params.withReact !== undefined && { withReact: params.withReact }),
        ...(params.withStorybook !== undefined && {
          withStorybook: params.withStorybook,
        }),
        ...(params.withCli !== undefined && { withCli: params.withCli }),
        runInstall: false,
      };

      const result = await executeGenerator(gen, genParams, batchCtx);
      if (result.tag === "output") {
        const text = result.render.plain(result.value);
        return { data: JSON.parse(text) };
      }

      throw PragmaError.invalidInput("name", String(params.name));
    },
  },
];

export default specs;
