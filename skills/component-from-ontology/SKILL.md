# Component From Ontology

Generate framework-specific component implementations from design system ontology definitions. This skill queries component anatomy from the design system graph, retrieves applicable code standards, and produces compliant implementation code.

## Description

The Component From Ontology skill is a **mixed skill** combining:
1. **Semantic discovery**: Query the design system ontology for component anatomy (structure, slots, styles)
2. **Standards lookup**: Query the `code-standards` package for all applicable coding standards
3. **Procedural generation**: Produce implementation code following both the anatomy DSL and code standards

This skill bridges the design system specification layer (ontology) with the implementation layer (actual source code), ensuring components are structurally correct according to the DSL and stylistically correct according to code standards.

> **Critical Principle**: The DSL is the single source of truth. Every aspect of the DSL—including edge order, cardinality, styles, and naming—must be faithfully translated to implementation. Do not rely on assumptions, prior experience with similar components, or existing code patterns. Always verify against the DSL.

**Why this skill?** The Summon CLI generator requires TTY mode and doesn't integrate with semantic knowledge. This skill provides LLM-guided generation that:
- Works in non-interactive environments (Claude Code, CI)
- Integrates with design system ontology
- Applies project-specific code standards from semantic MCP
- Handles compound components with subcomponents

## When to Use

Use this skill when:
- Creating a new component from an existing ontology definition
- Implementing a component that must match its DSL anatomy specification
- Generating framework-specific code (React, Svelte, etc.) from design system specs
- Ensuring code follows both structural (DSL) and stylistic (code standards) requirements
- Working in non-interactive environments where Summon CLI isn't viable

## Required Parameters

When invoking this skill, the user prompt must specify:

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| **component** | Yes | Component name in the ontology | `Accordion`, `Button`, `Card` |
| **directory** | Yes | Target directory or package for output | `packages/react/ds-global/src/lib` |
| **framework** | Yes | Target framework | `react`, `svelte` |
| **useCodeStandards** | No (default: yes) | Whether to query and apply code standards | `yes`, `no` |

### Example Prompts

```
Create the Accordion component in packages/react/ds-global/src/lib using React
```

```
Generate Card component for packages/svelte/ds-global/src/lib framework=svelte
```

```
Build Timeline in packages/react/ds-global/src/lib (react) without code standards
```

## Prerequisites

The following sem packages should be available:

```bash
sem link design-system    # Provides dso: ontology with component anatomy
sem link code-standards   # Provides cso: ontology with code standards (optional)
```

## Discovery Flow

### Step 1: Query Component Existence

First, find the component in the design system ontology:

```
sem_lookup(type: "dso:Component", filters: {"dso:name": "{ComponentName}"})
```

Or query directly if you know the URI pattern:

```
sem_context(node: "ds:global.component.{component-name}", depth: 2)
```

### Step 2: Retrieve Anatomy DSL

Query the full anatomy specification:

```sparql
PREFIX dso: <http://pragma.canonical.com/dso#>
PREFIX ds: <http://pragma.canonical.com/ds#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?component ?name ?anatomyDsl WHERE {
    ?component a dso:Component ;
               dso:name ?name ;
               dso:anatomyDsl ?anatomyDsl .
    FILTER(CONTAINS(LCASE(?name), "{component-name}"))
}
```

### Step 3: Query Subcomponents

Find all subcomponents for compound components:

```sparql
PREFIX dso: <http://pragma.canonical.com/dso#>
PREFIX ds: <http://pragma.canonical.com/ds#>

SELECT ?sub ?name ?anatomyDsl WHERE {
    ?sub a dso:Subcomponent ;
         dso:name ?name ;
         dso:parentComponent ds:global.component.{parent} .
    OPTIONAL { ?sub dso:anatomyDsl ?anatomyDsl }
}
```

### Step 4: Query Code Standards (if enabled)

Query ALL applicable code standards categories:

```sparql
PREFIX cso: <http://pragma.canonical.com/codestandards#>

SELECT ?name ?description ?dos ?donts WHERE {
    ?standard a cso:CodeStandard ;
              cso:name ?name ;
              cso:description ?description .
    OPTIONAL { ?standard cso:dos ?dos }
    OPTIONAL { ?standard cso:donts ?donts }
}
ORDER BY ?name
```

