import { readFile } from "node:fs/promises";
import { glob } from "tinyglobby";
import type { LedgerAnnotation } from "./types.js";

/**
 * Regex matching `@implements` annotations in source files.
 *
 * Mirrors the grammar of the existing collect tooling
 * (design-system/src/collect/scanAnnotations.ts) so that the ledger and the
 * rewrite-style collector agree on what an annotation is:
 *
 *   @implements ds:global.component.button
 *   @implements ds:global.component.button@1.0.0
 *   @implements ds:global.component.button [draft]
 *   @implements ds:global.component.button@1.0.0 [draft]
 *
 * Captures:
 *   [1] full prefixed URI (e.g. "ds:global.component.button")
 *   [2] optional version suffix (e.g. "1.0.0")
 */
const IMPLEMENTS_REGEX =
  /@implements\s+([a-zA-Z_][a-zA-Z0-9_]*:[a-zA-Z0-9_.:-]+)(?:@(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?))?(?:\s+\[draft\])?/g;

/** Check if the matched annotation text contains a `[draft]` marker */
const isDraftAnnotation = (text: string): boolean => /\[draft\]/i.test(text);

/**
 * Scan a single file's content for `@implements` annotations.
 */
export function scanContent(
  content: string,
  filePath: string,
): LedgerAnnotation[] {
  const annotations: LedgerAnnotation[] = [];
  const regex = new RegExp(IMPLEMENTS_REGEX.source, "g");

  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null) {
    const blockUri = match[1];
    const colonIndex = blockUri.indexOf(":");

    annotations.push({
      filePath,
      blockUri,
      prefix: colonIndex > 0 ? blockUri.slice(0, colonIndex) : undefined,
      version: match[2],
      isDraft: isDraftAnnotation(match[0]),
      index: match.index,
    });
    match = regex.exec(content);
  }

  return annotations;
}

/**
 * Scan files matching a glob pattern for `@implements` annotations.
 *
 * @param pattern - Glob pattern (e.g. "src/**\/*.tsx")
 * @param cwd - Working directory for glob resolution
 */
export async function scanAnnotations(
  pattern: string,
  cwd: string,
): Promise<LedgerAnnotation[]> {
  const files = await glob(pattern, { cwd, absolute: true });
  files.sort();

  const annotations: LedgerAnnotation[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf-8");
    annotations.push(...scanContent(content, file));
  }

  return annotations;
}
