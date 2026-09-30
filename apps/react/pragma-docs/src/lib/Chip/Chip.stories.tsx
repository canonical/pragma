import type { Meta, StoryObj } from "@storybook/react-vite";
import Chip from "./Chip.js";
import {
  BOX_ENCODINGS,
  KIND_ENCODINGS,
  LIFECYCLE_ENCODINGS,
  NAMESPACE_ENCODINGS,
} from "./encodings.js";
import ChipLegend from "./Legend.js";
import { resolveChipHref } from "./resolveChipHref.js";

const meta: Meta<typeof Chip> = {
  title: "Components/Chip",
  component: Chip,
  tags: ["autodocs"],
  // A baseline mention every story inherits; matrix stories map over the
  // encoding tables instead, so they stay in step with the grammar.
  args: {
    uri: "ds:global.component.button",
    label: "Button",
    kind: "component",
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {};

/** One chip per entity family — the shape channel. */
export const Kinds: Story = {
  render: () => (
    <p>
      {KIND_ENCODINGS.map((row) => (
        <span key={row.value}>
          <Chip
            kind={row.value}
            label={`${row.label} (${row.shape})`}
            uri={`docs:example.${row.value}`}
          />{" "}
        </span>
      ))}
    </p>
  ),
};

/** One chip per namespace — the tint channel. */
export const Namespaces: Story = {
  render: () => (
    <p>
      {NAMESPACE_ENCODINGS.map((row) => (
        <span key={row.value}>
          <Chip
            kind="concept"
            label={row.label}
            uri={`${row.value}:example.concept`}
          />{" "}
        </span>
      ))}
    </p>
  ),
};

/** Outline marks a TBox class; fill marks an ABox instance. */
export const ClassVersusInstance: Story = {
  render: () => (
    <p>
      {BOX_ENCODINGS.map((row) => (
        <span key={row.value}>
          <Chip
            box={row.value}
            kind="component"
            label={row.label}
            uri="ds:global.component.button"
          />{" "}
        </span>
      ))}
    </p>
  ),
};

/** The status dot per lifecycle state (unmarked shows no dot). */
export const Lifecycles: Story = {
  render: () => (
    <p>
      {LIFECYCLE_ENCODINGS.map((row) => (
        <span key={row.value}>
          <Chip
            kind="component"
            label={row.label}
            lifecycle={row.value}
            uri="ds:global.component.button"
          />{" "}
        </span>
      ))}
    </p>
  ),
};

/** With an href the chip is a link to the noun's home; without, inert text. */
export const LinkVersusText: Story = {
  render: () => (
    <p>
      <Chip
        href={resolveChipHref("ds:global.component.button", "component")}
        kind="component"
        label="Button (linked)"
        uri="ds:global.component.button"
      />{" "}
      <Chip
        kind="component"
        label="Button (text only)"
        uri="ds:global.component.button"
      />
    </p>
  ),
};

/** A `summary` reveals a lightweight definition peek on hover. */
export const WithSummary: Story = {
  args: {
    summary: "The design system's primary action component.",
  },
};

/**
 * Bet H1: ignored, chips never block the reading path — a sentence with
 * mentions still reads as a sentence.
 */
export const InProse: Story = {
  render: () => (
    <p style={{ maxWidth: "36rem" }}>
      When composing a form, reach for the{" "}
      <Chip
        href={resolveChipHref("ds:global.component.button", "component")}
        kind="component"
        label="Button"
        lifecycle="canonical"
        summary="The design system's primary action component."
        uri="ds:global.component.button"
      />{" "}
      component rather than a bare element, follow the{" "}
      <Chip
        box="class"
        href={resolveChipHref("cs:typescript.imports", "standard")}
        kind="standard"
        label="imports"
        uri="cs:typescript.imports"
      />{" "}
      standard for module wiring, and mind the{" "}
      <Chip
        kind="term"
        label="density"
        summary="How tightly a layout packs its controls."
        uri="docs:glossary.density"
      />{" "}
      of the surrounding layout.
    </p>
  ),
};

/**
 * A narrow container forces a long label to wrap across lines, so
 * `box-decoration-break: clone` (padding, border and corners cloned onto
 * each fragment; the lifecycle dot only on the first) is visually
 * inspectable rather than merely asserted in the stylesheet comment.
 */
export const Wrapping: Story = {
  render: () => (
    <p style={{ maxWidth: "14rem" }}>
      Compose a form around the{" "}
      <Chip
        href={resolveChipHref(
          "ds:global.pattern.multi-step-form-wizard",
          "pattern",
        )}
        kind="pattern"
        label="Multi-step form wizard"
        lifecycle="beta"
        uri="ds:global.pattern.multi-step-form-wizard"
      />{" "}
      pattern when a single page grows too long to submit at once.
    </p>
  ),
};

/** The legend generates from the same rows that drive rendering. */
export const Legend: Story = {
  render: () => <ChipLegend />,
};