**Available code standard categories:**
- `react/*` - React component patterns (structure, props, hooks, naming)
- `css/*` - CSS selectors, namespacing, states, encapsulation
- `storybook/*` - Storybook story conventions
- `styling/*` - Design tokens, theming
- `code/*` - General code patterns
- `icons/*` - Icon usage
- `rust/*` - Rust-specific (if generating Rust)

Filter by category as needed:

```sparql
FILTER(STRSTARTS(?name, "react/") || STRSTARTS(?name, "css/") || STRSTARTS(?name, "storybook/"))
```

## Anatomy DSL Reference

The anatomy DSL (from the `anatomy-author` skill) represents component structure as YAML trees.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Named Node** | Component with URI, user-instantiable (`uri: global.component.button`) |
| **Anonymous Node** | Structural element with role, not instantiable (`role: "content wrapper"`) |
| **Edge** | Parent-child relationship with cardinality and slot name |
| **Edge Order** | **Array index determines DOM order** in flow/stack layouts (see below) |
| **Styles** | Platform-agnostic properties using CTI-inspired keys |

### Edge Order is Semantically Meaningful

**This is critical**: The order of edges in the `edges` array defines the DOM rendering order. In a `layout.type: flow` (horizontal) or `layout.type: stack` (vertical) container, children appear in the DOM in the same order they appear in the edges array.

```yaml
# DSL specifies: control FIRST, then heading
edges:
  - node:
      role: control       # index 0 → first in DOM
    relation:
      cardinality: "1"
  - node:
      role: heading       # index 1 → second in DOM
    relation:
      cardinality: "1"
```

**Correct implementation:**
```tsx
<button className="header">
  <span className="control" />   {/* index 0 */}
  <span className="heading" />   {/* index 1 */}
</button>
```

**Incorrect implementation (DO NOT DO THIS):**
```tsx
<button className="header">
  <span className="heading" />   {/* WRONG: heading before control */}
  <span className="control" />
</button>
```

> **Common mistake**: Assuming visual conventions (e.g., "chevrons go on the right") override DSL order. The DSL is authoritative—if it specifies control before heading, implement control before heading, regardless of what "typical" accordions look like.

### URI Encoding Convention

URIs follow turtle conventions with dot-separated paths: `tier.type.name`

| Symbol | Meaning | Example |
|--------|---------|---------|
| `.` | Path hierarchy | `global.component.button` |
| `_` | Word boundary from PascalCase | `CardHeader` → `card_header` |
| `-` | Dot in compound names | `Card.Header` → `card-header` |

**Examples:**

| Component | URI |
|-----------|-----|
| `Button` | `global.component.button` |
| `Accordion.Item` | `global.subcomponent.accordion-item` |
| `CardHeader` | `global.subcomponent.card_header` |

### Cardinality Notation

| Notation | Meaning | React Mapping |
|----------|---------|---------------|
| `"1"` or `"1..1"` | Exactly one (required) | Required prop |
| `"0..1"` | Zero or one (optional) | Optional prop (`prop?: Type`) |
| `"0..*"` | Zero or more | Array prop or `children` |
| `"1..*"` | One or more | Non-empty array or `children` |

### Style Key Categories

Styles use CTI-inspired dot-notation: `category.type[.item]`

#### Layout (typically invariant)
```yaml
layout.type: stack | flow | grid
layout.direction: horizontal | vertical
layout.align: start | center | end | stretch
layout.justify: start | center | end | space-between | space-around
```

#### Spacing (themeable via tokens)
```yaml
spacing.internal: spacing/medium    # padding
spacing.gap: spacing/small          # gap between children
```

#### Appearance (themeable)
```yaml
appearance.background: color/surface/card
appearance.border: border/style/default
appearance.shadow: shadow/elevated/medium
```

#### Typography (themeable)
```yaml
typography.size: font/size/body
typography.weight: font/weight/bold
typography.color: color/text/primary
```

