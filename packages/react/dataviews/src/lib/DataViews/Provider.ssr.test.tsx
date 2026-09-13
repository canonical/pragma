import {
  createDataViewsProvider,
  createSchema,
  type DataViewsProvider,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import useDataViews from "./hooks/useDataViews.js";
import useDataViewsValue from "./hooks/useDataViewsValue.js";
import DataViews from "./Provider.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "cancelled"] },
]);

/** A consumer reading the scope and a value channel during SSR. */
const ScopeProbe = ({
  provider,
  onRead,
}: {
  provider: DataViewsProvider<typeof schema.fields>;
  onRead: () => void;
}) => {
  const scope = useDataViews(provider);
  const snapshot = useDataViewsValue(scope.state);
  onRead();
  return <span data-testid="status">{snapshot.result.status}</span>;
};

describe("DataViews SSR", () => {
  it("renders on the server with the channel's server snapshot", () => {
    const provider = createDataViewsProvider({ schema });
    const read = vi.fn();
    const html = renderToString(
      <DataViews provider={provider}>
        <ScopeProbe provider={provider} onRead={read} />
      </DataViews>,
    );
    expect(html).toContain('data-testid="status"');
    expect(html).toContain("idle");
    // The hook read the channel during the server render.
    expect(read).toHaveBeenCalled();
    expect(provider.state.get().result.status).toBe("idle");
  });
});
