import type { QueryResult } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import formatters from "./query.js";

const selectResult = {
  type: "select",
  bindings: [
    { s: "a", n: "1" },
    { s: "b", n: "2" },
  ],
} as unknown as QueryResult;

const emptySelect = {
  type: "select",
  bindings: [],
} as unknown as QueryResult;

const askResult = { type: "ask", result: true } as unknown as QueryResult;

const constructResult = {
  type: "construct",
  triples: [
    { subject: "s1", predicate: "p1", object: "line one\nline two" },
    { subject: "s2", predicate: "p2", object: "o2" },
  ],
} as unknown as QueryResult;

const emptyConstruct = {
  type: "construct",
  triples: [],
} as unknown as QueryResult;

describe("graph query formatters — plain", () => {
  it("renders SELECT as a tab table", () => {
    const text = formatters.plain(selectResult);
    expect(text.split("\n")).toEqual(["s\tn", "a\t1", "b\t2"]);
  });

  it("reports no results for an empty SELECT", () => {
    expect(formatters.plain(emptySelect)).toBe("No results.");
  });

  it("renders ASK as a boolean", () => {
    expect(formatters.plain(askResult)).toBe("ASK: true");
  });

  it("renders CONSTRUCT as one-line triples", () => {
    const text = formatters.plain(constructResult);
    expect(text).toContain("s1\tp1\tline one line two");
    expect(text).toContain("s2\tp2\to2");
  });

  it("reports no triples for an empty CONSTRUCT", () => {
    expect(formatters.plain(emptyConstruct)).toBe("No triples.");
  });
});

describe("graph query formatters — llm", () => {
  it("renders SELECT as a Markdown table", () => {
    const text = formatters.llm(selectResult);
    expect(text).toContain("| s | n |");
    expect(text).toContain("| --- | --- |");
    expect(text).toContain("| a | 1 |");
  });

  it("renders an empty SELECT as italic no-results", () => {
    expect(formatters.llm(emptySelect)).toBe("_No results._");
  });

  it("renders ASK as bold", () => {
    expect(formatters.llm(askResult)).toBe("**ASK** → true");
  });

  it("renders CONSTRUCT triples as a bullet list", () => {
    const text = formatters.llm(constructResult);
    expect(text).toContain("- s1\tp1\tline one line two");
  });
});

describe("graph query formatters — json", () => {
  it("serializes the raw result", () => {
    expect(JSON.parse(formatters.json(askResult))).toMatchObject({
      type: "ask",
      result: true,
    });
  });
});