#### Interaction (typically invariant)
```yaml
interaction.cursor: pointer | default
interaction.transition.property: background
interaction.transition.duration: transition/duration
```

## DSL to Implementation Mapping

### Edges to Props/Children

| DSL Edge | React Mapping |
|----------|---------------|
| `cardinality: "1"` | Required prop |
| `cardinality: "0..1"` | Optional prop (`prop?: Type`) |
| `cardinality: "0..*"` or `"1..*"` | Array prop or `children` |
| `slotName: "default"` | `children` prop |
| `slotName: "header"` | Named prop (`header: ReactNode`) |
| `slotName: "icon"` | Named prop (`icon?: ReactNode`) |

### Edges to DOM Order

The `edges` array is an **ordered list**. Each edge's array index maps directly to DOM sibling order:

| Edge Index | DOM Position |
|------------|--------------|
| `edges[0]` | First child in container |
| `edges[1]` | Second child in container |
| `edges[n]` | (n+1)th child in container |

**When generating JSX**, iterate the edges array in order and emit children in that order:

```typescript
// Given DSL edges: [control, heading, actions]
// Generate JSX in EXACTLY that order:
return (
  <div className="container">
    {/* edges[0]: control */}
    <span className="control">{controlContent}</span>
    {/* edges[1]: heading */}
    <span className="heading">{heading}</span>
    {/* edges[2]: actions */}
    {actions && <span className="actions">{actions}</span>}
  </div>
);
```

### Styles to CSS

| DSL Style | CSS Property |
|-----------|--------------|
| `layout.type: stack` | `display: flex; flex-direction: column` |
| `layout.type: flow` | `display: flex; flex-direction: row` |
| `layout.direction: vertical` | `flex-direction: column` |
| `layout.direction: horizontal` | `flex-direction: row` |
| `layout.align: center` | `align-items: center` |
| `layout.justify: space-between` | `justify-content: space-between` |
| `spacing.internal: spacing/medium` | `padding: var(--spacing-medium)` |
| `spacing.gap: spacing/small` | `gap: var(--spacing-small)` |
| `appearance.background: color/surface/X` | `background: var(--color-surface-X)` |
| `appearance.border: border/style/X` | `border: var(--border-style-X)` |
| `typography.weight: font/weight/semibold` | `font-weight: var(--font-weight-semibold)` |
| `interaction.cursor: pointer` | `cursor: pointer` |

### Token Path to CSS Variable

Token paths use `/` delimiter. Convert to CSS variables:

```
spacing/medium → var(--spacing-medium)
color/surface/card → var(--color-surface-card)
font/weight/semibold → var(--font-weight-semibold)
```

## Code Standards Checklist

When `useCodeStandards` is enabled, ensure compliance with these standards (queried from sem MCP):

### React Standards

| Standard | Requirement |
|----------|-------------|
| `react/component/structure/folder` | Component in own folder with all related files |
| `react/component/barrel-exports` | `index.ts` re-exports all public APIs |
| `react/component/file-naming` | Component-prefixed files (`Button.tsx`, `Button.test.tsx`) |
| `react/component/props` | Props documented, destructured, spread to root |
| `react/component/props/html-rendering` | Extend HTML element props interface |
| `react/component/class-name-construction` | Array construction with filter/join |
| `react/component/subcomponent-export-api` | Dot notation for public subcomponents |
| `react/component/dependencies` | Subcomponents in `common/` folder |

### CSS Standards

| Standard | Requirement |
|----------|-------------|
| `css/selectors/namespace` | All selectors prefixed with `.ds` |
| `css/selectors/specificity` | `.ds.component` for root, `.ds.component .element` for children |
| `css/selectors/naming-convention` | kebab-case class names |
| `css/selectors/semantics` | Semantic class names (purpose, not appearance) |
| `css/component/states` | Attribute selectors for native states |
| `css/component/encapsulation` | All styles scoped to component namespace |
| `css/properties/values` | Design tokens for themeable, raw for structural |

### Import Extensions

> **Note**: This project uses `.js` extensions in TypeScript imports (e.g., `import type { Props } from "./types.js"`). This is intentional and follows Node ESM resolution semantics with the minimal tsconfig configuration.

