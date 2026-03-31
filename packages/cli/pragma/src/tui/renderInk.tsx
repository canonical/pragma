import type React from "react";

/**
 * Render a React element via Ink's renderToString and write to stdout.
 *
 * Uses Ink's synchronous `renderToString` since all pragma TUI views
 * are static (single frame, no interaction). Strips trailing whitespace
 * from each line to avoid Ink's column-width padding creating blank gaps.
 * Dynamically imports Ink so the React/Ink bundle is never parsed
 * for non-TTY or machine-readable invocations.
 *
 * @param element - A React element (typically a ListView or LookupView).
 *
 * @note Impure — writes to process.stdout via Ink's renderToString.
 */
export default async function renderInk(
  element: React.ReactElement,
): Promise<void> {
  const { renderToString } = await import("ink");
  const raw = renderToString(element, {
    columns: process.stdout.columns ?? 80,
  });
  if (raw) {
    const cleaned = raw
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd();
    process.stdout.write(`${cleaned}\n`);
  }
}
