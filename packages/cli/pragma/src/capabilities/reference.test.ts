import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitReference } from "../kernel/spec/emitReference.js";
import { capabilities } from "./index.js";

/** Read a committed reference page exactly as a consumer (or lychee) would. */
function readCommitted(relPath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../docs/reference/${relPath}`, import.meta.url)),
    "utf-8",
  );
}

describe("reference docs drift-guard — emitReference == committed (PROTECTED)", () => {
  const emitted = emitReference(capabilities);

  it("every generated page is byte-identical to the committed file", () => {
    for (const [relPath, expected] of emitted) {
      expect(readCommitted(relPath)).toBe(expected);
    }
  });

  it("the committed file set matches the generated key set (no orphans, none missing)", () => {
    const committed = readdirSync(
      fileURLToPath(new URL("../../docs/reference/", import.meta.url)),
    )
      .filter((name) => name.endsWith(".md"))
      .sort();
    expect(committed).toEqual([...emitted.keys()].sort());
  });

  it("the create chapter points at the parity contract, and the link resolves", () => {
    const commands = readCommitted("commands.md");
    const start = commands.indexOf("\n## create\n");
    expect(start).toBeGreaterThan(-1);
    const chapter = commands.slice(start, commands.indexOf("\n### ", start));
    // Pragma's docs point, never copy — the pinned pointer.
    expect(chapter).toContain("summon/core/docs/parity-contract.md");
    // The relative target resolves from the page — what lychee --offline
    // checks on every PR.
    const link = chapter.match(/\]\(([^)]*parity-contract\.md)\)/)?.[1];
    expect(link).toBeDefined();
    expect(
      existsSync(
        fileURLToPath(new URL(`../../docs/reference/${link}`, import.meta.url)),
      ),
    ).toBe(true);
  });
});
