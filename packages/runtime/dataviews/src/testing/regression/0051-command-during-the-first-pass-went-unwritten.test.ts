/**
 * Regression: a command issued while an observation's first pass runs is
 * written to the location.
 *
 * Before the fix, the loop marked every transition announced during its
 * first pass as heard. A command a listener issued then — woken by the
 * pass's adoption — was never written: the host stood on the command's query
 * while the location carried the one before it.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import type { Predicate } from "../../lib/query/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

/** The predicate a listener's command moves the host to. */
const RUNNING: Predicate = {
  field: "status",
  operator: "eq",
  operands: ["running"],
};

/**
 * A provider standing on `status=running`, over a recording location moved
 * to `moved` while nothing observed, so the first pass adopts; each state
 * publication runs the next of `steps`.
 */
const buildProvider = (moved: string, steps: (() => void)[]) => {
  const { location, writes } = createRecordingLocation({
    href: "/machines?status=running",
  });
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource({
      capabilities: declare({ filter: { status: ["eq"] } }),
      answer: answering([]),
    }).source,
    location,
  });
  location.write(new URLSearchParams(moved));
  writes.length = 0;
  provider.state.subscribe(() => {
    steps.shift()?.();
  });
  return { location, writes, provider, host: readProviderHost(provider) };
};

describe("regression 0051 — a command during the first pass went unwritten", () => {
  it("writes a command a listener issues while the pass adopts", () => {
    const steps: (() => void)[] = [];
    const { location, provider, host } = buildProvider("status=failed", steps);
    steps.push(() => host.setPredicate(RUNNING));
    observeUntilFinished(provider);
    expect(provider.state.get().slice.filter).toEqual([RUNNING]);
    expect(location.read().get("status")).toBe("running");
  });

  it("writes it once, entering history as a command does", () => {
    const steps: (() => void)[] = [];
    const { writes, provider, host } = buildProvider("status=failed", steps);
    steps.push(() => host.setPredicate(RUNNING));
    observeUntilFinished(provider);
    expect(
      writes.filter(([spelling]) => spelling.includes("status=running")),
    ).toEqual([["status=running&page=1&size=50", "push"]]);
  });

  it("writes the host as it stands, keeping a move made after the command", () => {
    const steps: (() => void)[] = [];
    const { location, writes, provider, host } = buildProvider(
      "status=failed",
      steps,
    );
    steps.push(
      () => host.setPredicate(RUNNING),
      () => location.write(new URLSearchParams("status=failed&size=25")),
    );
    observeUntilFinished(provider);
    expect(
      provider.state.get().slice.filter.map(({ operands }) => operands),
    ).toEqual([["failed"]]);
    expect(provider.state.get().window.size).toBe(25);
    expect(location.read().toString()).toBe("status=failed&page=1&size=25");
    expect(
      writes.some(([spelling]) => spelling.includes("status=running")),
    ).toBe(false);
  });

  it("pushes nothing when the location already carries the command's spelling", () => {
    const steps: (() => void)[] = [];
    const { location, writes, provider, host } = buildProvider(
      "status=failed",
      steps,
    );
    steps.push(
      () => host.setPredicate(RUNNING),
      () =>
        location.write(new URLSearchParams("status=running&page=1&size=50")),
    );
    observeUntilFinished(provider);
    expect(provider.state.get().slice.filter).toEqual([RUNNING]);
    expect(writes.filter(([, history]) => history === "push")).toEqual([]);
  });

  it("keeps a reset's cause, respelling a refused clause away", () => {
    const steps: (() => void)[] = [];
    const { location, provider } = buildProvider("status=melted", steps);
    steps.push(() => provider.reset());
    observeUntilFinished(provider);
    expect(location.read().has("status")).toBe(false);
    expect(provider.issues.get()).toEqual([]);
  });
});