## Workflow

### 1. Parse User Request

Extract from the user prompt:
- Component name (required)
- Target directory (required)
- Framework (required)
- Code standards flag (default: yes)

### 2. Query Design System Ontology

```
sem_lookup(type: "dso:Component", filters: {"dso:name": "{ComponentName}"})
sem_context(node: "ds:global.component.{name}", depth: 2)
```

Extract:
- Component anatomy DSL (YAML structure)
- Subcomponents if compound component
- Modifier families that apply

### 3. Parse Anatomy DSL (Structured Extraction)

From the YAML anatomy specification, extract into a structured checklist:

**For each node (root and nested):**
- [ ] Node identifier (URI or role)
- [ ] All style properties

**For each edges array, create an ordered list:**
```
edges[0]: {role/uri}, cardinality={X}, slotName={Y}
edges[1]: {role/uri}, cardinality={X}, slotName={Y}
...
```

**Example extraction for Accordion.Item:**
```
Root: global.subcomponent.accordion-item
  styles: layout.type=stack, layout.direction=vertical

  edges[0]: role="header tab", cardinality="1", slotName="header"
    styles: layout.type=flow, layout.direction=horizontal, layout.align=center, interaction.cursor=pointer

    edges[0]: role="control", cardinality="1"
      styles: size.width=size/icon/small, size.height=size/icon/small
    edges[1]: role="heading", cardinality="1", slotName="default"

  edges[1]: role="content panel", cardinality="1", slotName="default"
    styles: layout.overflow=hidden
```

This structured extraction makes edge order explicit and prevents accidental reordering during implementation.

### 4. Query Code Standards (if enabled)

```
sem_sparql(query: "... WHERE { ?standard a cso:CodeStandard ... }")
```

Extract:
- `cso:dos` examples as implementation templates
- `cso:donts` as anti-patterns to avoid
- `cso:description` for requirements

### 5. Generate File Structure

Based on standards (`react/component/structure/folder`):

```
{ComponentName}/
├── {ComponentName}.tsx          # Main component
├── {ComponentName}.test.tsx     # Unit tests
├── {ComponentName}.ssr.test.tsx # SSR tests
├── {ComponentName}.stories.tsx  # Storybook stories
├── index.ts                     # Barrel exports
├── types.ts                     # TypeScript types
├── styles.css                   # Component styles
└── common/                      # Subcomponents (if compound)
    └── {SubName}/
        ├── {SubName}.tsx
        ├── index.ts
        ├── types.ts
        └── styles.css
```

### 6. Generate Types

From anatomy edges, generate TypeScript interfaces:

```typescript
/**
 * Props for {ComponentName}
 * @implements dso:global.component.{name}
 */
export interface {ComponentName}Props extends HTMLAttributes<HTMLDivElement> {
  /**
   * {Description from DSL slot}
   * Maps to DSL slot: {slotName} (cardinality: {cardinality})
   */
  {propName}: ReactNode;  // cardinality "1"
  {propName}?: ReactNode; // cardinality "0..1"
  children: ReactElement<{SubProps}> | ReactElement<{SubProps}>[]; // cardinality "1..*"
}
```

### 7. Generate Component Implementation

Following `react/component/props` and `react/component/class-name-construction`:

```typescript
import type { {ComponentName}Props } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds {component-name}";

const {ComponentName} = ({
  {propName},
  className,
  children,
  ...props
}: {ComponentName}Props): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* DSL slot: {slotName} */}
      {propName && <div className="{slot-class}">{propName}</div>}
      {children}
    </div>
  );
};

export default {ComponentName};
```

### 8. Generate CSS

From anatomy styles, map to CSS with DSL comments:

```css
/**
 * {ComponentName} styles
 * @implements dso:global.component.{name}
 *
 * DSL anatomy mapping:
 * - layout.type: {value} -> {css-property}: {css-value}
 * - appearance.X: {token} -> {css-property}: var(--{token})
 */
.ds.{component-name} {
  /* layout.type: stack, layout.direction: vertical */
  display: flex;
  flex-direction: column;

  /* appearance.border: border/style/container */
  border: var(--border-style-container, 1px solid var(--color-border));
}
```

