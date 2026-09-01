# Anatomy DSL Specification

This specification presents a DSL to represent design system anatomies, providing an accurate platform-agnostic markup primitive to precede implementation.

## Rationale

Design systems need a formal way to describe component structure that:
- Precedes and guides implementation
- Is platform-agnostic (works for React, SwiftUI, Flutter, etc.)
- Supports discussion and review
- Enables automated tooling (auditing, code generation)

## Intended Usage

1. **Documentation**: Implementation primitive for markup and style bindings
2. **Specification**: Using the tree-based DSL to identify entities to implement and/or reuse
3. **Discussion**: Using the DSL to discuss across conversations related to DS (e.g., "I believe these nodes should be siblings, not parents of one another")
4. **Inference**: Supporting automated inference to audit a codebase against its specifications or to support code generation

## Requirements

### General DSL Requirements

- The DSL MUST optimize for readability
- The DSL MUST be easy to get started with and use a familiar language
- The scope of the DSL MUST be minimized to cover only the strict necessary - additional specification information being covered in the schema

### Modelling Requirements

- The children of a node MUST be modelled through a reified relation for annotation purposes
- The DSL MUST support anonymous nodes (nodes that are not named components, for instance an unnamed "div"). In this case, the DSL should support role annotations
- The DSL MUST support reified annotations of cardinality
- The DSL MUST support all classes of UI Blocks identified in the ontology (Layout, Pattern, Component, Subcomponent, Group)

## Type System

