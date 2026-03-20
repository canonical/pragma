import { collectEffects, dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import setupLsp from "./setupLsp.js";

const mockExists =
  (predicate: (path: string) => boolean) =>
  (effect: Effect): unknown =>
    predicate((effect as Effect & { _tag: "Exists" }).path);

const mockReadFile =
  (content: string) =>
  (_effect: Effect): unknown =>
    content;

function mocks(
  existsPredicate: (path: string) => boolean,
  fileContent?: string,
): Map<string, (effect: Effect) => unknown> {
  const m = new Map<string, (effect: Effect) => unknown>([
    ["Exists", mockExists(existsPredicate)],
  ]);
  if (fileContent !== undefined) {
    m.set("ReadFile", mockReadFile(fileContent));
  }
  return m;
}

describe("setupLsp", () => {
  it("warns when .vscode/ directory is absent", () => {
    const result = dryRunWith(
      setupLsp("/project"),
      mocks(() => false),
    );
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes(".vscode/"))).toBe(true);
  });

  it("does not write when .vscode/ is absent", () => {
    const result = dryRunWith(
      setupLsp("/project"),
      mocks(() => false),
    );
    const writes = result.effects.filter((e) => e._tag === "WriteFile");
    expect(writes).toHaveLength(0);
  });

  it("warns when tokens.config.mjs is missing", () => {
    const result = dryRunWith(
      setupLsp("/project"),
      mocks(
        (p) =>
          p === "/project/.vscode" || p === "/project/.vscode/settings.json",
        "{}",
      ),
    );
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("tokens.config.mjs"))).toBe(
      true,
    );
  });

  it("merges into existing settings.json", () => {
    const existing = JSON.stringify({ "editor.fontSize": 14 });
    const result = dryRunWith(
      setupLsp("/project"),
      mocks((p) => p !== "/project/tokens.config.mjs", existing),
    );

    const writes = result.effects.filter(
      (e) => e._tag === "WriteFile",
    ) as (Effect & { _tag: "WriteFile" })[];
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe("/project/.vscode/settings.json");

    const written = JSON.parse(writes[0].content);
    expect(written["editor.fontSize"]).toBe(14);
    expect(written["terrazzo-lsp.configPath"]).toBe("./tokens.config.mjs");
  });

  it("creates new settings.json when none exists", () => {
    const result = dryRunWith(
      setupLsp("/project"),
      mocks(
        (p) => p === "/project/.vscode" || p === "/project/tokens.config.mjs",
      ),
    );

    const writes = result.effects.filter(
      (e) => e._tag === "WriteFile",
    ) as (Effect & { _tag: "WriteFile" })[];
    expect(writes).toHaveLength(1);

    const written = JSON.parse(writes[0].content);
    expect(written["terrazzo-lsp.configPath"]).toBe("./tokens.config.mjs");
    // Should not have old settings since file didn't exist
    expect(Object.keys(written)).toContain("terrazzo-lsp.configPath");
    expect(Object.keys(written)).toContain("terrazzo-lsp.tokenSources");
  });

  it("produces exists effects", () => {
    const effects = collectEffects(setupLsp("/project"));
    const existsEffects = effects.filter((e) => e._tag === "Exists");
    expect(existsEffects.length).toBeGreaterThan(0);
  });

  it("logs success message on complete", () => {
    const result = dryRunWith(
      setupLsp("/project"),
      mocks((p) => p !== "/project/tokens.config.mjs"),
    );
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("✓ LSP configured"))).toBe(true);
  });
});
