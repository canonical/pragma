/**
 * MCP generator tools — create_component, create_package.
 */

import { executeGenerator } from "@canonical/cli-core";
import { generators as componentGenerators } from "@canonical/summon-component";
import type { AnyGenerator } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { PragmaError } from "../../error/PragmaError.js";
import wrapTool from "../wrapTool.js";

const componentGeneratorMap: Record<string, AnyGenerator> = {
  react: componentGenerators["component/react"],
  svelte: componentGenerators["component/svelte"],
  lit: componentGenerators["component/lit"],
};

/**
 * Register create_component and create_package tools.
 */
export function registerGeneratorTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  /** Batch context for MCP generator execution — forces JSON output mode. */
  const batchCtx = {
    cwd: runtime.cwd,
    globalFlags: {
      llm: false,
      format: "json" as const,
      verbose: false,
    },
  };

  server.registerTool(
    "create_component",
    {
      description:
        "Generate a design system component with TypeScript, tests, stories, and styles. Returns a JSON generation plan (dry-run).",
      inputSchema: z.object({
        framework: z
          .enum(["react", "svelte", "lit"])
          .describe("Component framework"),
        componentPath: z
          .string()
          .describe(
            "Path for the component directory (e.g. 'src/components/Button')",
          ),
        withStyles: z
          .boolean()
          .optional()
          .describe("Include CSS styles (default: true)"),
        withStories: z
          .boolean()
          .optional()
          .describe("Include Storybook stories (default: true)"),
        withSsrTests: z
          .boolean()
          .optional()
          .describe("Include SSR tests (default: true)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    wrapTool(runtime, async (_rt, params) => {
      const framework = params.framework as string;
      const gen = componentGeneratorMap[framework];
      if (!gen) {
        throw PragmaError.invalidInput("framework", framework, {
          validOptions: Object.keys(componentGeneratorMap),
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
    }),
  );

  server.registerTool(
    "create_package",
    {
      description:
        "Generate a new npm package with proper configuration. Returns a JSON generation plan (dry-run).",
      inputSchema: z.object({
        name: z
          .string()
          .describe("Full package name (e.g. '@canonical/my-package')"),
        type: z.enum(["tool-ts", "library", "css"]).describe("Package type"),
        description: z.string().optional().describe("Package description"),
        withReact: z
          .boolean()
          .optional()
          .describe("Add React dependencies (default: false)"),
        withStorybook: z
          .boolean()
          .optional()
          .describe("Add Storybook config (default: false)"),
        withCli: z
          .boolean()
          .optional()
          .describe("Add CLI entry point (default: false)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    wrapTool(runtime, async (_rt, params) => {
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
    }),
  );
}
