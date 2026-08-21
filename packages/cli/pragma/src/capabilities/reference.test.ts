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

  it("the create chapter prints the REGISTERED grammar — segments and --no- forms, never rejected spellings", () => {
    const commands = readCommitted("commands.md");
    const start = commands.indexOf("\n## create\n");
    expect(start).toBeGreaterThan(-1);
    const end = commands.indexOf("\n## ", start + 1);
    const chapter = commands.slice(start, end === -1 ? undefined : end);
    // The single-leaf application binding's synopsis carries its required
    // tree segment and the registered positional token — copying it must not
    // exit 2 with the operand parsed as an unknown subcommand.
    expect(chapter).toContain(
      "pragma create application react [app-path] [options]",
    );
    expect(chapter).toContain(
      "pragma create component <framework> [component-path] [options]",
    );
    // The Arguments tables print the SAME registered token their synopses
    // carry — never the binding-level camelCase name (that spelling belongs
    // to the MCP schemas in tools.md).
    expect(chapter).toContain("| `[app-path]` |");
    expect(chapter).toContain("| `[component-path]` |");
    expect(chapter).not.toContain("`[appPath]`");
    expect(chapter).not.toContain("`[componentPath]`");
    // Default-true confirms document ONLY the spelling the mount registers…
    for (const token of [
      "| `--no-with-styles` |",
      "| `--no-with-stories` |",
      "| `--no-with-ssr-tests` |",
      "| `--no-ssr` |",
      "| `--no-router` |",
      "| `--no-forms` |",
      "| `--no-run-install` |",
    ]) {
      expect(chapter).toContain(token);
    }
    // …the rejected positive tokens appear in no flag cell…
    for (const token of [
      "| `--with-styles` |",
      "| `--with-stories` |",
      "| `--with-ssr-tests` |",
      "| `--ssr` |",
      "| `--router` |",
      "| `--forms` |",
      "| `--run-install` |",
    ]) {
      expect(chapter).not.toContain(token);
    }
    // …and default-false confirms keep their registered positive form.
    expect(chapter).toContain("| `--relay` |");
    expect(chapter).toContain("| `--use-ts-stories` |");
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
