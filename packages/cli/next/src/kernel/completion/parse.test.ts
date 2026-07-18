import { describe, expect, it } from "vitest";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import { buildCompletionModel } from "./model.js";
import { parseWords } from "./parse.js";
import type { CompletionContext } from "./types.js";

const model = buildCompletionModel([completionFixture]);

/** Parse against the fixture model. */
function parse(words: readonly string[]) {
  return parseWords(words, model);
}

/** The flag names offered by a flag-name context (fails on other kinds). */
function flagsOf(context: CompletionContext): readonly string[] {
  if (context.kind !== "flag-name")
    throw new Error(`not flag-name: ${context.kind}`);
  return context.flags;
}

describe("parseWords — nouns and verbs (PROTECTED)", () => {
  it("classifies empty words as a noun context with an empty partial", () => {
    expect(parse([])).toEqual({ context: { kind: "noun" }, partial: "" });
    expect(parse([""])).toEqual({ context: { kind: "noun" }, partial: "" });
  });

  it("classifies the first word as a noun partial", () => {
    expect(parse(["blo"])).toEqual({
      context: { kind: "noun" },
      partial: "blo",
    });
  });

  it("strips a leading bin name", () => {
    expect(parse(["pragma2", "blo"])).toEqual({
      context: { kind: "noun" },
      partial: "blo",
    });
    expect(parseWords(["pragma9", "blo"], model, "pragma9").partial).toBe(
      "blo",
    );
  });

  it("classifies the second word under a sub-verb noun as a verb context", () => {
    expect(parse(["block", ""])).toEqual({
      context: { kind: "verb", noun: "block" },
      partial: "",
    });
    expect(parse(["block", "ge"]).partial).toBe("ge");
  });

  it("terminates on an unknown noun (non-flag contexts only)", () => {
    expect(parse(["bogus", ""]).context).toEqual({
      kind: "nothing",
      reason: "unknown noun",
    });
    // A later legitimate noun must not rescue the position.
    expect(parse(["bogus", "block", ""]).context).toEqual({
      kind: "nothing",
      reason: "unknown noun",
    });
  });

  it("terminates on an unknown verb under a sub-verb-only noun", () => {
    expect(parse(["block", "zap", ""]).context).toEqual({
      kind: "nothing",
      reason: "unknown verb",
    });
  });

  it("global flags and their values do not disturb noun/verb position", () => {
    expect(parse(["--format", "json", "blo"])).toEqual({
      context: { kind: "noun" },
      partial: "blo",
    });
    expect(parse(["--llm", "block", ""]).context).toEqual({
      kind: "verb",
      noun: "block",
    });
  });
});

describe("parseWords — flag names (PROTECTED)", () => {
  it("offers only globals (with --version) at the root", () => {
    expect(flagsOf(parse(["--"]).context)).toEqual([
      "--llm",
      "--format",
      "--verbose",
      "--detail",
      "--help",
      "--version",
    ]);
  });

  it("drops --version once a noun is chosen", () => {
    const flags = flagsOf(parse(["block", "-"]).context);
    expect(flags).not.toContain("--version");
    expect(flags).toContain("--help");
  });

  it("offers verb flags plus globals once the verb is resolved", () => {
    const flags = flagsOf(parse(["block", "get", "--"]).context);
    expect(flags).toEqual([
      "--view",
      "--out",
      "--with-meta",
      "--note",
      "--llm",
      "--format",
      "--verbose",
      "--detail",
      "--help",
    ]);
  });

  it("offers mutation flags iff the verb mutates", () => {
    const mutating = flagsOf(parse(["block", "remove", "--"]).context);
    expect(mutating).toEqual(
      expect.arrayContaining(["--dry-run", "--undo", "--yes"]),
    );
    const read = flagsOf(parse(["block", "get", "--"]).context);
    expect(read).not.toContain("--dry-run");
  });

  it("de-offers a used non-repeatable flag but keeps repeatable ones", () => {
    const flags = flagsOf(
      parse(["block", "get", "--view", "full", "--"]).context,
    );
    expect(flags).not.toContain("--view");
    expect(flags).toContain("--out");

    const repeatable = flagsOf(
      parse(["block", "list", "--tags", "a", "--"]).context,
    );
    expect(repeatable).toContain("--tags");
  });

  it("de-offers a flag used in its inline = form", () => {
    const flags = flagsOf(parse(["block", "get", "--view=full", "--"]).context);
    expect(flags).not.toContain("--view");
  });

  it("offers self-verb flags right after a self-verb-only noun", () => {
    const flags = flagsOf(parse(["status", "-"]).context);
    expect(flags).toContain("--help");
    expect(flags).not.toContain("--version");
  });

  it("still offers globals under an unknown noun", () => {
    expect(flagsOf(parse(["bogus", "--f"]).context)).toContain("--format");
  });
});

