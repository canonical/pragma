/**
 * The chip encoding grammar — the single source of truth for how a mention
 * is decorated.
 *
 * A chip is a mention, not an entity: its identity is the graph node its URI
 * resolves to; everything visual about it is decoration derived from the four
 * orthogonal channels below, each carrying exactly one semantic dimension:
 *
 * 1. tint (colour)        → the namespace the entity belongs to
 * 2. border-vs-fill (box) → TBox class vs ABox instance
 * 3. shape                → the entity family (kind)
 * 4. status dot           → lifecycle
 *
 * Both the renderer (`Chip`) and the legend (`ChipLegend`) consume the same
 * row tables, so the legend cannot drift from behaviour. Rows carry their CSS
 * payload behind `var(--chip-…, fallback)` hooks: themes restyle a channel by
 * defining the hook (see the `.dark` block in `styles.css`) without touching
 * any logic here.
 */

import { DEFAULT_NAMESPACE } from "./constants.js";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/** Namespaces a mention can belong to (the tint channel's vocabulary). */
export const NAMESPACES = ["ds", "cs", "docs"] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Entity families (the shape channel's vocabulary). */
export const KINDS = [
  "component",
  "pattern",
  "standard",
  "concept",
  "term",
  "token",
] as const;
export type Kind = (typeof KINDS)[number];

/** TBox class vs ABox instance (the border-vs-fill channel's vocabulary). */
export const BOXES = ["class", "instance"] as const;
export type Box = (typeof BOXES)[number];

/** Lifecycle states (the status-dot channel's vocabulary). */
export const LIFECYCLES = ["canonical", "beta", "deprecated", "none"] as const;
export type Lifecycle = (typeof LIFECYCLES)[number];

/** The four channels, in the order the legend presents them. */
export const CHANNELS = ["namespace", "box", "kind", "lifecycle"] as const;
export type Channel = (typeof CHANNELS)[number];

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

/** Fields every encoding row shares; `label`/`description` feed the legend. */
interface EncodingRow<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly description: string;
}

/** Tint channel row: the colour fed to `--chip-tint`. */
export interface NamespaceEncoding extends EncodingRow<Namespace> {
  readonly tint: string;
}

/** Shape channel row: a named shape and its `border-radius` payload. */
export interface KindEncoding extends EncodingRow<Kind> {
  readonly shape: string;
  readonly radius: string;
}

/**
 * Box channel row: `color-mix` percentages of the tint applied to the fill
 * and to the (always-present, so metrics never shift) 1px stroke.
 */
export interface BoxEncoding extends EncodingRow<Box> {
  readonly fillWeight: string;
  readonly strokeWeight: string;
}

/** Dot channel row: the dot colour, or `null` when no dot is shown. */
export interface LifecycleEncoding extends EncodingRow<Lifecycle> {
  readonly dot: string | null;
}

/** Legend copy for one channel: what dimension the decoration encodes. */
export type ChannelDescriptor = EncodingRow<Channel>;

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

/**
 * Indexes are typed so every vocabulary value must have exactly one row whose
 * `value` agrees with its key — totality is a compile error away from drift.
 */
type EncodingIndex<Value extends string, Row extends EncodingRow<Value>> = {
  readonly [V in Value]: Row & { readonly value: V };
};

const NAMESPACE_INDEX: EncodingIndex<Namespace, NamespaceEncoding> = {
  ds: {
    value: "ds",
    label: "Design system",
    description: "Entities from the design-system vocabulary (ds:).",
    tint: "var(--chip-tint-ds, oklch(0.45 0.12 155))",
  },
  cs: {
    value: "cs",
    label: "Code standards",
    description: "Entities from the code-standards vocabulary (cs:).",
    tint: "var(--chip-tint-cs, oklch(0.45 0.14 285))",
  },
  docs: {
    value: "docs",
    label: "Docs",
    description: "The docsite's own vocabulary (docs:).",
    tint: "var(--chip-tint-docs, oklch(0.5 0.12 70))",
  },
};

const KIND_INDEX: EncodingIndex<Kind, KindEncoding> = {
  component: {
    value: "component",
    label: "Component",
    description: "A buildable UI component.",
    shape: "rounded",
    radius: "0.375em",
  },
  pattern: {
    value: "pattern",
    label: "Pattern",
    description: "A composition of components solving a recurring problem.",
    shape: "pill",
    radius: "1.25em",
  },
  standard: {
    value: "standard",
    label: "Standard",
    description: "A normative rule the codebase is held to.",
    shape: "square",
    radius: "0",
  },
  concept: {
    value: "concept",
    label: "Concept",
    description: "An idea the corpus reasons with.",
    shape: "leaf",
    radius: "1em 0.25em",
  },
  term: {
    value: "term",
    label: "Term",
    description: "A glossary word with a pinned meaning.",
    shape: "leaf-reverse",
    radius: "0.25em 1em",
  },
  token: {
    value: "token",
    label: "Token",
    description: "A named design value (colour, spacing, type…).",
    shape: "tag",
    radius: "0 0.75em 0.75em 0",
  },
};

const BOX_INDEX: EncodingIndex<Box, BoxEncoding> = {
  class: {
    value: "class",
    label: "Class (TBox)",
    description: "A category of things — outlined, not filled.",
    fillWeight: "0%",
    strokeWeight: "80%",
  },
  instance: {
    value: "instance",
    label: "Instance (ABox)",
    description: "One concrete thing — filled, no outline.",
    fillWeight: "15%",
    strokeWeight: "0%",
  },
};

