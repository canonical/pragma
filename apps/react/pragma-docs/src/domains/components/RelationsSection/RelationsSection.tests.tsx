/**
 * RelationsSection through the real page fan-out: both captured data
 * shapes — Button (no subcomponents, two modifier families) and Card
 * (five subcomponents, no families) — render as plain lists, never chips
 * (ruling R5), never the network.
 */

import { render, within } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import componentEntityRecordsCard from "../__fixtures__/componentEntityRecordsCard.js";
import {
  BUTTON_URI,
  CARD_URI,
  entityPageAt,
} from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("RelationsSection", () => {
  it("lists Button's modifier families and its empty subcomponents", () => {
    const fetchFn = createFetchSpy();
    const { container } = render(
      entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn),
    );

    const section = container.querySelector(".ds.relations-section");
    expect(section).not.toBeNull();
    const relations = within(section as HTMLElement);
    expect(
      relations.getByRole("heading", { level: 3, name: "Subcomponents" }),
    ).toBeInTheDocument();
    expect(relations.getByText("None.")).toBeInTheDocument();
    expect(relations.getByText("Anticipation")).toBeInTheDocument();
    expect(relations.getByText("Importance")).toBeInTheDocument();
    // Plain list text, not chips (R5): no anchor decorates the mention.
    expect(section?.querySelector("a")).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("lists Card's five subcomponents with their URIs", () => {
    const fetchFn = createFetchSpy();
    const { container } = render(
      entityPageAt(CARD_URI, componentEntityRecordsCard, fetchFn),
    );

    const section = container.querySelector(".ds.relations-section");
    const relations = within(section as HTMLElement);
    for (const name of [
      "Card.Content",
      "Card.Footer",
      "Card.Header",
      "Card.Image",
      "Card.Thumbnail",
    ]) {
      expect(relations.getByText(name)).toBeInTheDocument();
    }
    expect(
      relations.getByText("ds:global.subcomponent.card-content"),
    ).toBeInTheDocument();
    // Card's modifierFamilies came back empty — the families list says so.
    expect(relations.getByText("None.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