### 9. Generate Tests

Create tests covering:
- Basic rendering
- Props pass-through
- Accessibility attributes
- Keyboard interaction (if interactive)
- SSR compatibility

### 10. Generate Stories

Create Storybook stories demonstrating:
- Default usage
- All prop variations
- With/without optional slots
- Compound component composition

### 11. Generate Barrel Export

Following `react/component/barrel-exports`:

```typescript
export { default as {ComponentName} } from "./{ComponentName}.js";
export type * from "./types.js";
```

### 12. Attach Subcomponents (if compound)

Following `react/component/subcomponent-export-api`:

```typescript
import {SubName} from "./common/{SubName}/index.js";

const {ComponentName} = (/* ... */) => { /* ... */ };

{ComponentName}.{SubName} = {SubName};

export default {ComponentName};
```

### 13. Verify DSL Compliance (REQUIRED)

**Before presenting generated code**, perform this verification checklist. This step is mandatory—do not skip it.

#### DOM Order Verification

For each component/subcomponent with edges, verify the JSX child order matches the DSL edge order:

```
DSL edges[0]: {identifier} → JSX first child: {element} ✓/✗
DSL edges[1]: {identifier} → JSX second child: {element} ✓/✗
...
```

**Example verification for Accordion.Item header:**
```
DSL: header tab > edges[0]=control, edges[1]=heading
JSX: <button>
       <span className="control" />   ← edges[0] ✓
       <span className="heading" />   ← edges[1] ✓
     </button>
```

#### Prop/Slot Verification

| DSL Slot | Cardinality | Prop Name | Required? | Verified |
|----------|-------------|-----------|-----------|----------|
| {slot}   | {card}      | {prop}    | {yes/no}  | ✓/✗      |

#### Style Verification

| DSL Style | CSS Property | Value | Verified |
|-----------|--------------|-------|----------|
| {style}   | {property}   | {val} | ✓/✗      |

#### Naming Verification

| DSL Role/URI | Implementation Name | Match? |
|--------------|---------------------|--------|
| `role: control` | `.accordion-item-control` or `control` | ✓/✗ |
| `role: heading` | `.accordion-item-heading` or `heading` | ✓/✗ |

> **If any verification fails**: Fix the implementation before presenting. Do not present code that fails verification.

## Response Template

When generating a component, respond with:

```markdown
## Component Generation: {ComponentName}

### Ontology Source

**Component URI:** `ds:global.component.{name}`
**Anatomy DSL:** Retrieved from `dso:anatomyDsl`
**Subcomponents:** {list or "None"}
**Modifier Families:** {list or "None"}

### Anatomy Structure

{Summarize the DSL structure: root node, edges, slots, cardinality}

### Code Standards Applied

| Standard | Status | Notes |
|----------|--------|-------|
| `react/component/structure/folder` | Applied | Component folder with all files |
| `react/component/props` | Applied | Props documented and destructured |
| `css/selectors/namespace` | Applied | `.ds.{name}` prefix |
| ... | ... | ... |

### Generated Files

#### {ComponentName}/types.ts
```typescript
{types code}
```

#### {ComponentName}/{ComponentName}.tsx
```typescript
{component code}
```

#### {ComponentName}/styles.css
```css
{styles code}
```

#### {ComponentName}/index.ts
```typescript
{barrel export}
```

{If compound component, include subcomponent files}

### Tests Generated

- `{ComponentName}.test.tsx` - Unit tests
- `{ComponentName}.ssr.test.tsx` - SSR tests

### Stories Generated

- `{ComponentName}.stories.tsx` - Storybook documentation

### DSL Compliance Verification

#### DOM Order Verification

| Container | DSL Edge Order | JSX Child Order | Match |
|-----------|----------------|-----------------|-------|
| `{container}` | edges[0]={X}, edges[1]={Y} | `<{X}/>, <{Y}/>` | ✓ |

#### Slot/Prop Verification

| DSL Slot | Cardinality | Prop | Required | Verified |
|----------|-------------|------|----------|----------|
| {slot} | {card} | {prop} | {y/n} | ✓ |

#### Style Verification

| DSL Style | CSS Rule | Verified |
|-----------|----------|----------|
| {style} | {rule} | ✓ |

### Compliance Summary

- **DOM Order**: All edge orders verified against JSX child order
- **Slots/Props**: All slots mapped to props with correct cardinality
- **Styles**: All DSL styles mapped to CSS
- **Code Standards**: All applicable standards followed

### Next Steps

1. Review generated code for correctness
2. Run TypeScript check: `bun run check:ts`
3. Run tests: `bun run test`
4. Update parent `lib/index.ts` to export the new component
```

