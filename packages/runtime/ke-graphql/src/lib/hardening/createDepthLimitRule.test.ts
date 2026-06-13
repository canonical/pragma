import { buildSchema, parse, validate } from "graphql";
import { describe, expect, it } from "vitest";
import createDepthLimitRule from "./createDepthLimitRule.js";

const schema = buildSchema(`
  type Query { node: Node }
  type Node { name: String, child: Node }
`);

const depthErrors = (query: string, maxDepth: number) =>
  validate(schema, parse(query), [createDepthLimitRule(maxDepth)]);

describe("createDepthLimitRule", () => {
  it("passes operations within the limit", () => {
    // node(1) name(2) => depth 2
    expect(depthErrors(`{ node { name } }`, 3)).toHaveLength(0);
  });

  it("rejects operations exceeding the limit", () => {
    // node(1) child(2) child(3) name(4) => depth 4
    const errors = depthErrors(`{ node { child { child { name } } } }`, 2);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toMatch(/maximum depth of 2/);
  });

  it("counts through inline fragments without adding a level", () => {
    // node(1) name(2) — the inline fragment is transparent => depth 2
    expect(depthErrors(`{ node { ... on Node { name } } }`, 2)).toHaveLength(0);
  });

  it("resolves named fragment spreads", () => {
    const query = `{ node { ...F } } fragment F on Node { child { child { name } } }`;
    // node(1) child(2) child(3) name(4) => depth 4 > 2
    expect(depthErrors(query, 2)).toHaveLength(1);
  });

  it("guards fragment cycles without infinite recursion", () => {
    const query = `{ node { ...F } } fragment F on Node { child { ...F } }`;
    expect(() => depthErrors(query, 50)).not.toThrow();
  });
});