describe("parseWords — flag values (PROTECTED)", () => {
  it("classifies the space form (--flag <partial>)", () => {
    expect(parse(["block", "get", "--view", ""])).toEqual({
      context: {
        kind: "flag-value",
        flag: "--view",
        source: { kind: "values", values: ["anatomy", "full", "summary"] },
      },
      partial: "",
    });
    expect(parse(["block", "get", "--view", "fu"]).partial).toBe("fu");
  });

  it("classifies the inline = form (--flag=partial)", () => {
    const request = parse(["block", "get", "--view=fu"]);
    expect(request.context).toMatchObject({
      kind: "flag-value",
      flag: "--view",
    });
    expect(request.partial).toBe("fu");
  });

  it("classifies the bash wordbreak split triple (--flag, =, partial)", () => {
    expect(parse(["block", "get", "--view", "=", "fu"])).toMatchObject({
      context: { kind: "flag-value", flag: "--view" },
      partial: "fu",
    });
  });

  it("classifies the valueless = (--flag, =) as an empty partial", () => {
    expect(parse(["block", "get", "--view", "="])).toMatchObject({
      context: { kind: "flag-value", flag: "--view" },
      partial: "",
    });
  });

  it("classifies global value flags anywhere", () => {
    expect(parse(["--format", ""])).toMatchObject({
      context: {
        kind: "flag-value",
        flag: "--format",
        source: { kind: "values", values: ["plain", "json"] },
      },
    });
    expect(parse(["block", "get", "--detail", "s"])).toMatchObject({
      context: { kind: "flag-value", flag: "--detail" },
      partial: "s",
    });
  });

  it("a pending value flag wins even for a dash partial", () => {
    expect(parse(["block", "get", "--view", "-"])).toMatchObject({
      context: { kind: "flag-value", flag: "--view" },
      partial: "-",
    });
  });

  it("boolean flags never open a value context", () => {
    expect(parse(["block", "get", "--with-meta", ""]).context).toMatchObject({
      kind: "positional",
      name: "ref",
    });
  });

  it("an unknown --flag= completes nothing useful (falls to flag-name)", () => {
    expect(parse(["block", "get", "--nope=x"]).context.kind).toBe("flag-name");
  });
});

describe("parseWords — positionals (PROTECTED)", () => {
  it("classifies the first positional with its source", () => {
    expect(parse(["block", "get", ""])).toEqual({
      context: {
        kind: "positional",
        name: "ref",
        source: { kind: "entity", type: "ds:Block" },
      },
      partial: "",
    });
  });

  it("keeps the positional index across interleaved flags and values", () => {
    expect(parse(["block", "get", "--view", "full", "bu"])).toMatchObject({
      context: { kind: "positional", name: "ref" },
      partial: "bu",
    });
    expect(
      parse(["block", "get", "--with-meta", "--view=full", "bu"]),
    ).toMatchObject({
      context: { kind: "positional", name: "ref" },
    });
  });

  it("reports exhausted positionals past the last non-variadic slot", () => {
    expect(parse(["block", "get", "button", ""]).context).toEqual({
      kind: "nothing",
      reason: "positionals exhausted",
    });
    expect(parse(["status", "all", ""]).context).toEqual({
      kind: "nothing",
      reason: "positionals exhausted",
    });
  });

  it("a trailing variadic absorbs every further index", () => {
    expect(parse(["block", "diff", "a", "b", "c", ""]).context).toEqual({
      kind: "positional",
      name: "refs",
      source: { kind: "entity", type: "ds:Block" },
    });
  });

  it("a bare -- ends options: later dash words are positionals", () => {
    expect(parse(["block", "get", "--", "-weird"])).toEqual({
      context: {
        kind: "positional",
        name: "ref",
        source: { kind: "entity", type: "ds:Block" },
      },
      partial: "-weird",
    });
    expect(parse(["block", "get", "--", "x", ""]).context).toEqual({
      kind: "nothing",
      reason: "positionals exhausted",
    });
  });

  it("an unknown flag is skipped silently; its argument counts as positional", () => {
    expect(parse(["block", "get", "--nope", "x", ""]).context).toEqual({
      kind: "nothing",
      reason: "positionals exhausted",
    });
  });
});

describe("parseWords — self-verb nouns (PROTECTED)", () => {
  it("a self-verb-only noun goes straight to its positionals", () => {
    expect(parse(["status", ""])).toEqual({
      context: {
        kind: "positional",
        name: "scope",
        source: { kind: "values", values: ["all", "dirty"] },
      },
      partial: "",
    });
  });

  it("a mixed noun offers its sub-verbs first", () => {
    expect(parse(["standard", ""]).context).toEqual({
      kind: "verb",
      noun: "standard",
    });
  });

  it("a non-verb word under a mixed noun becomes the self-verb's positional", () => {
    // "acc" is not a sub-verb of standard → self-verb positional 0 consumed;
    // the current word is positional index 1 → exhausted (one positional).
    expect(parse(["standard", "acc", ""]).context).toEqual({
      kind: "nothing",
      reason: "positionals exhausted",
    });
  });

  it("the injected mcp noun completes but offers nothing after", () => {
    expect(parse(["mcp", ""]).context).toEqual({
      kind: "nothing",
      reason: "positionals exhausted",
    });
  });
});
