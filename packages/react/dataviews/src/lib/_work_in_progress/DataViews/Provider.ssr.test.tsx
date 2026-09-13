/**
 * A server render of a root: the children read the provider's idle state
 * through the channel's server snapshot, and nothing observes — the source
 * is never asked, since observing happens in an effect the server does not
 * run.
 */
import { createMemoryLocation } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createMachineProvider,
  machines,
} from "../../../../testing/machines.js";
import useDataViews from "./hooks/useDataViews.js";
import useDataViewsFilter from "./hooks/useDataViewsFilter.js";
import useDataViewsValue from "./hooks/useDataViewsValue.js";
import DataViews from "./Provider.js";

/** A consumer reading the scope, a value channel and a filter during SSR. */
const ScopeProbe = ({ onRead }: { onRead: () => void }) => {
  const scope = useDataViews(machines);
  const snapshot = useDataViewsValue(scope.state);
  const cores = useDataViewsFilter(machines, "cores", "gte");
  onRead();
  return (
    <>
      <span data-testid="status">{snapshot.result.status}</span>
      <span data-testid="rows">{String(snapshot.result.rows)}</span>
      <span data-testid="cores">{cores.feedback.status}</span>
    </>
  );
};

describe("DataViews SSR", () => {
  it("renders the idle state on the server, and asks the source for nothing", () => {
    const { provider, source } = createMachineProvider({ rows: [] });
    const read = vi.fn();
    const html = renderToString(
      <DataViews provider={provider}>
        <ScopeProbe onRead={read} />
      </DataViews>,
    );
    expect(html).toContain('data-testid="status">idle<');
    expect(html).toContain('data-testid="rows">null<');
    expect(html).toContain('data-testid="cores">none<');
    // The hooks read their channels during the server render.
    expect(read).toHaveBeenCalled();
    // Nothing observed the provider, so nothing ran.
    expect(source.calls).toHaveLength(0);
    expect(provider.state.get().result.status).toBe("idle");
    expect(provider.state.get().pendingRequestId).toBeNull();
  });

  it("starts no port on the server: the location is neither read into the query nor written", () => {
    const memory = createMemoryLocation({ href: "/machines?status=failed" });
    const subscribe = vi.fn(memory.subscribe);
    const write = vi.fn(memory.write);
    const { provider, source } = createMachineProvider({
      rows: [],
      location: { ...memory, subscribe, write },
    });
    const html = renderToString(
      <DataViews provider={provider}>
        <ScopeProbe onRead={() => {}} />
      </DataViews>,
    );
    // The seed renders, not the location's query: adopting it is the first
    // observer's job, and the server observes nothing.
    expect(html).toContain('data-testid="status">idle<');
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(subscribe).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(memory.read().toString()).toBe("status=failed");
    expect(source.calls).toHaveLength(0);
  });
});
