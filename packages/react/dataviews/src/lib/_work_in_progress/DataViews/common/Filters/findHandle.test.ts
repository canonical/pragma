import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import findHandle from "./findHandle.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
  { field: "cpu", kind: "number" },
]);

describe("findHandle", () => {
  it("reads the handle the provider holds at a field and operator", () => {
    const provider = createDataViewsProvider({ schema });
    expect(findHandle(provider, "status", "eq")).toBe(
      provider.fields.status.eq,
    );
    expect(findHandle(provider, "cpu", "lte")).toBe(provider.fields.cpu.lte);
  });

  it("reports a field or operator the provider holds no handle for", () => {
    const provider = createDataViewsProvider({ schema });
    expect(() => findHandle(provider, "zone", "eq")).toThrow(
      "the provider holds no handle for zone eq",
    );
    expect(() => findHandle(provider, "cpu", "eq")).toThrow(
      "the provider holds no handle for cpu eq",
    );
  });
});
