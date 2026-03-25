import { PragmaError } from "#error";

export default function tokenEmptyError(category?: string): PragmaError {
  return PragmaError.emptyResults("token", {
    filters: category ? { category } : undefined,
    recovery: category
      ? {
          message: "List all tokens without category filter.",
          cli: "pragma token list",
          mcp: { tool: "token_list" },
        }
      : {
          message:
            "Ensure design system packages are installed: bun add -D @canonical/ds-global",
        },
  });
}
