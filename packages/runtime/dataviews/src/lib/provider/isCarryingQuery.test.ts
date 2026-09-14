import { describe, expect, it } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import isCarryingQuery from "./isCarryingQuery.js";

const { schema } = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

const carries = (search: string, keepsViews = true): boolean =>
  isCarryingQuery({ params: new URLSearchParams(search), schema, keepsViews });

describe("isCarryingQuery", () => {
  it("reads a field, an operator on one, a written key or the open view as a query", () => {
    expect(carries("status=failed")).toBe(true);
    expect(carries("status__isSet=1")).toBe(true);
    expect(carries("page=2")).toBe(true);
    expect(carries("view=v1")).toBe(true);
  });

  it("reads the host's own parameters, and none, as no query", () => {
    expect(carries("")).toBe(false);
    expect(carries("tab=inventory&owner__isSet=1&as=table")).toBe(false);
  });

  it("reads an open view as no query where the provider keeps no views", () => {
    expect(carries("view=v1", false)).toBe(false);
    expect(carries("view=v1&status=failed", false)).toBe(true);
  });
});
