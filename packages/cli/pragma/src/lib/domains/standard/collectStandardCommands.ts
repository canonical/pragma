/**
 * Standard CLI commands (D5).
 *
 * Wires shared operations into CommandDefinition[] for the
 * domain federation pattern.
 *
 * @see ST.02–ST.06, CL.04
 */

import {
  type CommandContext,
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { PragmaError } from "../../../error/index.js";
import { bootStore } from "../shared/bootStore.js";
import {
  formatCategoriesLlm,
  formatCategoriesPlain,
  formatStandardGetLlm,
  formatStandardGetPlain,
  formatStandardJson,
  formatStandardsListLlm,
  formatStandardsListPlain,
} from "./formatStandard.js";
import { getStandard } from "./getStandard.js";
import { listCategories } from "./listCategories.js";
import { listStandards } from "./listStandards.js";
import type { StandardCommandOptions } from "./types.js";

/**
 * Collect all standard command definitions.
 */
export default function collectStandardCommands(
  options: StandardCommandOptions = {},
): CommandDefinition[] {
  const resolveStore = async (): Promise<Store> =>
    options.store ?? (await bootStore());

  return [
    buildStandardList(resolveStore),
    buildStandardGet(resolveStore),
    buildStandardCategories(resolveStore),
  ];
}

// =============================================================================
// pragma standard list
// =============================================================================

function buildStandardList(
  resolveStore: () => Promise<Store>,
): CommandDefinition {
  return {
    path: ["standard", "list"],
    description: "List all code standards",
    parameters: [
      {
        name: "category",
        description: "Filter by category",
        type: "string",
      },
      {
        name: "search",
        description: "Search in name and description",
        type: "string",
      },
    ],
    meta: {
      examples: [
        "pragma standard list",
        "pragma standard list --category react",
        'pragma standard list --search "folder"',
        "pragma standard list --llm",
      ],
    },
    async execute(params: Record<string, unknown>, ctx: CommandContext) {
      const store = await resolveStore();
      const filters = {
        category: params.category as string | undefined,
        search: params.search as string | undefined,
      };

      const standards = await listStandards(store, filters);

      if (standards.length === 0) {
        throw PragmaError.emptyResults("standards", {
          filters: buildActiveFilters(filters),
          recovery: "Run `pragma standard list` to see all standards.",
        });
      }

      return createOutputResult(standards, {
        plain: (data) =>
          ctx.globalFlags.llm
            ? formatStandardsListLlm(data)
            : formatStandardsListPlain(data),
      });
    },
  };
}

// =============================================================================
// pragma standard get <name>
// =============================================================================

function buildStandardGet(
  resolveStore: () => Promise<Store>,
): CommandDefinition {
  return {
    path: ["standard", "get"],
    description: "Get detailed information for a standard",
    parameters: [
      {
        name: "name",
        description: "Standard name (e.g., react/component/folder-structure)",
        type: "string",
        positional: true,
        required: true,
      },
      {
        name: "detailed",
        description: "Include dos and donts with code blocks",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma standard get react/component/folder-structure",
        "pragma standard get react/component/folder-structure --detailed",
        "pragma standard get react/component/folder-structure --llm",
      ],
    },
    async execute(params: Record<string, unknown>, ctx: CommandContext) {
      const store = await resolveStore();
      const name = params.name as string;
      const detailed = (params.detailed as boolean) ?? false;
      const standard = await getStandard(store, name);

      return createOutputResult(standard, {
        plain: (data) => {
          if (ctx.globalFlags.format === "json") {
            return formatStandardJson(data, detailed);
          }
          if (ctx.globalFlags.llm) {
            return formatStandardGetLlm(data, detailed);
          }
          return formatStandardGetPlain(data, detailed);
        },
      });
    },
  };
}

// =============================================================================
// pragma standard categories
// =============================================================================

function buildStandardCategories(
  resolveStore: () => Promise<Store>,
): CommandDefinition {
  return {
    path: ["standard", "categories"],
    description: "List all standard categories with counts",
    parameters: [],
    meta: {
      examples: ["pragma standard categories"],
    },
    async execute(_params: Record<string, unknown>, ctx: CommandContext) {
      const store = await resolveStore();
      const categories = await listCategories(store);

      if (categories.length === 0) {
        throw PragmaError.emptyResults("categories", {
          recovery:
            "Ensure code standards packages are installed: bun add -D @canonical/code-standards",
        });
      }

      return createOutputResult(categories, {
        plain: (data) =>
          ctx.globalFlags.llm
            ? formatCategoriesLlm(data)
            : formatCategoriesPlain(data),
      });
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function buildActiveFilters(filters: {
  category?: string;
  search?: string;
}): Record<string, string> | undefined {
  const active: Record<string, string> = {};
  if (filters.category) active.category = filters.category;
  if (filters.search) active.search = filters.search;
  return Object.keys(active).length > 0 ? active : undefined;
}
