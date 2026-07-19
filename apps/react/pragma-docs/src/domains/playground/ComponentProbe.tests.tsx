/**
 * The warm-store proof (P-2 Stage 1 exit criterion): an environment seeded
 * from a serialised snapshot renders the probe's fields WITHOUT the network
 * ever being consulted — and the proof has teeth, because the same render
 * against an empty store does hit the network.
 */

import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import componentProbeRecords from "./__fixtures__/componentProbeRecords.js";
import ComponentProbe from "./ComponentProbe.js";
import { PROBE_URI } from "./probeQuery.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

const renderProbe = (
  fetchFn: FetchFunction,
  records?: typeof componentProbeRecords,
) =>
  render(
    <RelayEnvironmentProvider
      environment={createEnvironment({ records, fetchFn })}
    >
      <Suspense fallback={<p>suspended</p>}>
        <ComponentProbe uri={PROBE_URI} />
      </Suspense>
    </RelayEnvironmentProvider>,
  );

describe("ComponentProbe against a warm store", () => {
  it("renders the probe's fields from seeded records without fetching", () => {
    const fetchFn = createFetchSpy();
    renderProbe(fetchFn, componentProbeRecords);

    // The fields render synchronously from the store…
    expect(
      screen.getByRole("heading", { level: 2, name: "Button" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Buttons trigger actions within an interface/),
    ).toBeInTheDocument();
    expect(screen.getByText("Anticipation")).toBeInTheDocument();
    expect(screen.getByText("Importance")).toBeInTheDocument();
    // …and the network was NEVER consulted.
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("has teeth: the same render against an empty store hits the network", () => {
    const fetchFn = createFetchSpy();
    renderProbe(fetchFn, undefined);

    // Nothing to read — the hook suspends on its in-flight fetch.
    expect(screen.getByText("suspended")).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
