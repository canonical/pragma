/**
 * Regression: a location refusing a destination's subscription leaves
 * nothing subscribed.
 *
 * Before the fix, a destination subscribed to the open view and then to the
 * location. A location whose subscription threw left the view subscription
 * behind, holding its listener for as long as the provider lived.
 */

import {
  createMemoryLocation,
  type QueryLocation,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { describe, expect, it, vi } from "vitest";
import { createMachineProvider } from "../../../testing/machines.js";
import { subscribeToDestinationInputs } from "../../lib/utils/index.js";

describe("regression 0027 — a destination subscription leaked on a failing location", () => {
  it("releases the view when the location refuses the subscription", () => {
    const memory = createMemoryLocation({ href: "/machines" });
    const location: QueryLocation = {
      ...memory,
      subscribe() {
        throw new Error("location unavailable");
      },
    };
    const { provider } = createMachineProvider({ location });
    const host = readProviderHost(provider);
    const { slice, window } = provider.state.get();
    const listener = vi.fn();
    expect(() => subscribeToDestinationInputs(host, listener)).toThrow(
      "location unavailable",
    );
    host.adopt({ slice, window }, "view", "v1");
    expect(listener).not.toHaveBeenCalled();
  });
});
