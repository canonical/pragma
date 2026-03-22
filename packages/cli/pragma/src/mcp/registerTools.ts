/**
 * MCP tool registration.
 *
 * Registers all tools on an McpServer instance. Each handler delegates to
 * a shared operation and returns a `ToolPayload` — envelope construction
 * and error serialization are handled by `wrapTool`.
 *
 * MC.01 — same operations layer as CLI
 * MC.02 — divergent defaults (detailed: true for get operations)
 * MC.05 — annotation mechanism for mutation tools
 *
 * @see F.06 RS.06, F.02 NM.02, F.03 SF
 */

import { executeGenerator } from "@canonical/cli-core";
import { generators as componentGenerators } from "@canonical/summon-component";
import type { AnyGenerator } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VERSION } from "../constants.js";
import {
  getFormatters as componentGetFmt,
  listFormatters as componentListFmt,
} from "../domains/component/formatters/index.js";
import {
  getComponent,
  listComponents,
} from "../domains/component/operations/index.js";
import { doctorFormatters as doctorFmt } from "../domains/doctor/formatters/index.js";
import { runChecks } from "../domains/doctor/operations/index.js";
import { executeQuery, inspectUri } from "../domains/graph/operations/index.js";
import { collectStoreSummary } from "../domains/info/collectStoreSummary.js";
import { renderInfoLlm } from "../domains/info/renderInfo.js";
import type { InfoData } from "../domains/info/types.js";
import collectLlmContext from "../domains/llm/collectLlmContext.js";
import { COMMAND_REFERENCE, DECISION_TREES } from "../domains/llm/constants.js";
import type { LlmData } from "../domains/llm/types.js";
import {
  getFormatters as modifierGetFmt,
  listFormatters as modifierListFmt,
} from "../domains/modifier/formatters/index.js";
import {
  getModifier,
  listModifiers,
} from "../domains/modifier/operations/index.js";
import {
  listOntologies,
  showOntology,
} from "../domains/ontology/operations/index.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import type { FilterConfig } from "../domains/shared/types.js";
import { listFormatters as skillListFmt } from "../domains/skill/formatters/index.js";
import { listSkills } from "../domains/skill/operations/index.js";
import {
  categoriesFormatters as standardCatFmt,
  getFormatters as standardGetFmt,
  listFormatters as standardListFmt,
} from "../domains/standard/formatters/index.js";
import {
  getStandard,
  listCategories,
  listStandards,
} from "../domains/standard/operations/index.js";
import { listFormatters as tierListFmt } from "../domains/tier/formatters/index.js";
import { listTiers } from "../domains/tier/operations/index.js";
import {
  createGetFormatters as createTokenGetFmt,
  listFormatters as tokenListFmt,
} from "../domains/token/formatters/index.js";
import { getToken, listTokens } from "../domains/token/operations/index.js";
import { PragmaError } from "../error/PragmaError.js";
import estimateTokens from "./estimateTokens.js";
import wrapTool from "./wrapTool.js";

/**
 * Build filters from runtime config, optionally widening tier.
 */
function buildFilters(
  runtime: PragmaRuntime,
  allTiers?: boolean,
): FilterConfig {
  return {
    tier: allTiers ? undefined : runtime.config.tier,
    channel: runtime.config.channel,
  };
}

/**
 * Describe active filters as human-readable key-value pairs.
 */
function describeFilters(filters: FilterConfig): Record<string, string> {
  return {
    ...(filters.tier !== undefined && { tier: filters.tier }),
    channel: filters.channel,
  };
}

/**
 * Register all MCP tools on the server.
 */