## Key Queries Reference

### Find Component by Name

```sparql
PREFIX dso: <http://pragma.canonical.com/dso#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?component ?name ?tier ?anatomyDsl WHERE {
    ?component a dso:Component ;
               dso:name ?name ;
               dso:tier ?tier .
    OPTIONAL { ?component dso:anatomyDsl ?anatomyDsl }
    FILTER(CONTAINS(LCASE(?name), "{search-term}"))
}
```

### Find All Subcomponents of a Component

```sparql
PREFIX dso: <http://pragma.canonical.com/dso#>

SELECT ?sub ?name ?anatomyDsl WHERE {
    ?sub a dso:Subcomponent ;
         dso:name ?name ;
         dso:parentComponent ds:global.component.{parent} .
    OPTIONAL { ?sub dso:anatomyDsl ?anatomyDsl }
}
```

### Get Modifier Families for Component

```sparql
PREFIX dso: <http://pragma.canonical.com/dso#>

SELECT ?modifier ?family ?name WHERE {
    ds:global.component.{component} dso:hasModifier ?modifier .
    ?modifier dso:modifierFamily ?family ;
              dso:name ?name .
}
```

### Get All Code Standards (All Categories)

```sparql
PREFIX cso: <http://pragma.canonical.com/codestandards#>

SELECT ?name ?description ?dos ?donts WHERE {
    ?standard a cso:CodeStandard ;
              cso:name ?name ;
              cso:description ?description .
    OPTIONAL { ?standard cso:dos ?dos }
    OPTIONAL { ?standard cso:donts ?donts }
}
ORDER BY ?name
```

### Get Code Standards by Category

```sparql
PREFIX cso: <http://pragma.canonical.com/codestandards#>

SELECT ?name ?description ?dos ?donts WHERE {
    ?standard a cso:CodeStandard ;
              cso:name ?name ;
              cso:description ?description .
    OPTIONAL { ?standard cso:dos ?dos }
    OPTIONAL { ?standard cso:donts ?donts }
    FILTER(STRSTARTS(?name, "{category}/"))
}
```

Available categories: `react`, `css`, `storybook`, `styling`, `code`, `icons`, `rust`

## Tips

1. **Query before generating**: Always retrieve the full anatomy DSL before writing code
2. **Preserve edge order**: DSL edge array order = DOM child order. Never reorder based on assumptions
3. **Map all slots**: Every DSL edge with a slotName should become a prop
4. **Respect cardinality**: Required vs optional props must match DSL cardinality
5. **Document DSL mapping**: Add comments showing which DSL property maps to which code
6. **Verify subcomponents**: Compound components need subcomponent files in `common/`
7. **Test interactivity**: If DSL has `interaction.*` styles, add keyboard/click tests
8. **CSS token fallbacks**: Provide fallback values for CSS variables
9. **Follow standards exactly**: Use `cso:dos` examples as templates, avoid `cso:donts`
10. **Use `.js` extensions**: Import paths should use `.js` (Node ESM resolution)
11. **Verify before presenting**: Always run the DSL Compliance Verification checklist before showing code

## Common Mistakes to Avoid

### 1. Reordering Edges Based on Visual Assumptions

**Wrong thinking**: "Accordions typically have chevrons on the right, so I'll put heading before control"

**Correct approach**: The DSL specifies `edges[0]=control, edges[1]=heading`. Implement exactly that order, even if it differs from common UI patterns. The DSL author chose that order intentionally.

### 2. Renaming Without Checking DSL

**Wrong thinking**: "The prop should be called `title` because that's more intuitive"

