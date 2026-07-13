import type { SchemaGraph } from "../graph/types.js";

/**
 * A small, curated slice of the design-system knowledge graph used by the pure
 * component stories and tests. It deliberately exercises every entity kind
 * (standard · concept · component · token) and every relation kind (subclass ·
 * uses · governs · refines), so a single fixture drives the whole visual legend.
 *
 * The data is static and hand-written — no clocks, no randomness — so stories
 * and visual snapshots are reproducible.
 */
const ontologySample: SchemaGraph = {
  entities: [
    {
      id: "ds:standard.component-folder-structure",
      label: "component-folder-structure",
      kind: "STANDARD",
      summary: "How a component's files are named and laid out.",
    },
    {
      id: "ds:standard.class-name-construction",
      label: "class-name-construction",
      kind: "STANDARD",
      summary: "How a component assembles its class names.",
    },
    {
      id: "ds:concept.component",
      label: "Component",
      kind: "CONCEPT",
      summary: "A reusable unit of interface.",
    },
    {
      id: "ds:concept.token",
      label: "Token",
      kind: "CONCEPT",
      summary: "A named design decision.",
    },
    {
      id: "ds:global.component.button",
      label: "Button",
      kind: "COMPONENT",
      tier: "GLOBAL",
      summary: "Triggers an action within an interface.",
    },
    {
      id: "ds:global.component.card",
      label: "Card",
      kind: "COMPONENT",
      tier: "GLOBAL",
      summary: "A surface that groups related content.",
    },
    {
      id: "ds:global.component.icon",
      label: "Icon",
      kind: "COMPONENT",
      tier: "GLOBAL",
      summary: "A small pictographic glyph.",
    },
    {
      id: "ds:global.token.color-accent",
      label: "color-accent",
      kind: "TOKEN",
      tier: "GLOBAL",
      summary: "The accent colour used for emphasis.",
    },
    {
      id: "ds:global.token.spacing-small",
      label: "spacing-small",
      kind: "TOKEN",
      tier: "GLOBAL",
      summary: "The small step on the spacing scale.",
    },
  ],
  relations: [
    {
      id: "r:button-isa-component",
      source: "ds:global.component.button",
      target: "ds:concept.component",
      kind: "SUBCLASS_OF",
    },
    {
      id: "r:card-isa-component",
      source: "ds:global.component.card",
      target: "ds:concept.component",
      kind: "SUBCLASS_OF",
    },
    {
      id: "r:icon-isa-component",
      source: "ds:global.component.icon",
      target: "ds:concept.component",
      kind: "SUBCLASS_OF",
    },
    {
      id: "r:accent-isa-token",
      source: "ds:global.token.color-accent",
      target: "ds:concept.token",
      kind: "SUBCLASS_OF",
    },
    {
      id: "r:spacing-isa-token",
      source: "ds:global.token.spacing-small",
      target: "ds:concept.token",
      kind: "SUBCLASS_OF",
    },
    {
      id: "r:button-uses-accent",
      source: "ds:global.component.button",
      target: "ds:global.token.color-accent",
      kind: "USES",
    },
    {
      id: "r:button-uses-icon",
      source: "ds:global.component.button",
      target: "ds:global.component.icon",
      kind: "USES",
    },
    {
      id: "r:card-uses-spacing",
      source: "ds:global.component.card",
      target: "ds:global.token.spacing-small",
      kind: "USES",
    },
    {
      id: "r:folder-governs-component",
      source: "ds:standard.component-folder-structure",
      target: "ds:concept.component",
      kind: "GOVERNS",
    },
    {
      id: "r:classname-refines-folder",
      source: "ds:standard.class-name-construction",
      target: "ds:standard.component-folder-structure",
      kind: "REFINES",
    },
  ],
};

export default ontologySample;
