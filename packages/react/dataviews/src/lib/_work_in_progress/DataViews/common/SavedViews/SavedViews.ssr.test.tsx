/**
 * Views live in the browser's storage, which a server cannot read: the
 * server renders the control as unavailable without JavaScript, and reads
 * nothing from the store.
 */

import type { PresentationStore, ViewStore } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  createStandInPresentationStore,
  createStandInViewStore,
} from "../../../../../../testing/createStandInStores.js";
import { createMachineProvider } from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import SavedViews from "./SavedViews.js";

describe("DataViews.SavedViews SSR", () => {
  it("renders only the no-script notice, and never reads the store", () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const list = vi.fn<ViewStore["list"]>();
    const subscribe = vi.fn<ViewStore["subscribe"]>();
    const readPresentation = vi.fn<PresentationStore["readPresentation"]>();
    const heard = vi.fn<PresentationStore["subscribe"]>();
    const { provider, source } = createMachineProvider({
      views: createStandInViewStore({ list, subscribe }),
      presentation: createStandInPresentationStore({
        readPresentation,
        subscribe: heard,
      }),
    });
    const html = renderToString(
      <DataViews provider={provider}>
        <SavedViews />
      </DataViews>,
    );
    expect(html).toBe(
      '<div role="group" aria-label="Saved views" class="ds data-views-saved-views"><noscript><p class="unavailable">Saved views need JavaScript. A link to a query still works.</p></noscript></div>',
    );
    expect(list).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    // Nor the presentation's store: the arrangement stays the declared one.
    expect(readPresentation).not.toHaveBeenCalled();
    expect(heard).not.toHaveBeenCalled();
    // Nor did the server render observe the provider: the source never ran.
    expect(source.calls).toHaveLength(0);
    expect(errors).not.toHaveBeenCalled();
  });
});
