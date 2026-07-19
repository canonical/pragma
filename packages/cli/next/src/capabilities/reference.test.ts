import { readdirSync, readFileSync } from "node:fs";
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
});
