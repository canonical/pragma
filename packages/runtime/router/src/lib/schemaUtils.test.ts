import { describe, expect, it } from "vitest";
import { formatIssues, runSchema } from "./schemaUtils.js";

describe("runSchema", () => {
  it("passes the input through when the schema has no validator", () => {
    const outcome = runSchema(
      { "~standard": { output: {} as { q?: string } } },
      { q: "router" },
      "test",
    );

    expect(outcome).toEqual({ issues: null, value: { q: "router" } });
  });

  it("unwraps a Standard Schema success result", () => {
    const outcome = runSchema(
      {
        "~standard": {
          version: 1,
          vendor: "test",
          validate: () => ({ value: { page: 2 } }),
        },
      },
      { page: "2" },
      "test",
    );

    expect(outcome).toEqual({ issues: null, value: { page: 2 } });
  });

  it("returns issues from a Standard Schema failure result", () => {
    const outcome = runSchema(
      {
        "~standard": {
          version: 1,
          vendor: "test",
          validate: () => ({ issues: [{ message: "invalid" }] }),
        },
      },
      {},
      "test",
    );

    expect(outcome.issues).toEqual([{ message: "invalid" }]);
  });

  it("passes through a legacy validator's plain return value", () => {
    const outcome = runSchema(
      {
        "~standard": {
          output: {} as { auth?: string },
          validate: (value: unknown) => ({
            auth: (value as { auth?: string }).auth,
          }),
        },
      },
      { auth: "1" },
      "test",
    );

    expect(outcome).toEqual({ issues: null, value: { auth: "1" } });
  });

  it("throws when a validator resolves asynchronously", () => {
    expect(() =>
      runSchema(
        {
          "~standard": {
            version: 1,
            vendor: "test",
            validate: async () => ({ value: {} }),
          },
        },
        {},
        "Route '/users/:id' params",
      ),
    ).toThrow(
      "Route '/users/:id' params: async schema validation is not supported — the router matches synchronously.",
    );
  });
});

describe("formatIssues", () => {
  it("joins issue messages and falls back to a default", () => {
    expect(
      formatIssues([
        { message: "a is required" },
        {} as { message: string },
        { message: "b must be a number" },
      ]),
    ).toBe("a is required, Validation error, b must be a number");
  });
});
