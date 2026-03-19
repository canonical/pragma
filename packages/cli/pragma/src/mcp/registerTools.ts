/**
 * MCP tool registration.
 *
 * Registers all D3-backed tools on an McpServer instance.
 * Each handler delegates to a shared operation and serializes
 * PragmaError as structured MCP error responses.
 *
 * MC.01 — same operations layer as CLI
 * MC.02 — divergent defaults (detailed: true for get operations)
 * MC.03 — recovery objects in error responses
 * MC.04 — consistent error codes
 * MC.05 — annotation mechanism for mutation tools
 */

import { executeGenerator } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { generators as componentGenerators } from "@canonical/summon-component";
import type { AnyGenerator } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaConfig } from "../config.js";
import {
  getComponent,
  listComponents,
} from "../domains/component/operations/index.js";
import {
  getModifier,
  listModifiers,
} from "../domains/modifier/operations/index.js";
import type { FilterConfig } from "../domains/shared/types.js";
import {
  getStandard,
  listCategories,
  listStandards,
} from "../domains/standard/operations/index.js";
import { listTiers } from "../domains/tier/operations/index.js";
import { getToken, listTokens } from "../domains/token/operations/index.js";
import { PragmaError } from "../error/PragmaError.js";
import serializeError from "./serializeError.js";

/**
 * Register all D3-backed MCP tools on the server.
 */
