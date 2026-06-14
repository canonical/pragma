import type { QueryResult, Term } from "@canonical/ke";
import { describe, expect, it, vi } from "vitest";
import {
  type ClassNode,
  type MappedIR,
  type NamespaceInfo,
  type QueryFn,
  RDFS_LABEL,
} from "#shared";
import createListLoader from "./createListLoader.js";

const NS = "https://ds.canonical.com/";

const namespaces = new Map<string, NamespaceInfo>([
  ["ds", { prefix: "ds", uri: NS, classCount: 0, propertyCount: 0 }],
]);

const named = (value: string): Term => ({ termType: "NamedNode", value });
const literal = (value: string): Term => ({ termType: "Literal", value });

const mappedFor = (classes: Map<string, ClassNode>): MappedIR =>
  ({ ir: { classes }, namespaces }) as unknown as MappedIR;

const classWith = (uri: string, allProperties: string[]): ClassNode =>
  ({ uri, allProperties }) as unknown as ClassNode;

const select = (termBindings: Record<string, Term>[]): QueryResult =>
  ({
    type: "select",
    variables: [],
    bindings: [],
    termBindings,
  }) as QueryResult;

const ask = (): QueryResult => ({ type: "ask", result: true }) as QueryResult;

describe("createListLoader", () => {
  it("falls back to rdfs:label when the class has no local-name 'name' property", async () => {
    // Class with a property whose local name is NOT "name" → RDFS_LABEL.
    const classes = new Map([
      [`${NS}Widget`, classWith(`${NS}Widget`, [`${NS}title`])],
    ]);
    const query: QueryFn = vi.fn(async (q: string) => {
      // The paired VALUES must carry the rdfs:label name predicate.
      expect(q).toContain(`<${RDFS_LABEL}>`);
      return select([
        { class: named(`${NS}Widget`), instance: named(`${NS}a`) },
      ]);
    });
    const loader = createListLoader(query, mappedFor(classes));
    expect(await loader.load(`${NS}Widget`)).toEqual([`${NS}a`]);
  });

  it("uses the class's own local-name 'name' property as the name predicate", async () => {
    // A declared property whose local name is "name" wins over rdfs:label.
    const classes = new Map([
      [`${NS}Widget`, classWith(`${NS}Widget`, [`${NS}title`, `${NS}name`])],
    ]);
    const query: QueryFn = vi.fn(async (q: string) => {
      expect(q).toContain(`<${NS}name>`);
      return select([
        { class: named(`${NS}Widget`), instance: named(`${NS}a`) },
      ]);
    });
    const loader = createListLoader(query, mappedFor(classes));
    expect(await loader.load(`${NS}Widget`)).toEqual([`${NS}a`]);
  });

  it("evicts the keys of a failed batch and rethrows", async () => {
    let calls = 0;
    const query: QueryFn = vi.fn(async () => {
      calls += 1;
      throw new Error("store down");
    });
    const loader = createListLoader(query, mappedFor(new Map()), new Map());

    await expect(loader.load(`${NS}Widget`)).rejects.toThrow("store down");
    await expect(loader.load(`${NS}Widget`)).rejects.toThrow("store down");
    expect(calls).toBe(2);
  });

  it("skips a binding whose class/instance is not a NamedNode (each operand)", async () => {
    const query: QueryFn = async () =>
      select([
        { class: named(`${NS}Widget`), instance: named(`${NS}a`) },
        // class is a Literal → first operand of the || fails.
        { class: literal("nope"), instance: named(`${NS}b`) },
        // instance is a Literal → second operand fails.
        { class: named(`${NS}Widget`), instance: literal("nope") },
      ]);
    // No class node registered → resolveNamePredicate takes the `if (node)`
    // false path and falls back to rdfs:label as well.
    const loader = createListLoader(query, mappedFor(new Map()));
    expect(await loader.load(`${NS}Widget`)).toEqual([`${NS}a`]);
  });

  it("returns an empty list for non-select results and unknown classes", async () => {
    const query: QueryFn = async () => ask();
    const loader = createListLoader(query, mappedFor(new Map()));
    expect(await loader.load(`${NS}Widget`)).toEqual([]);
  });

  it("dedupes rows duplicated by a multi-valued name", async () => {
    const query: QueryFn = async () =>
      select([
        // Same (class, instance) repeated by two name values → second skipped.
        {
          class: named(`${NS}Widget`),
          instance: named(`${NS}a`),
          name: literal("Alpha"),
        },
        {
          class: named(`${NS}Widget`),
          instance: named(`${NS}a`),
          name: literal("Alias"),
        },
        {
          class: named(`${NS}Widget`),
          instance: named(`${NS}b`),
          name: literal("Beta"),
        },
      ]);
    const loader = createListLoader(query, mappedFor(new Map()));
    expect(await loader.load(`${NS}Widget`)).toEqual([`${NS}a`, `${NS}b`]);
  });
});
