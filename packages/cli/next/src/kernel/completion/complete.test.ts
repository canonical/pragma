import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { buildCompletionModel, complete, runComplete } from "./complete.js";
import { emitScripts } from "./emitScripts.js";

const model = buildCompletionModel(capabilities);

/** A no-op verb at an arbitrary path, for completion-shape fixtures. */
function stubVerb(path: [string, string?]): VerbSpec {
  return {
    path,
    summary: `${path.filter(Boolean).join(" ")} summary`,
    params: [],
    output: {
      formatters: {
        plain: () => "",
        llm: () => "",
        json: () => "{}",
      },
    },
    capability: { needsStore: false, mutates: true, mcp: { expose: true } },
    run: () => ({ _tag: "Pure", value: null }) as never,
  };
}

describe("buildCompletionModel", () => {
  it("collects live nouns (incl. mcp) and per-noun verbs, hiding internals", () => {
    expect(model.nouns).toContain("info");
    expect(model.nouns).toContain("config");
    expect(model.nouns).toContain("mcp");
    expect(model.nouns).not.toContain("__complete");
    expect(model.verbs.config).toEqual(["show"]);
  });
});

describe("buildCompletionModel — mixed self+sub noun (setup shape)", () => {
  // `setup` is the one covenant noun that is BOTH directly runnable and has
  // sub-verbs; the model must still offer the sub-verbs at `setup <TAB>`. Tested
  // against a fixture module (the real `setup` module registers in a later PR6
  // commit) so the shape is pinned independently of registration order.
  const mixed: CapabilityModule = {
    name: "kitish",
    verbs: [
      stubVerb(["kit"]),
      stubVerb(["kit", "mcp"]),
      stubVerb(["kit", "completions"]),
      stubVerb(["kit", "skills"]),
      stubVerb(["kit", "lsp"]),
    ],
  };
  const mixedModel = buildCompletionModel([mixed]);

  it("lists the noun and offers exactly its sub-verbs (as a set)", () => {
    expect(mixedModel.nouns).toContain("kit");
    expect([...complete(["kit", ""], mixedModel)].sort()).toEqual([
      "completions",
      "lsp",
      "mcp",
      "skills",
    ]);
  });

  it("filters the sub-verbs by the current partial", () => {
    expect(complete(["kit", "sk"], mixedModel)).toEqual(["skills"]);
  });
});

describe("complete — storeless static matches", () => {
  it('completes a noun prefix ("co" -> "config")', () => {
    expect(complete(["co"], model)).toEqual(["config"]);
  });

  it("completes a verb under a known noun", () => {
    expect(complete(["config", ""], model)).toEqual(["show"]);
    expect(complete(["config", "sh"], model)).toEqual(["show"]);
  });

  it("completes global flags for a dash prefix", () => {
    expect(complete(["--"], model)).toContain("--format");
    expect(complete(["--l"], model)).toEqual(["--llm"]);
  });

  it("runComplete resolves against the capabilities directly", () => {
    expect(runComplete(["co"], capabilities)).toEqual(["config"]);
  });
});

describe("emitScripts — static tier", () => {
  const scripts = emitScripts(capabilities);

  it.each([
    "bash",
    "zsh",
    "fish",
  ] as const)("inlines nouns, verbs, and the llm flag in %s", (shell) => {
    const script = scripts[shell];
    expect(script).toContain("info");
    expect(script).toContain("config");
    expect(script).toContain("show");
    // fish declares long options as `-l "llm"`; bash/zsh inline `--llm`.
    expect(script).toContain("llm");
  });

  it("inlines global flags with the -- prefix for bash and zsh", () => {
    expect(scripts.bash).toContain("--llm");
    expect(scripts.zsh).toContain("--llm");
  });
});
