/**
 * A client hydrating a server render draws what the server drew. The server
 * renders the connected composition from the request's URL and hands the
 * client its provider's snapshot; the client's provider starts from that
 * snapshot over the same URL, asks its source for the page before
 * hydrating, and the hydration finds the markup it would have rendered: no
 * recoverable error, nothing on the console, and no row of another page
 * ever reaching the document.
 */

import {
  createArraySource,
  createDataViewsProvider,
  createMemoryLocation,
  type DataViewsSnapshot,
} from "@canonical/dataviews-core";
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { SERVER_RENDER_HREF } from "../../../testing/fixtures.js";
import MachineComposition from "../../../testing/MachineComposition.js";
import { buildFleet, machines } from "../../../testing/machines.js";

/** The machine names a node's text carries, in document order. */
const listHostNames = (node: Node): readonly string[] =>
  node.textContent?.match(/host-\d{3}/g) ?? [];

describe("hydrating a server render", () => {
  it("draws what the server drew: no error, no console output, no swap from page one", async () => {
    const spies = (["error", "warn", "info", "log"] as const).map((method) =>
      vi.spyOn(console, method),
    );
    onTestFinished(() => {
      for (const spy of spies) {
        spy.mockRestore();
      }
    });
    const fleet = buildFleet(130);
    const build = (snapshot: DataViewsSnapshot) =>
      createDataViewsProvider({
        collection: machines,
        source: createArraySource({
          rows: fleet,
          collection: machines,
          searchFields: ["name"],
        }),
        location: createMemoryLocation({ href: SERVER_RENDER_HREF }),
        snapshot,
      });

    // The server: its arrangement hides the status column, as one restored
    // from the viewer's own preferences would.
    const server = build({
      query: "",
      presentation: { "table.hidden": ["status"] },
    });
    server.refresh();
    const markup = renderToString(<MachineComposition provider={server} />);
    const handed: DataViewsSnapshot = JSON.parse(
      JSON.stringify(server.readSnapshot()),
    );
    expect(handed).toEqual({
      query: "status=running&sort=cores__desc&page=2&size=50",
      presentation: { "table.hidden": ["status"] },
    });

    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const drawn = listHostNames(container);
    expect(drawn).toHaveLength(37);
    // Records are handed to the callback as they come, and any still queued
    // are taken at the end: every change the hydration made is kept.
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((batch) => {
      records.push(...batch);
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-busy"],
    });

    // The client: the server's snapshot, the same URL, the page asked for.
    const client = build(handed);
    client.refresh();
    // Nothing the client publishes while hydrating: the page drawn stands.
    const published = vi.fn();
    onTestFinished(client.state.subscribe(published));
    const recoverable = vi.fn();
    const root = await act(async () =>
      hydrateRoot(container, <MachineComposition provider={client} />, {
        onRecoverableError: recoverable,
      }),
    );
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
    });

    // Every name any change brought into the document is one the server drew.
    records.push(...observer.takeRecords());
    const arrived = records.flatMap((record) =>
      record.type === "characterData"
        ? listHostNames(record.target)
        : [...record.addedNodes].flatMap(listHostNames),
    );
    observer.disconnect();
    expect(arrived.filter((name) => !drawn.includes(name))).toEqual([]);
    // Nor did the table turn busy: the rows drawn were never asked for again.
    expect(records.filter((record) => record.type === "attributes")).toEqual(
      [],
    );

    expect(recoverable).not.toHaveBeenCalled();
    expect(published).not.toHaveBeenCalled();
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
    expect(listHostNames(container)).toEqual(drawn);
    expect(container.querySelectorAll("[aria-sort]")).toHaveLength(1);
    expect(
      container.querySelector<HTMLSelectElement>('select[name="page"]')?.value,
    ).toBe("2");
    expect(
      [...container.querySelectorAll('[role="columnheader"]')].map(
        (header) => header.textContent,
      ),
    ).not.toContain("Status");
    expect(client.state.get().window.page).toBe(2);
  });
});
