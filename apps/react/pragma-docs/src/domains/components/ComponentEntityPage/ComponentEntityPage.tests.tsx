/**
 * The entity page's warm-store proof (the P-2 exit criterion, applied to
 * the P-5 view): a store seeded with the captured fixture renders every
 * region WITHOUT the network being consulted — with teeth, because the
 * same render against an empty store does hit the network. Plus the two
 * data postures the catalog links into: Card (populated subcomponents) and
 * the null component (ruling R4's in-canvas not-found).
 */

import { render, screen } from "@testing-library/react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import componentEntityRecordsCard from "../__fixtures__/componentEntityRecordsCard.js";
import {
  BUTTON_URI,
  CARD_URI,
  entityPageAt,
} from "../__fixtures__/entityPageHarness.js";
import ComponentEntityPage from "./ComponentEntityPage.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** An unknown URI resolved to null — the server's own answer, verbatim. */
const NO_SUCH_URI = "ds:no.such.component";
const notFoundRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:no.such.component")': null,
  },
} as unknown as RecordMap;

describe("ComponentEntityPage against a warm store", () => {
  it("renders every region from the Button fixture without fetching", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn));

    // Header: name as h1, URI in code voice, tier, summary.
    expect(
      screen.getByRole("heading", { level: 1, name: "Button" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(BUTTON_URI).length).toBeGreaterThan(0);
    expect(screen.getByText(/tier: Global/)).toBeInTheDocument();
    expect(
      screen.getByText(/Buttons trigger actions within an interface/),
    ).toBeInTheDocument();
    // Properties: the five captured rows, verbatim plain text (R8).
    for (const name of [
      "anticipation",
      "content",
      "icon",
      "size",
      "variantSpecial",
    ]) {
      expect(screen.getByRole("rowheader", { name })).toBeInTheDocument();
    }
    // Relations: no subcomponents ("None."), both modifier families.
    expect(screen.getByText("None.")).toBeInTheDocument();
    expect(screen.getByText("Anticipation")).toBeInTheDocument();
    expect(screen.getByText("Importance")).toBeInTheDocument();
    // Aside: quick facts with the version fallback (captured null).
    expect(
      screen.getByRole("complementary", { name: "Quick facts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("unversioned")).toBeInTheDocument();
    // Head: the client-only title (document.title via useHead — this app's
    // SSR path emits no <title>). render() flushes effects, so it is set.
    expect(document.title).toBe("Button — Pragma docs");
    // …and the network was NEVER consulted.
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("has teeth: the same render against an empty store hits the network", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(BUTTON_URI, undefined, fetchFn));

    expect(screen.getByText("Loading the component…")).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("renders Card's populated subcomponents from its fixture, no fetch", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(CARD_URI, componentEntityRecordsCard, fetchFn));

    expect(
      screen.getByRole("heading", { level: 1, name: "Card" }),
    ).toBeInTheDocument();
    for (const name of [
      "Card.Content",
      "Card.Footer",
      "Card.Header",
      "Card.Image",
      "Card.Thumbnail",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("renders the in-canvas not-found alert for a null component (R4), no fetch", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(NO_SUCH_URI, notFoundRecords, fetchFn));

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("No component found at");
    expect(alert.textContent).toContain(NO_SUCH_URI);
    // The not-found branch titles itself too (client-only, as above).
    expect(document.title).toBe("Component not found — Pragma docs");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("keeps the data-view marker outside the suspending interior", () => {
    const fetchFn = createFetchSpy();
    const { container } = render(
      <RelayEnvironmentProvider environment={createEnvironment({ fetchFn })}>
        <ComponentEntityPage params={{ uri: BUTTON_URI }} />
      </RelayEnvironmentProvider>,
    );
    // Suspended interior — the marker still stands (the frame suite keys
    // the entity canvas off it).
    const section = container.querySelector('[data-view="component-entity"]');
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain("Loading the component…");
  });
});
