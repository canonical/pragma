import {
  createFilterInputs,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../../../../testing/machines.js";
import findFilterHandle from "./findFilterHandle.js";

/** The filter records one root would build over the machine provider. */
const rootHandles = () => {
  const { provider } = createMachineProvider();
  return createFilterInputs({ host: readProviderHost(provider) }).handles;
};

describe("findFilterHandle", () => {
  it("reads the handle the root holds at a field and operator", () => {
    const handles = rootHandles();
    expect(findFilterHandle(handles, "status", "eq")).toBe(handles.status.eq);
    expect(findFilterHandle(handles, "cores", "lte")).toBe(handles.cores.lte);
    expect(findFilterHandle(handles, "cores", "gte")).not.toBe(
      handles.cores.lte,
    );
  });

  it("reports a field or operator the root holds no handle for", () => {
    const handles = rootHandles();
    expect(() => findFilterHandle(handles, "zone", "eq")).toThrow(
      "the root holds no filter for zone eq",
    );
    expect(() => findFilterHandle(handles, "cores", "eq")).toThrow(
      "the root holds no filter for cores eq",
    );
    // A text field has no operator, so it has no handle to find.
    expect(() => findFilterHandle(handles, "name", "eq")).toThrow(
      "the root holds no filter for name eq",
    );
  });
});
