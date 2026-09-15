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
    expect(findFilterHandle(handles, "status", "isAny")).toBe(
      handles.status.isAny,
    );
    expect(findFilterHandle(handles, "cores", "lte")).toBe(handles.cores.lte);
    expect(findFilterHandle(handles, "cores", "gte")).not.toBe(
      handles.cores.lte,
    );
  });

  it("reports a field or operator the root holds no handle for", () => {
    const handles = rootHandles();
    expect(() => findFilterHandle(handles, "zone", "isAny")).toThrow(
      "the root holds no filter for zone isAny",
    );
    expect(() => findFilterHandle(handles, "cores", "isAny")).toThrow(
      "the root holds no filter for cores isAny",
    );
    // A text field is filtered by the text it contains, never by a set.
    expect(findFilterHandle(handles, "name", "contains")).toBe(
      handles.name.contains,
    );
    expect(() => findFilterHandle(handles, "name", "isAny")).toThrow(
      "the root holds no filter for name isAny",
    );
  });
});
