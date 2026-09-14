import { createMemoryLocation } from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { describe, expect, it, vi } from "vitest";
import { createMachineProvider } from "../../../testing/machines.js";
import subscribeToDestinationInputs from "./subscribeToDestinationInputs.js";

describe("subscribeToDestinationInputs", () => {
  it("hears the open view and the location, and neither once released", () => {
    const location = createMemoryLocation({ href: "/machines" });
    const { provider } = createMachineProvider({ location });
    const host = readProviderHost(provider);
    const { slice, window } = provider.state.get();
    const listener = vi.fn();
    const release = subscribeToDestinationInputs(host, listener);
    host.adopt({ slice, window }, "view", "v1");
    location.write(new URLSearchParams("tab=inventory"));
    expect(listener).toHaveBeenCalledTimes(2);
    release();
    host.adopt({ slice, window }, "revert", null);
    location.write(new URLSearchParams("tab=history"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("hears the open view alone without a location", () => {
    const { provider } = createMachineProvider();
    const host = readProviderHost(provider);
    const { slice, window } = provider.state.get();
    const listener = vi.fn();
    const release = subscribeToDestinationInputs(host, listener);
    host.adopt({ slice, window }, "view", "v1");
    expect(listener).toHaveBeenCalledTimes(1);
    release();
    host.adopt({ slice, window }, "revert", null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
