import { PragmaError } from "#error";

export default function tokenEmptyError(
  category: string | undefined,
  context: { unfilteredCount: number },
): PragmaError {
  const hasHiddenItems = context.unfilteredCount > 0;

  if (category && hasHiddenItems) {
    return PragmaError.emptyResults("token", {
      message: `No tokens found for category "${category}". ${context.unfilteredCount} token(s) available without the category filter.`,
      filters: { category },
      recovery: {
        message: "List all tokens without category filter.",
        cli: "pragma token list",
        mcp: { tool: "token_list" },
      },
    });
  }

  if (category) {
    return PragmaError.emptyResults("token", {
      message: `No tokens found for category "${category}".`,
      filters: { category },
      recovery: {
        message: "List all tokens without category filter.",
        cli: "pragma token list",
        mcp: { tool: "token_list" },
      },
    });
  }

  return PragmaError.emptyResults("token", {
    recovery: {
      message:
        "Ensure design system packages are installed: bun add -D @canonical/ds-global",
    },
  });
}
