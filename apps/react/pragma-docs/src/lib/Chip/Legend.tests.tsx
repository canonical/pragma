import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BOX_ENCODINGS,
  CHANNEL_DESCRIPTORS,
  KIND_ENCODINGS,
  LIFECYCLE_ENCODINGS,
  NAMESPACE_ENCODINGS,
} from "./encodings.js";
import ChipLegend from "./Legend.js";

describe("ChipLegend", () => {
  it("renders one group per channel, titled from the descriptors", () => {
    render(<ChipLegend />);
    for (const channel of CHANNEL_DESCRIPTORS) {
      expect(screen.getByText(channel.label)).toBeInTheDocument();
      expect(screen.getByText(channel.description)).toBeInTheDocument();
    }
  });

  it("generates every entry from the encoding rows — nothing hand-written", () => {
    render(<ChipLegend />);
    // Every row of every table must surface; a row added to encodings.ts
    // appears here (and on rendered chips) with no legend change.
    for (const row of NAMESPACE_ENCODINGS) {
      expect(screen.getByText(row.label)).toBeInTheDocument();
    }
    for (const row of BOX_ENCODINGS) {
      expect(screen.getByText(row.label)).toBeInTheDocument();
    }
    for (const row of KIND_ENCODINGS) {
      expect(
        screen.getByText(`${row.label} (${row.shape})`),
      ).toBeInTheDocument();
    }
    for (const row of LIFECYCLE_ENCODINGS) {
      expect(screen.getByText(row.label)).toBeInTheDocument();
    }
  });

  it("renders every swatch as a real chip through the shared pipeline", () => {
    const { container } = render(<ChipLegend />);
    const expectedSwatchCount =
      NAMESPACE_ENCODINGS.length +
      BOX_ENCODINGS.length +
      KIND_ENCODINGS.length +
      LIFECYCLE_ENCODINGS.length;
    const swatches = container.querySelectorAll(".chip[data-uri]");
    expect(swatches).toHaveLength(expectedSwatchCount);
    // Swatches are mentions like any other: styled via the same channel
    // custom properties the component sets in prose.
    const first = swatches.item(0) as HTMLElement;
    expect(first.style.getPropertyValue("--chip-tint")).not.toBe("");
  });
});
