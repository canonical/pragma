import { PragmaError } from "#error";

export default function tokenEmptyError(category?: string): PragmaError {
  return PragmaError.emptyResults("token", {
    filters: category ? { category } : undefined,
    recovery: category
      ? {
          // Filter-narrowing: a category was active — clear it and re-list.
          message: "List all tokens without category filter.",
          cli: "pragma token list",
          mcp: { tool: "token_list" },
        }
      : {
          // Store-empty: no category was active, so the token-supplying
          // packages are absent. No mcp retry — re-listing returns empty.
          message: "Install the design system packages that provide tokens.",
          cli: "bun add -D @canonical/design-system",
        },
  });
}
