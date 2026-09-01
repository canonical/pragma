import { describe, expect, it } from "vitest";
import { formatIssues, runSchema } from "./schemaUtils.js";
import type { StandardSchemaResult, StandardSchemaV1 } from "./types.js";

function schema(
  validate: (
    value: unknown,
  ) => StandardSchemaResult<unknown> | Promise<StandardSchemaResult<unknown>>,
): StandardSchemaV1 {
  return { "~standard": { version: 1, vendor: "router-test", validate } };
}

describe("runSchema", () => {
  it("unwraps a Standard Schema success result", () => {
    const outcome = runSchema(
      schema(() => ({ value: { page: 2 } })),
      { page: "2" },
      "test",
    );

    expect(outcome).toEqual({ issues: null, value: { page: 2 } });
  });

  it("returns issues from a Standard Schema failure result", () => {
    const outcome = runSchema(
      schema(() => ({ issues: [{ message: "invalid" }] })),
      {},
      "test",
    );

    expect(outcome.issues).toEqual([{ message: "invalid" }]);
  });

  it("throws when a validator resolves asynchronously", () => {
    expect(() =>
      runSchema(
        schema(async () => ({ value: {} })),
        {},
        "Route '/users/:id' params",
      ),
    ).toThrow(
      "Route '/users/:id' params: async schema validation is not supported — the router matches synchronously.",
    );
  });

  it("throws when a validator returns neither value nor issues", () => {
    // A bare object: it passes the typeof-object guards inside both result
    // checks, so only the final throw can reject it.
    const nonConforming = schema(() => ({}) as StandardSchemaResult<unknown>);

    expect(() => runSchema(nonConforming, {}, "Route '/list' search")).toThrow(
      "Route '/list' search: schema validator returned neither { value } nor { issues } — not a Standard Schema v1 result.",
    );
  });
});

describe("formatIssues", () => {
  it("joins issue messages", () => {
    expect(
      formatIssues([
        { message: "a is required" },
        { message: "b must be a number" },
      ]),
    ).toBe("a is required, b must be a number");
  });
});
