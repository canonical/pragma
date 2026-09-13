import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { createRowScopes } from "@canonical/dataviews-core/bindings";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deliverRows } from "../../../../../../testing/fixtures.js";
import { BodyCell } from "./index.js";

const schema = createSchema([{ field: "name", kind: "text" }]);

/** One row scope over the given fields, minted as the table mints them. */
const scopeOver = (fields: readonly string[]) => {
  const provider = createDataViewsProvider({ schema });
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  provider.complete(requestId, deliverRows([{ id: "m-1", name: "alpha" }]));
  const scopes = createRowScopes({
    rows: provider.rows,
    selection: provider.selection,
    fields,
  });
  return { provider, scopes };
};

describe("BodyCell", () => {
  it("reports a field no scope channel observes instead of rendering nothing", () => {
    const { provider, scopes } = scopeOver(["name"]);
    const scope = scopes.scope("m-1");
    const failure = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <BodyCell
          provider={provider}
          scope={scope}
          column={{ id: "zone", header: "Zone" }}
          field="zone"
        />,
      ),
    ).toThrow('no channel observes the field "zone"');
    failure.mockRestore();
    expect(screen.queryByRole("cell")).toBeNull();
  });
});
