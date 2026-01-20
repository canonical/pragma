# @canonical/ds-types

TypeScript types for modifier families and component props in the Pragma design system.

## Installation

```bash
bun add @canonical/ds-types
```

## Modifier Families

A modifier family is a set of related visual variants that components can support. Instead of accepting arbitrary strings for appearance props, components use modifier family types to ensure type safety and enable IDE autocomplete.

The package currently defines two modifier families:

**severity** controls intent-based colouring for communicating status or importance:
- `neutral` - Default state with no specific intent
- `positive` - Success, confirmation, or approval
- `negative` - Error, danger, or destructive actions
- `caution` - Warning or attention required
- `information` - Informational content

**emphasis** controls visual prominence:
- `neutral` - Standard presentation
- `highlighted` - Increased visual weight
- `muted` - Reduced visual weight
- `accented` - Brand or accent colouring

## Usage

Import the `ModifierFamily` type helper and use it to constrain props:

```typescript
import type { ModifierFamily } from "@canonical/ds-types";

interface ButtonProps {
  appearance?: ModifierFamily<"severity">;
}
```

The `ModifierFamily<"severity">` type resolves to the union `"neutral" | "positive" | "negative" | "caution" | "information"`. TypeScript will reject invalid values at compile time.

## Runtime Constants

The same values are available as runtime constants for cases where you need to iterate over options or validate user input:

```typescript
import { MODIFIER_FAMILIES } from "@canonical/ds-types";

// MODIFIER_FAMILIES.severity = ["neutral", "positive", "negative", "caution", "information"]
// MODIFIER_FAMILIES.emphasis = ["neutral", "highlighted", "muted", "accented"]

const isValidSeverity = (value: string): value is ModifierFamily<"severity"> =>
  MODIFIER_FAMILIES.severity.includes(value as ModifierFamily<"severity">);
```

## Design System Ontology

The modifier families defined in this package derive from the Design System Ontology. The ontology provides the authoritative specification for which modifiers exist and their semantic meaning. Changes to modifier families should originate in the ontology and propagate to this package to maintain consistency between design specifications and implementation.
