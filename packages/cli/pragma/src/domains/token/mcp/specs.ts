/**
 * MCP tool specs for the token domain — tokens_add_config and token_sample.
 *
 * `token_list` and `token_lookup` are compiled from the bundled `token`
 * story pack. Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import { writeFileSync } from "node:fs";
import { PragmaError } from "#error";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { TOKEN_READ_SURFACE_ENABLED } from "../featureFlag.js";
import { sampleFormatters as tokenSampleFmt } from "../formatters/index.js";
import { resolveAddConfig, sampleTokens } from "../operations/index.js";

const allSpecs: readonly ToolSpec[] = [
  {
    name: "tokens_add_config",
    description:
      "Generate a tokens.config.mjs file for the terrazzo token pipeline. " +
      "Use when wiring design-token sources into a project. Example: " +
      "tokens_add_config {}.",
    params: {
      force: {
        type: "boolean",
        description: "Overwrite existing config file",
        optional: true,
      },
    },
    readOnly: false,
    async execute(rt, { force }) {
      const result = resolveAddConfig(rt.cwd);

      if (result.alreadyExists && !force) {
        throw PragmaError.invalidInput("tokens.config.mjs", "already exists", {
          recovery: {
            message: "Overwrite existing config file.",
            cli: "pragma tokens add-config --force",
            mcp: { tool: "tokens_add_config", params: { force: true } },
          },
        });
      }

      writeFileSync(result.configPath, result.configContent, "utf-8");

      return {
        data: {
          configPath: result.configPath,
          tokenSources: result.tokenSources,
          installHint: result.installHint,
        },
      };
    },
  },
  {
    name: "token_sample",
    description:
      "Return 1–5 randomly selected complete token instances as exemplars " +
      "(different each call). Use when new to token data — see actual " +
      "shapes with theme values BEFORE writing queries. Example: " +
      'token_sample { count: "2" }.',
    params: {
      count: {
        type: "string",
        description: "Number of samples (1–5, default 2)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { count, condensed }) {
      const n = Number(count ?? 2);
      const result = await sampleTokens(rt.store, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total tokens.`,
        "Use token_lookup to inspect specific tokens by name.",
        "Use token_list with category param to filter by type.",
      ];

      if (condensed) {
        const text = tokenSampleFmt.llm({ ...result, nextSteps });
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return {
        data: {
          samples: result.samples,
          totalCount: result.totalCount,
          nextSteps,
        },
        meta: { count: result.samples.length },
      };
    },
  },
] as const;

/** Token read tools gated by {@link TOKEN_READ_SURFACE_ENABLED}. */
const TOKEN_READ_TOOLS = new Set([
  "token_list",
  "token_lookup",
  "token_sample",
]);

const specs: readonly ToolSpec[] = TOKEN_READ_SURFACE_ENABLED
  ? allSpecs
  : allSpecs.filter((spec) => !TOKEN_READ_TOOLS.has(spec.name));

export default specs;