export default function registerTools(
  server: McpServer,
  store: Store,
  config: PragmaConfig,
): void {
  // ---------------------------------------------------------------------------
  // Component
  // ---------------------------------------------------------------------------

  server.registerTool(
    "component_list",
    {
      description:
        "List design system components visible under current tier and channel configuration.",
      inputSchema: z.object({
        allTiers: z
          .boolean()
          .optional()
          .describe("Show components from all tiers, ignoring tier filter"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ allTiers }) => {
      try {
        const filters: FilterConfig = {
          tier: allTiers ? undefined : config.tier,
          channel: config.channel,
        };
        const result = await listComponents(store, filters);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  server.registerTool(
    "component_get",
    {
      description:
        "Get detailed information about a design system component including anatomy, modifiers, tokens, and applicable standards.",
      inputSchema: z.object({
        name: z.string().describe("Component name (e.g. 'Button')"),
        detailed: z
          .boolean()
          .optional()
          .describe("Return full details (default: true for MCP)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, detailed }) => {
      try {
        const filters: FilterConfig = {
          tier: config.tier,
          channel: config.channel,
        };
        const result = await getComponent(store, name, filters);

        // MC.02: MCP defaults to detailed=true
        const showDetailed = detailed ?? true;
        if (!showDetailed) {
          const {
            uri,
            name: n,
            tier,
            modifiers,
            implementations,
            nodeCount,
            tokenCount,
          } = result;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    uri,
                    name: n,
                    tier,
                    modifiers,
                    implementations,
                    nodeCount,
                    tokenCount,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Standard
  // ---------------------------------------------------------------------------

  server.registerTool(
    "standard_list",
    {
      description:
        "List code standards. Optionally filter by category or search term.",
      inputSchema: z.object({
        category: z.string().optional().describe("Filter by category name"),
        search: z
          .string()
          .optional()
          .describe("Search in name and description"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ category, search }) => {
      try {
        let result = await listStandards(store);

        // Post-filter by category
        if (category) {
          result = result.filter(
            (s) => s.category.toLowerCase() === category.toLowerCase(),
          );
        }

        // Post-filter by search term
        if (search) {
          const term = search.toLowerCase();
          result = result.filter(
            (s) =>
              s.name.toLowerCase().includes(term) ||
              s.description.toLowerCase().includes(term),
          );
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  server.registerTool(
    "standard_get",
    {
      description:
        "Get detailed information about a code standard including dos and donts with code examples.",
      inputSchema: z.object({
        name: z
          .string()
          .describe("Standard name (e.g. 'code/function/purity')"),
        detailed: z
          .boolean()
          .optional()
          .describe(
            "Return full details with dos/donts (default: true for MCP)",
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, detailed }) => {
      try {
        const result = await getStandard(store, name);

        // MC.02: MCP defaults to detailed=true
        const showDetailed = detailed ?? true;
        if (!showDetailed) {
          const { uri, name: n, category, description } = result;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { uri, name: n, category, description },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  server.registerTool(
    "standard_categories",
    {
      description: "List all code standard categories.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const result = await listCategories(store);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Modifier
  // ---------------------------------------------------------------------------

  server.registerTool(
    "modifier_list",
    {
      description: "List all modifier families with their values.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const result = await listModifiers(store);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  server.registerTool(
    "modifier_get",
    {
      description: "Get a modifier family and its values.",
      inputSchema: z.object({
        name: z.string().describe("Modifier family name (e.g. 'importance')"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      try {
        const result = await getModifier(store, name);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Token
  // ---------------------------------------------------------------------------

  server.registerTool(
    "token_list",
    {
      description: "List all design tokens.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const result = await listTokens(store);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  server.registerTool(
    "token_get",
    {
      description:
        "Get detailed information about a design token including theme values.",
      inputSchema: z.object({
        name: z.string().describe("Token name (e.g. 'color.primary')"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      try {
        const result = await getToken(store, name);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tier
  // ---------------------------------------------------------------------------

  server.registerTool(
    "tier_list",
    {
      description:
        "List all tiers in the design system ontology with hierarchy.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const result = await listTiers(store);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  server.registerTool(
    "config_show",
    {
      description:
        "Show current pragma configuration (tier and channel settings).",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                tier: config.tier ?? null,
                channel: config.channel,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // Generators (D14 — mutating tools)
  // ---------------------------------------------------------------------------

  const componentGeneratorMap: Record<string, AnyGenerator> = {
    react: componentGenerators["component/react"],
    svelte: componentGenerators["component/svelte"],
    lit: componentGenerators["component/lit"],
  };

  /** Batch context for MCP generator execution — forces JSON output mode. */
  const batchCtx = {
    cwd: process.cwd(),
    globalFlags: {
      llm: false,
      format: "json" as const,
      verbose: false,
    },
  };

  server.registerTool(
    "pragma_create_component",
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
    async ({
      framework,
      componentPath,
      withStyles,
      withStories,
      withSsrTests,
    }) => {
      try {
        const gen = componentGeneratorMap[framework];
        if (!gen) {
          throw PragmaError.invalidInput("framework", framework, {
            validOptions: Object.keys(componentGeneratorMap),
          });
        }

        const params: Record<string, unknown> = {
          componentPath,
          ...(withStyles !== undefined && { withStyles }),
          ...(withStories !== undefined && { withStories }),
          ...(withSsrTests !== undefined && { withSsrTests }),
        };

        const result = await executeGenerator(gen, params, batchCtx);
        if (result.tag === "output") {
          const text = result.render.plain(result.value);
          return { content: [{ type: "text", text }] };
        }

        return {
          content: [
            {
              type: "text",
              text: "Missing required parameters. Provide componentPath.",
            },
          ],
          isError: true,
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );

  server.registerTool(
    "pragma_create_package",
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
    async ({ name, type, description, withReact, withStorybook, withCli }) => {
      try {
        const gen = packageGenerators.package as AnyGenerator | undefined;
        if (!gen)
          throw PragmaError.internalError("Package generator not found");

        const params: Record<string, unknown> = {
          name,
          type,
          ...(description !== undefined && { description }),
          ...(withReact !== undefined && { withReact }),
          ...(withStorybook !== undefined && { withStorybook }),
          ...(withCli !== undefined && { withCli }),
          runInstall: false, // Never run install from MCP
        };

        const result = await executeGenerator(gen, params, batchCtx);
        if (result.tag === "output") {
          const text = result.render.plain(result.value);
          return { content: [{ type: "text", text }] };
        }

        return {
          content: [
            {
              type: "text",
              text: "Missing required parameters. Provide name and type.",
            },
          ],
          isError: true,
        };
      } catch (error) {
        if (error instanceof PragmaError) return serializeError(error);
        throw error;
      }
    },
  );
}
