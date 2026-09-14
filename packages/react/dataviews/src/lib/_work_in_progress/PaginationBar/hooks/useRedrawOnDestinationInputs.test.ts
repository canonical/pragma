import { createMemoryLocation } from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../../../testing/machines.js";
import useRedrawOnDestinationInputs from "./useRedrawOnDestinationInputs.js";

describe("useRedrawOnDestinationInputs", () => {
  it("redraws when the open view or the location moves, and not for a notification that moves neither", () => {
    const location = createMemoryLocation({ href: "/machines" });
    const { provider } = createMachineProvider({ location });
    let renders = 0;
    renderHook(() => {
      renders += 1;
      useRedrawOnDestinationInputs({ provider });
    });
    const drawn = renders;
    const host = readProviderHost(provider);
    const { slice, window } = provider.state.get();
    act(() => {
      host.adopt({ slice, window }, "view", "v1");
    });
    expect(renders).toBe(drawn + 1);
    act(() => {
      location.write(new URLSearchParams("tab=history"));
    });
    expect(renders).toBe(drawn + 2);
    act(() => {
      location.write(new URLSearchParams("tab=history"));
    });
    expect(renders).toBe(drawn + 2);
  });

  it("redraws for the open view alone without a location", () => {
    const { provider } = createMachineProvider();
    let renders = 0;
    renderHook(() => {
      renders += 1;
      useRedrawOnDestinationInputs({ provider });
    });
    const drawn = renders;
    const { slice, window } = provider.state.get();
    act(() => {
      readProviderHost(provider).adopt({ slice, window }, "view", "v1");
    });
    expect(renders).toBe(drawn + 1);
  });
});
