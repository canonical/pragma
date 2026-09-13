/**
 * Views live in the browser's storage, which a server cannot read: the
 * server renders the control as unavailable without JavaScript, and reads
 * nothing from the store.
 */

import {
  createDataViewsProvider,
  createSchema,
  type ViewStore,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import DataViews from "../../Provider.js";
import Views from "./Views.js";

/** A store call this test never makes. */
const unused = () => Promise.reject(new Error("not used in this test"));

describe("DataViews.Views SSR", () => {
  it("renders only the no-script notice, and never reads the store", () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const list = vi.fn<ViewStore["list"]>();
    const subscribe = vi.fn<ViewStore["subscribe"]>();
    const store: ViewStore = {
      list,
      get: unused,
      create: unused,
      update: unused,
      remove: unused,
      pin: unused,
      unpin: unused,
      readPresentation: unused,
      patchPresentation: unused,
      subscribe,
      dispose: () => {},
    };
    const provider = createDataViewsProvider({
      schema: createSchema([
        { field: "status", kind: "choices", options: ["failed"] },
      ]),
      views: store,
    });
    const html = renderToString(
      <DataViews provider={provider}>
        <Views />
      </DataViews>,
    );
    expect(html).toBe(
      '<div role="group" aria-label="Saved views" class="ds data-views-views"><noscript><p class="unavailable">Saved views need JavaScript. A link to a query still works.</p></noscript></div>',
    );
    expect(list).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });
});
