import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { describeTool, useWhenSentence, verbCategory } from "./guidance.js";
import type { VerbSpec } from "./types.js";

const find = (path: string): VerbSpec =>
  capabilities
    .flatMap((module) => module.verbs)
    .find((verb) => verb.path.join(" ") === path) as VerbSpec;

describe("the one generator of tool guidance", () => {
  it("leads with the question, adds authored prose, ends with the example", () => {
    const lookup = find("token lookup");
    const description = describeTool(lookup);
    expect(description.startsWith(`Use ${lookup.useWhen}.`)).toBe(true);
    expect(description).toContain(lookup.doc);
    expect(
      description.endsWith('Example: token_lookup { name: ["color.text"] }.'),
    ).toBe(true);
  });

  it("does not repeat the one-line summary after the question, and shows no example for a verb callable bare", () => {
    const list = find("skill list");
    expect(list.doc).toBeUndefined();
    expect(describeTool(list)).toBe(useWhenSentence(list));
  });

  it("falls back to doc or summary for a verb declaring no question (a third-party story may)", () => {
    const { useWhen: _useWhen, doc: _doc, ...bare } = find("skill list");
    expect(describeTool(bare as VerbSpec)).toBe(bare.summary);
    expect(useWhenSentence(bare as VerbSpec)).toBeUndefined();
  });

  it("does not add a second example to a description that still hand-types one", () => {
    const legacy = {
      ...find("token lookup"),
      doc: 'Get a token. Example: token_lookup { name: ["x"] }.',
    } as VerbSpec;
    expect(describeTool(legacy).match(/Example:/g)).toHaveLength(1);
  });

  it("derives write from mutates, and reads the rest off the verb", () => {
    expect(verbCategory(find("sources update"))).toBe("write");
    expect(verbCategory(find("doctor"))).toBe("diagnostic");
    expect(verbCategory(find("block list"))).toBe("read");
  });
});