const LIFECYCLE_INDEX: EncodingIndex<Lifecycle, LifecycleEncoding> = {
  canonical: {
    value: "canonical",
    label: "Canonical",
    description: "The blessed, current form.",
    dot: "var(--chip-dot-canonical, oklch(0.55 0.15 150))",
  },
  beta: {
    value: "beta",
    label: "Beta",
    description: "Usable, still settling.",
    dot: "var(--chip-dot-beta, oklch(0.65 0.15 85))",
  },
  deprecated: {
    value: "deprecated",
    label: "Deprecated",
    description: "On the way out; prefer the replacement.",
    dot: "var(--chip-dot-deprecated, oklch(0.55 0.2 25))",
  },
  none: {
    value: "none",
    label: "Unmarked",
    description: "Lifecycle not asserted — no dot.",
    dot: null,
  },
};

const CHANNEL_INDEX: EncodingIndex<Channel, ChannelDescriptor> = {
  namespace: {
    value: "namespace",
    label: "Tint — namespace",
    description: "The colour says which vocabulary the entity belongs to.",
  },
  box: {
    value: "box",
    label: "Border vs fill — class vs instance",
    description:
      "An outline marks a class (TBox); a fill marks an instance (ABox).",
  },
  kind: {
    value: "kind",
    label: "Shape — entity family",
    description: "The silhouette says what family of thing is mentioned.",
  },
  lifecycle: {
    value: "lifecycle",
    label: "Dot — lifecycle",
    description: "A leading dot marks canonical, beta or deprecated status.",
  },
};

/** Row tables in presentation order — the legend generates from these. */
export const NAMESPACE_ENCODINGS: readonly NamespaceEncoding[] = NAMESPACES.map(
  (value) => NAMESPACE_INDEX[value],
);
export const KIND_ENCODINGS: readonly KindEncoding[] = KINDS.map(
  (value) => KIND_INDEX[value],
);
export const BOX_ENCODINGS: readonly BoxEncoding[] = BOXES.map(
  (value) => BOX_INDEX[value],
);
export const LIFECYCLE_ENCODINGS: readonly LifecycleEncoding[] = LIFECYCLES.map(
  (value) => LIFECYCLE_INDEX[value],
);
export const CHANNEL_DESCRIPTORS: readonly ChannelDescriptor[] = CHANNELS.map(
  (value) => CHANNEL_INDEX[value],
);

/* ------------------------------------------------------------------ */
/* Guards and asserts                                                  */
/* ------------------------------------------------------------------ */

/** Asserts a value crossing a boundary is a non-empty string. */
export function assertNonEmptyString(
  value: unknown,
  name: string,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Chip: "${name}" must be a non-empty string`);
  }
}

/** Narrows an untrusted value to a registered {@link Namespace}. */
export function isNamespace(value: unknown): value is Namespace {
  return (
    typeof value === "string" &&
    (NAMESPACES as readonly string[]).includes(value)
  );
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

/**
 * Row lookups are total over their typed vocabulary, and assert at runtime so
 * untyped content (MDX props, graph data) fails loudly, not with `undefined`.
 */
function getRow<Value extends string, Row extends EncodingRow<Value>>(
  index: EncodingIndex<Value, Row>,
  value: Value,
  channel: string,
): Row {
  const row: Row | undefined = index[value];
  if (row === undefined) {
    throw new Error(`Chip: unknown ${channel} "${value}"`);
  }
  return row;
}

export function getNamespaceEncoding(namespace: Namespace): NamespaceEncoding {
  return getRow(NAMESPACE_INDEX, namespace, "namespace");
}

export function getKindEncoding(kind: Kind): KindEncoding {
  return getRow(KIND_INDEX, kind, "kind");
}

export function getBoxEncoding(box: Box): BoxEncoding {
  return getRow(BOX_INDEX, box, "box");
}

export function getLifecycleEncoding(lifecycle: Lifecycle): LifecycleEncoding {
  return getRow(LIFECYCLE_INDEX, lifecycle, "lifecycle");
}

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

/**
 * Derives the namespace from a prefixed URI (`ds:global.component.button` →
 * `ds`). Unknown or missing prefixes degrade to the docsite's own namespace
 * rather than throwing — a mention must never block the prose around it.
 */
export function deriveNamespaceFromUri(uri: string): Namespace {
  assertNonEmptyString(uri, "uri");
  const prefix = uri.split(":").at(0);
  return isNamespace(prefix) ? prefix : DEFAULT_NAMESPACE;
}

/* ------------------------------------------------------------------ */
/* CSS bridge                                                          */
/* ------------------------------------------------------------------ */

/** One value per channel — everything the decoration derives from. */
export interface ChipChannelValues {
  readonly namespace: Namespace;
  readonly kind: Kind;
  readonly box: Box;
  readonly lifecycle: Lifecycle;
}

/** The custom properties `styles.css` consumes, one channel each. */
export interface ChipChannelStyle {
  readonly "--chip-tint": string;
  readonly "--chip-radius": string;
  readonly "--chip-fill-weight": string;
  readonly "--chip-stroke-weight": string;
  readonly "--chip-dot": string;
}

/**
 * Builds the per-chip custom properties from the encoding rows. `Chip` sets
 * these inline and the legend's swatches go through the same path, so a row
 * change repaints both — the cannot-drift property, by construction.
 */
export function buildChipChannelStyle(
  channels: ChipChannelValues,
): ChipChannelStyle {
  const { tint } = getNamespaceEncoding(channels.namespace);
  const { radius } = getKindEncoding(channels.kind);
  const { fillWeight, strokeWeight } = getBoxEncoding(channels.box);
  const { dot } = getLifecycleEncoding(channels.lifecycle);
  return {
    "--chip-tint": tint,
    "--chip-radius": radius,
    "--chip-fill-weight": fillWeight,
    "--chip-stroke-weight": strokeWeight,
    "--chip-dot": dot ?? "transparent",
  };
}
