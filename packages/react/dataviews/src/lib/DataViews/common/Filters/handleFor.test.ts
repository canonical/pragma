import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import handleFor from "./handleFor.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
  { field: "cpu", kind: "number" },
]);

describe("handleFor", () => {
  it("reads the handle the provider holds at a field and operator", () => {
    const provider = createDataViewsProvider({ schema });
    expect(handleFor(provider, "status", "eq")).toBe(provider.fields.status.eq);
    expect(handleFor(provider, "cpu", "lte")).toBe(provider.fields.cpu.lte);
  });

  it("reports a field or operator the provider holds no handle for", () => {
    const provider = createDataViewsProvider({ schema });
    expect(() => handleFor(provider, "zone", "eq")).toThrow(
      "the provider holds no handle for zone eq",
    );
    expect(() => handleFor(provider, "cpu", "eq")).toThrow(
      "the provider holds no handle for cpu eq",
    );
  });
});