**Correct approach**: If the DSL says `role: heading`, name the prop `heading`. The DSL vocabulary is authoritative.

### 3. Adding Features Not in DSL

**Wrong thinking**: "I'll add a `leadingIcon` prop because it would be useful"

**Correct approach**: Only implement what the DSL specifies. If a slot isn't in the DSL, don't add it. The design system owner can extend the DSL if needed.

### 4. Preserving Existing Code Structure When Fixing

**Wrong thinking**: "The existing code has X before Y, so I'll keep that order while renaming"

**Correct approach**: When aligning to DSL, verify EVERY aspect against the DSL, including order. Existing code may have been wrong from the start.

### 5. Skipping Verification

**Wrong thinking**: "The code compiles and tests pass, so it must be correct"

**Correct approach**: Type checks and tests verify behavior, not DSL fidelity. Always run the DSL Compliance Verification checklist.

## Limitations

- Only supports React and Svelte frameworks currently
- Does not generate complex state management (use hooks for that)
- Modifier families require manual prop implementation
- Switch constructs in DSL need manual polymorphic handling
- Cannot validate that generated CSS tokens exist in the token system
- Tests are structural, not behavioral - add behavior tests manually

## Related Skills

- **anatomy-author**: Create anatomy DSL specifications for new components
- **component-specifier**: Specify component metadata (tier, modifiers, usage guidance)
- **design-auditor**: Audit design system coverage and consistency
- **writing-documentation**: Document components following Diataxis methodology

## Related Tools

- **Summon CLI**: For simple component scaffolding without ontology integration
  - Use when: Quick scaffolding, no ontology exists, interactive mode available
  - Limitation: Requires TTY, doesn't integrate with semantic knowledge
  - See: `/packages/summon/README.md`

- **summon-component**: Summon generator for React/Svelte components
  - Use when: Standard component structure is sufficient
  - See: `/packages/summon-component/README.md`

## Example Session

**User:** Create the Accordion component in packages/react/ds-global/src/lib using React

**Assistant:**

### 1. Query Component
```
sem_lookup(type: "dso:Component", filters: {"dso:name": "Accordion"})
```

### 2. Extract Structured Anatomy

**Accordion (root):**
```
Root: global.component.accordion
  styles: layout.type=stack, layout.direction=vertical, appearance.border=border/style/container

  edges[0]: uri="global.subcomponent.accordion-item", cardinality="1..*", slotName="default"
```

**Accordion.Item (subcomponent):**
```
Root: global.subcomponent.accordion-item
  styles: layout.type=stack, layout.direction=vertical

  edges[0]: role="header tab", cardinality="1", slotName="header"
    styles: layout.type=flow, layout.direction=horizontal, layout.align=center, interaction.cursor=pointer

    edges[0]: role="control", cardinality="1"              ← FIRST in header
      styles: size.width=size/icon/small, size.height=size/icon/small
    edges[1]: role="heading", cardinality="1", slotName="default"  ← SECOND in header

  edges[1]: role="content panel", cardinality="1", slotName="default"
    styles: layout.overflow=hidden
```

### 3. Generate Implementation

Item.tsx (showing correct edge order):
```tsx
<button className="accordion-item-header">
  {/* edges[0]: control */}
  <span className="accordion-item-chevron" aria-hidden="true" />
  {/* edges[1]: heading */}
  <span className="accordion-item-heading">{heading}</span>
</button>
```

### 4. Verify DSL Compliance

#### DOM Order Verification

| Container | DSL Edge Order | JSX Child Order | Match |
|-----------|----------------|-----------------|-------|
| `accordion-item` | edges[0]=header, edges[1]=content | `<button/>, <div role="region"/>` | ✓ |
| `accordion-item-header` | edges[0]=control, edges[1]=heading | `<span.chevron/>, <span.heading/>` | ✓ |

#### Slot/Prop Verification

| DSL Slot | Cardinality | Prop | Required | Verified |
|----------|-------------|------|----------|----------|
| heading | "1" | `heading` | Yes | ✓ |
| content panel | "1" | `children` | Yes | ✓ |

### 5. Present Generated Code

(Files with verification complete...)