We structure the children one-to-many relation following inspiration by [the Relay connection pattern](https://relay.dev/graphql/connections.htm) and propose the following typings.

```typescript
/* Reusable types */

/**
 * Styles use a CTI (Category-Type-Item) inspired flat key structure for
 * platform-agnostic UI properties. This allows to avoid using language
 * specific keys such as CSS.
 *
 * KEY NAMING CONVENTION:
 * Properties follow a dot-notation pattern: "category.type[.item]"
 * - Category: Primary concern (layout, spacing, appearance, typography, size, etc.)
 * - Type: Specific aspect within that category
 * - Item: Optional further specification
 *
 * INVARIANT VS THEMEABLE:
 * Whether a property is invariant (structural) or themeable depends on its
 * semantic meaning and value type, rather than strict rules:
 *
 * Typically invariant (structural decisions):
 * - layout.type: "stack" | "flow" | "grid"  // Component structure
 * - layout.direction: "horizontal" | "vertical"
 * - size.width: "fill" | "hug" | "100%"  // Structural sizing
 *
 * Typically themeable (brand/theme variations):
 * - appearance.*: Color, shadow, radius values via tokens
 * - spacing.*: When referencing design tokens
 * - typography.*: Font properties via tokens
 *
 * Context-dependent:
 * - size.width: "320px" or "size/card/width"  // Token = themeable
 * - size.width: "fill" or "100%"  // Structural = invariant
 * - spacing.internal: "16"  // Fixed value = invariant
 * - spacing.internal: "spacing/medium"  // Token = themeable
 *
 * The distinction is semantic: does this property define structure or appearance?
 */
type Styles = Record<string, TokenPath | TokenPath[] | PrimitiveValue>;

/**
 * TokenPath represents a forward-slash delimited path to a design token.
 * Follows design token naming conventions referenced by the W3C Design Token Format.
 *
 * Examples:
 * - "spacing/medium"
 * - "color/surface/primary"
 * - "font/size/heading/1"
 * - "border/width/thin"
 * - "shadow/elevated/medium"
 * - "radius/button/default"
 *
 * Token paths are resolved at runtime against the active theme.
 */
type TokenPath = string;

/**
 * PrimitiveValue represents direct values not resolved from tokens.
 * Used for structural decisions and fixed values.
 *
 * Examples:
 * - string: "stack", "flow", "center", "fill", "100%", "1fr"
 * - number: 1.5 (aspect ratio), 2 (column count), -1 (z-index)
 * - boolean: true/false (for wrap, reverse, etc.)
 */
type PrimitiveValue = string | number | boolean;

/* Main types */

interface Relation {
  /**
   * Cardinality represents the number of allowed instances of the related node.
   * See https://en.wikipedia.org/wiki/Cardinality_(data_modeling) for reference.
   *
   * Examples:
   * - "1"     : Exactly one (required)
   * - "0..1"  : Zero or one (optional)
   * - "0..*"  : Zero or more
   * - "1..*"  : One or more
   * - "2..5"  : Between 2 and 5
   */
  cardinality: string;

  /**
   * Maps content to a specific slot in the parent component.
   *
   * Common values:
   * - "default" : Main content (React children)
   * - "header"  : Header slot
   * - "footer"  : Footer slot
   * - "icon"    : Icon placement
   * - "label"   : Text label
   * - Custom slots as needed
   */
  slotName?: string;
}

/**
 * Base interface for all nodes in the anatomy tree.
 */
interface BaseNode {
  /**
   * Style properties using CTI-inspired keys.
   *
   * Common patterns and their platform mappings:
   *
   * LAYOUT:
   * - "layout.type": "stack" | "flow" | "grid"
   *   -> CSS: display + flexDirection | SwiftUI: VStack/HStack | Flutter: Column/Row
   * - "layout.align": "center" | "start" | "end"
   *   -> CSS: align-items | SwiftUI: alignment | Flutter: crossAxisAlignment
   *
   * SPACING:
   * - "spacing.internal": "spacing/medium"
   *   -> CSS: padding | SwiftUI: .padding() | Flutter: EdgeInsets
   * - "spacing.external": "spacing/large"
   *   -> CSS: margin | SwiftUI: frame modifiers | Flutter: Container margin
   * - "spacing.gap": "spacing/small"
   *   -> CSS: gap | SwiftUI: spacing parameter | Flutter: SizedBox between
   *
   * APPEARANCE:
   * - "appearance.background": "color/surface/primary"
   *   -> CSS: background | SwiftUI: .background() | Flutter: Container color
   * - "appearance.radius": "radius/medium"
   *   -> CSS: border-radius | SwiftUI: .cornerRadius() | Flutter: BorderRadius
   *
   * SIZE:
   * - "size.width": "fill" | "hug" | "size/card/width"
   *   -> CSS: width: 100% | auto | var() | SwiftUI: .frame() | Flutter: constraints
   *
   * Examples showing invariant vs themeable:
   * {
   *   "layout.type": "grid",                    // Invariant: structural
   *   "layout.columns": "1fr 300px 1fr",        // Invariant: grid structure
   *   "spacing.gap": "spacing/grid/gap",        // Themeable: token reference
   *   "appearance.background": "color/surface", // Themeable: always
   *   "size.width": "fill",                     // Invariant: structural behavior
   *   "size.max.width": "size/container/max",   // Themeable: token reference
   *   "typography.align": "center",             // Invariant: structural
   *   "typography.size": "font/size/body",      // Themeable: token reference
   * }
   */
  styles?: Styles;

  /**
   * Child nodes and their relationships.
   * Enables recursive component composition.
   */
  edges?: Edge[];
}

/**
 * Named nodes represent identifiable components in the design system.
 */
interface NamedNode extends BaseNode {
  /**
   * Unique identifier following "tier.type.name" pattern.
   * Maps to URI field on UI Block in the ontology.
   *
   * Examples:
   * - "global.component.button"
   * - "global.component.card"
   * - "apps.layout.application_layout"
   */
  uri: string;
}

/**
 * Anonymous nodes represent structural elements without DS identity.
 */
interface AnonymousNode extends BaseNode {
  /**
   * Human-readable description of the node's purpose.
   *
   * Examples:
   * - "content wrapper"
   * - "spacer element"
   * - "icon container"
   * - "layout grid cell"
   */
  role: string;
}

/**
 * Union type for all possible nodes.
 */
type Node = NamedNode | AnonymousNode;

/**
 * A switch fills one position with ONE of several alternatives,
 * making polymorphism explicit at the edge level.
 * The discriminator says who chooses:
 * - "props"    : the consumer chooses via component props
 * - "internal" : the component chooses from its own state
 * - "override" : the consumer may replace the default with a custom component
 */
interface Switch {
  on: "props" | "internal" | "override";
  cases: SwitchCase[];
}

/**
 * One switch alternative — exactly one of `uri` or `node`.
 * `uri` is the shorthand for `node: { uri }`; use the full `node` form
 * when the case carries styles or edges. The reserved URI `$custom`
 * marks a case filled by a user-provided component.
 */
interface SwitchCase {
  uri?: string;
  node?: Node;

  /** Marks the default case. */
  default?: boolean;
}

/**
 * Represents a parent-child relationship in the anatomy tree.
 */
interface Edge {
  /** The child node (Named or Anonymous) — exactly one of `node` or `switch` */
  node?: Node;

  /** A polymorphic position (mutually exclusive with node) */
  switch?: Switch;

  /** Relationship metadata (cardinality, slot) */
  relation: Relation;
}

/**
 * Root specification for a component anatomy.
 * The top-level node must always be Named.
 */
interface AnatomySpec {
  node: NamedNode;
}
```

## Language Choice

We propose the use of YAML, a mature indentation-based configuration syntax based on scalars, maps and lists. The main contender we have considered aside from YAML was JSON, rejected for its verbosity. We have also rejected TOML (maps with difficulty deeply nested nodes), SDLang and KDL (promising markup syntaxes without wide adoption at present).

## Examples

### Accordion

```yaml
node:
  uri: global.component.accordion
  styles:
    # Structural (implicitly invariant)
    layout.type: stack
    layout.direction: vertical

    # Themeable
    appearance.border: border/style/accordion

  edges:
    # The repeating child is NAMED — reference its URI only; its subtree
    # lives in its own anatomy. The live Accordion does the same.
    - node:
        uri: global.subcomponent.accordion-item
      relation:
        cardinality: "1..*"
        slotName: default
```

The child's own anatomy — a separate spec on `global.subcomponent.accordion-item`
(transcribed from the live block) — carries the subtree as anonymous roles:

```yaml
node:
  uri: global.subcomponent.accordion-item
  styles:
    layout.type: stack
    layout.direction: vertical
  edges:
    - node:
        role: header tab
        styles:
          layout.type: flow
          layout.direction: horizontal
          layout.align: center
          interaction.cursor: pointer
        edges:
          - node:
              role: control
              styles:
                size.width: size/icon/small
                size.height: size/icon/small
            relation:
              cardinality: "1"
          - node:
              role: heading
            relation:
              cardinality: "1"
              slotName: default
      relation:
        cardinality: "1"
        slotName: header

    - node:
        role: content panel
        styles:
          layout.overflow: hidden
      relation:
        cardinality: "1"
        slotName: default
```

### Card

```yaml
node:
  uri: global.component.card
  styles:
    # Structural (implicitly invariant)
    layout.type: stack
    layout.direction: vertical

    # Themeable
    appearance.background: color/surface/card
    appearance.shadow: shadow/card
    appearance.radius: shape/rounded/full
    spacing.gap: spacing/small

  edges:
    # Named children reference their URI only (each carries its own styles
    # in its own anatomy); anonymous nodes carry their styles inline. A
    # named child may carry contextual style overrides — never a copy of
    # its subtree. The live Card models it the same way.
    - node:
        uri: global.subcomponent.card-header
      relation:
        cardinality: "0..1"
        slotName: header

    - node:
        uri: global.subcomponent.card-image
      relation:
        cardinality: "0..1"
        slotName: media

    - node:
        uri: global.subcomponent.card-content
      relation:
        cardinality: "1..1"
        slotName: default

    - node:
        uri: global.subcomponent.card-footer
      relation:
        cardinality: "0..1"
        slotName: footer
```

## Further Work

The following features would require additional work to this specification:

- Representation of related nodes displayed in portals
- Representation of conditional display
- Inheritance reference for styles (e.g., "NetworkCard" inherits the styles from "Card")

## References

Two main references have supported our reflection:

1. The work of the [Open UI W3C Working Group](https://open-ui.org/), which takes interest in a code-based anatomy for their specifications ([Example](https://open-ui.org/components/accordion.explainer/))
2. The work of Nathan Curtis, exploring a similar syntax in his article "[Components as Data](https://medium.com/@nathanacurtis/components-as-data-2be178777f21)"
