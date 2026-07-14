/**
 * Resolve the TTL sources for a graphql command.
 *
 * When positional paths or globs are given they win; otherwise the sources
 * are the union of every configured semantic package's graphs (the
 * `pragma.config.json` packages, falling back to the defaults). Either way
 * the result is a list of ke `InlineSource`s (content + provenance path),
 * so the compiler and the dev server load the exact same bytes.
 *
 * @note Impure — reads files and resolves packages from disk.
 *
 * @param positional - Explicit TTL file paths or glob patterns (may be empty).
 * @param cwd - Working directory for file and config resolution.
 * @returns In-memory TTL sources to compile or serve.
 * @throws PragmaError (INVALID_INPUT) when nothing resolves.
 */

import { readFileSync } from "node:fs";
import type { InlineSource } from "@canonical/ke";
import { PragmaError } from "#error";
import resolveConfiguredGraphs from "../../shared/resolveConfiguredGraphs.js";
import resolveSourceFiles from "./resolveSourceFiles.js";

export default async function gatherSources(
  positional: readonly string[],
  cwd: string,
): Promise<InlineSource[]> {
  if (positional.length > 0) {
    const files = resolveSourceFiles([...positional], cwd);
    if (files.length === 0) {
      throw PragmaError.invalidInput("sources", positional.join(", "), {
        recovery: {
          message: "No files matched the given paths or glob patterns.",
        },
      });
    }
    return files.map((path) => ({
      content: readFileSync(path, "utf-8"),
      format: "turtle" as const,
      path,
    }));
  }

  const graphs = await resolveConfiguredGraphs(cwd);
  if (graphs.length === 0) {
    throw PragmaError.invalidInput("sources", "(none)", {
      recovery: {
        message:
          "No TTL sources given and no semantic packages resolved. Pass TTL files or globs, or configure `packages` in pragma.config.json and install them.",
      },
    });
  }
  return graphs.map((graph) => ({
    content: graph.content,
    format: graph.format,
    path: graph.path,
  }));
}