export default function registerTools(
  server: McpServer,
  runtime: PragmaRuntime,
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
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { allTiers, condensed }) => {
      const filters = buildFilters(rt, allTiers as boolean | undefined);
      const result = await listComponents(rt.store, filters);

      if (condensed) {
        const text = componentListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return {
        data: result,
        meta: { count: result.length, filters: describeFilters(filters) },
      };
    }),
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
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, detailed, condensed }) => {
      const filters = buildFilters(rt);
      const result = await getComponent(rt.store, name as string, filters);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = componentGetFmt.llm({
          component: result,
          detailed: showDetailed,
          aspects: {
            anatomy: true,
            modifiers: true,
            tokens: true,
            implementations: true,
          },
        });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

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
          data: {
            uri,
            name: n,
            tier,
            modifiers,
            implementations,
            nodeCount,
            tokenCount,
          },
        };
      }

      return { data: result };
    }),
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
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { category, search, condensed }) => {
      let result = await listStandards(rt.store);

      if (category) {
        const cat = (category as string).toLowerCase();
        result = result.filter((s) => s.category.toLowerCase() === cat);
      }

      if (search) {
        const term = (search as string).toLowerCase();
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.description.toLowerCase().includes(term),
        );
      }

      if (condensed) {
        const text = standardListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
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
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, detailed, condensed }) => {
      const result = await getStandard(rt.store, name as string);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = standardGetFmt.llm({
          standard: result,
          detailed: showDetailed,
        });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      if (!showDetailed) {
        const { uri, name: n, category, description } = result;
        return { data: { uri, name: n, category, description } };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "standard_categories",
    {
      description: "List all code standard categories.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listCategories(rt.store);

      if (condensed) {
        const text = standardCatFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  // ---------------------------------------------------------------------------
  // Modifier
  // ---------------------------------------------------------------------------

  server.registerTool(
    "modifier_list",
    {
      description: "List all modifier families with their values.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listModifiers(rt.store);

      if (condensed) {
        const text = modifierListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "modifier_get",
    {
      description: "Get a modifier family and its values.",
      inputSchema: z.object({
        name: z.string().describe("Modifier family name (e.g. 'importance')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, condensed }) => {
      const result = await getModifier(rt.store, name as string);

      if (condensed) {
        const text = modifierGetFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  // ---------------------------------------------------------------------------
  // Token
  // ---------------------------------------------------------------------------

  server.registerTool(
    "token_list",
    {
      description:
        "List all design tokens. Optionally filter by category (token type).",
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe("Filter by token type (e.g., Color, Dimension)"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { category, condensed }) => {
      const result = await listTokens(rt.store, {
        category: category as string | undefined,
      });

      if (condensed) {
        const text = tokenListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "token_get",
    {
      description:
        "Get detailed information about a design token including theme values.",
      inputSchema: z.object({
        name: z.string().describe("Token name (e.g. 'color.primary')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, condensed }) => {
      const result = await getToken(rt.store, name as string);

      if (condensed) {
        const fmt = createTokenGetFmt({ detailed: true });
        const text = fmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  // ---------------------------------------------------------------------------
  // Tier
  // ---------------------------------------------------------------------------

  server.registerTool(
    "tier_list",
    {
      description:
        "List all tiers in the design system ontology with hierarchy.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listTiers(rt.store);

      if (condensed) {
        const text = tierListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  server.registerTool(
    "config_show",
    {
      description:
        "Show current pragma configuration (tier and channel settings).",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const data = {
        tier: rt.config.tier ?? null,
        channel: rt.config.channel,
      };

      if (condensed) {
        const text = `Config: tier=${data.tier ?? "(none)"} channel=${data.channel}`;
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data };
    }),
  );

  // ---------------------------------------------------------------------------
  // Ontology (SF.06)
  // ---------------------------------------------------------------------------

  server.registerTool(
    "ontology_list",
    {
      description:
        "List all ontologies loaded in the knowledge graph with class and property counts.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listOntologies(rt.store);

      if (condensed) {
        const lines = ["## Ontologies", ""];
        for (const o of result) {
          lines.push(
            `- **${o.prefix}:** (${o.namespace}) | classes: ${o.classCount} | properties: ${o.propertyCount}`,
          );
        }
        const text = lines.join("\n");
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "ontology_show",
    {
      description:
        "Show detailed schema for an ontology including classes and properties.",
      inputSchema: z.object({
        prefix: z.string().describe("Ontology prefix (e.g. 'ds', 'cs')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { prefix, condensed }) => {
      const result = await showOntology(rt.store, prefix as string);

      if (condensed) {
        const lines = [`## ${result.prefix}: (${result.namespace})`, ""];
        if (result.classes.length > 0) {
          lines.push("### Classes");
          for (const c of result.classes) {
            const sup = c.superclass ? ` extends ${c.superclass}` : "";
            lines.push(`- **${c.label}**${sup}`);
          }
          lines.push("");
        }
        if (result.properties.length > 0) {
          lines.push("### Properties");
          for (const p of result.properties) {
            const domain = p.domain ? ` domain: ${p.domain}` : "";
            const range = p.range ? ` range: ${p.range}` : "";
            lines.push(`- **${p.label}** (${p.type})${domain}${range}`);
          }
        }
        const text = lines.join("\n");
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  // ---------------------------------------------------------------------------
  // Graph (SF.07)
  // ---------------------------------------------------------------------------

  server.registerTool(
    "graph_query",
    {
      description:
        "Execute a SPARQL query against the knowledge graph. Returns raw query results. Use ontology_list to discover available namespaces and prefixes.",
      inputSchema: z.object({
        sparql: z.string().describe("SPARQL query string"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { sparql, condensed }) => {
      const result = await executeQuery(rt.store, sparql as string);

      if (condensed) {
        const text = JSON.stringify(result, null, 2);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "graph_inspect",
    {
      description:
        "Inspect a URI in the knowledge graph. Returns all predicates and objects for the given subject.",
      inputSchema: z.object({
        uri: z
          .string()
          .describe("URI to inspect (full or prefixed, e.g. 'ds:Button')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { uri, condensed }) => {
      const result = await inspectUri(rt.store, uri as string);

      if (condensed) {
        const lines = [`## ${result.uri}`, ""];
        for (const g of result.groups) {
          lines.push(`**${g.predicate}:**`);
          for (const o of g.objects) {
            lines.push(`  - ${o}`);
          }
        }
        const text = lines.join("\n");
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  // ---------------------------------------------------------------------------
  // Skill (SF.09)
  // ---------------------------------------------------------------------------

  server.registerTool(
    "skill_list",
    {
      description: "List available agent skills from design system packages.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const { skills, sources } = await listSkills(rt.cwd);

      if (condensed) {
        const text = skillListFmt.llm({ skills, sources, detailed: false });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: { skills, sources }, meta: { count: skills.length } };
    }),
  );

  // ---------------------------------------------------------------------------
  // Doctor (SF.11)
  // ---------------------------------------------------------------------------

  server.registerTool(
    "doctor",
    {
      description:
        "Run health checks on the pragma environment. Validates config, store, completions, skills, and more.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await runChecks({ cwd: rt.cwd });

      if (condensed) {
        const text = doctorFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  // ---------------------------------------------------------------------------
  // Info (SF.11)
  // ---------------------------------------------------------------------------

  server.registerTool(
    "info",
    {
      description: "Show pragma version, configuration, and store summary.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const storeSummary = await collectStoreSummary(rt.store);

      const data: InfoData = {
        version: VERSION,
        pm: "unknown",
        configPath: "pragma.config.json",
        tier: rt.config.tier,
        tierChain: [],
        channel: rt.config.channel,
        channelReleases: [],
        update: undefined,
        updateSkipped: true,
        store: storeSummary,
      };

      if (condensed) {
        const text = renderInfoLlm(data);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data };
    }),
  );

  // ---------------------------------------------------------------------------
  // Capabilities (SF.10, OD.02)
  // ---------------------------------------------------------------------------

  /** All registered tool names, categorized for the capabilities response. */
  const toolNames = {
    read: [
      "component_list",
      "component_get",
      "standard_list",
      "standard_get",
      "standard_categories",
      "modifier_list",
      "modifier_get",
      "token_list",
      "token_get",
      "tier_list",
      "config_show",
      "ontology_list",
      "ontology_show",
      "graph_query",
      "graph_inspect",
      "skill_list",
    ],
    write: ["create_component", "create_package"],
    orientation: ["llm", "capabilities"],
    diagnostic: ["doctor", "info"],
  };
  const allToolNames = [
    ...toolNames.read,
    ...toolNames.write,
    ...toolNames.orientation,
    ...toolNames.diagnostic,
  ];

  server.registerTool(
    "capabilities",
    {
      description:
        "List all available pragma MCP tools with counts by category. Call this first to discover what pragma can do. (~100 tokens)",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async () => {
      return {
        data: {
          tools: allToolNames,
          counts: {
            total: allToolNames.length,
            read: toolNames.read.length,
            write: toolNames.write.length,
            orientation: toolNames.orientation.length,
            diagnostic: toolNames.diagnostic.length,
          },
        },
      };
    }),
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

  // ---------------------------------------------------------------------------
  // LLM Orientation
  // ---------------------------------------------------------------------------

  server.registerTool(
    "llm",
    {
      description:
        "Get LLM orientation for the pragma design system CLI. Returns context, decision trees for common intents, and command reference with token costs. Call this first when starting a design system task.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt) => {
      const filters = buildFilters(rt);
      const context = await collectLlmContext(rt.store, filters);
      const data: LlmData = {
        context,
        decisionTrees: DECISION_TREES,
        commandReference: COMMAND_REFERENCE,
      };
      return { data };
    }),
  );
}
