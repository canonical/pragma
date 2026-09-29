/**
 * The wire contract of list-valued parameters, derived from the registry.
 *
 * Two recorded failures are the reason this file exists. A weak model asked
 * for twenty tokens' variables with twenty `variable_list` calls, because over
 * MCP a filter took ONE value while the CLI took the flag repeated; a stronger
 * one passed `name: "color.text"` to `token_lookup` and was refused by schema
 * validation over a pair of brackets. So: every parameter that takes several
 * values ADVERTISES an array, and accepts one bare value as a list of one.
 *
 * Derived rather than listed — a story declared tomorrow is held to the rule
 * by the act of declaring it.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { buildToolShape } from "../kernel/project/mcp/registerVerb.js";
import { toolName } from "../kernel/spec/index.js";
import type { ParamSpec, VerbSpec } from "../kernel/spec/types.js";
import { type McpHarness, projectMcp } from "../testing/helpers/projectMcp.js";
import { capabilities } from "./index.js";

const exposed: readonly VerbSpec[] = capabilities
  .flatMap((module) => module.verbs)
  .filter((verb) => !verb.hidden && verb.capability.mcp.expose !== false);

/** Every `[tool, param]` pair whose param satisfies `test`. */
function paramsWhere(
  test: (param: ParamSpec) => boolean,
): (readonly [string, string, VerbSpec, ParamSpec])[] {
  return exposed.flatMap((verb) =>
    verb.params
      .filter(test)
      .map((param) => [toolName(verb.path), param.name, verb, param] as const),
  );
}

/** One admissible value for a param: its first enum value, else any word. */
const sample = (param: ParamSpec): string =>
  param.kind === "enum" ? (param.values.at(0) ?? "") : "anything";

/** Parse ONE field of a tool's input shape, leaving its other params aside. */
function parseField(verb: VerbSpec, param: ParamSpec, value: unknown) {
  const field = buildToolShape(verb)[param.name];
  if (!field) throw new Error(`no "${param.name}" in the tool shape`);
  return z.object({ [param.name]: field }).safeParse({ [param.name]: value });
}

const variadic = paramsWhere((param) => param.kind === "string[]");
const repeatable = paramsWhere(
  (param) => param.kind !== "string[]" && param.repeatable === true,
);

describe("a parameter that takes several values takes one, too", () => {
  it("the registry has both kinds (the derivation is not vacuous)", () => {
    expect(variadic.length).toBeGreaterThan(0);
    expect(repeatable.length).toBeGreaterThan(0);
  });

  it.each(variadic)(
    "%s { %s }: a bare string is a list of one",
    (_tool, name, verb, param) => {
      expect(parseField(verb, param, "color.text")).toEqual({
        success: true,
        data: { [name]: ["color.text"] },
      });
      expect(parseField(verb, param, ["a", "b"]).success).toBe(true);
    },
  );

  it.each(repeatable)(
    "%s { %s }: an array and a bare string are both accepted",
    (_tool, name, verb, param) => {
      const value = sample(param);
      expect(parseField(verb, param, [value, value]).success).toBe(true);
      expect(parseField(verb, param, value)).toEqual({
        success: true,
        data: { [name]: [value] },
      });
    },
  );
});

describe("what is advertised is a plain array", () => {
  let harness: McpHarness;
  let schemas: Map<string, Record<string, Record<string, unknown>>>;
  beforeAll(async () => {
    harness = await projectMcp(capabilities);
    schemas = new Map(
      (await harness.listTools()).map((tool) => [
        tool.name,
        ((tool.inputSchema as { properties?: unknown }).properties ??
          {}) as Record<string, Record<string, unknown>>,
      ]),
    );
  });
  afterAll(() => harness.cleanup());

  // `anyOf` is what a `string | string[]` union would emit, and it is the
  // shape the weaker models read badly — so the coercion must not leak into
  // the advertised schema.
  it.each([...variadic, ...repeatable])(
    "%s { %s } is `type: array`, never `anyOf`",
    (tool, name) => {
      const advertised = schemas.get(tool)?.[name];
      expect(advertised?.type).toBe("array");
      expect(advertised).not.toHaveProperty("anyOf");
    },
  );
});
