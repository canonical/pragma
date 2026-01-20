# Audit From Ontology

Audit existing component implementations against their design system ontology definitions. This skill systematically compares implementation code with DSL specifications to identify compliance gaps, missing features, and alignment issues.

## Description

The Audit From Ontology skill performs **compliance verification** between:
1. **Design System Ontology**: The authoritative DSL specifications for components
2. **Implementation Code**: Existing React/Svelte components in the codebase

This skill is complementary to `component-from-ontology`:
- `component-from-ontology`: Generate new components FROM ontology
- `audit-from-ontology`: Verify existing components AGAINST ontology

> **Critical Principle**: The DSL is the single source of truth. This audit does NOT evaluate code quality—it evaluates DSL fidelity. A well-written component that deviates from its DSL is non-compliant.

## When to Use

Use this skill when:
- Auditing existing components for DSL compliance
- Preparing a migration plan to align components with updated DSL
- Reviewing PRs that modify design system components
- Generating compliance reports for design system governance
- Identifying gaps between specification and implementation

## Required Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| **components** | Yes | Component name(s) to audit | `Button`, `Card`, `Accordion, Button, Card` |
| **directory** | Yes | Implementation directory to audit | `packages/react/ds-global/src/lib` |
| **tier** | No (default: global) | DSL tier to query | `global`, `core`, `apps` |
| **outputFormat** | No (default: markdown) | Report format | `markdown`, `json`, `summary` |

### Component Selection

**Automatic subcomponent inclusion**: When auditing a parent component, ALL subcomponents are automatically included.

```
# These are equivalent:
Audit: Card
Audit: Card, Card.Header, Card.Content, Card.Image

# Explicit selection still works:
Audit: Card.Header  (only audits the subcomponent)
```

### Example Prompts

```
Audit Button in packages/react/ds-global/src/lib
```

```
Audit Card, Accordion, Timeline in packages/react/ds-global/src/lib
```

```
Comprehensive audit of all global tier components in ds-global
```

## Audit Dimensions

Each component is evaluated across five dimensions:

### 1. Existence Check

| Status | Meaning |
|--------|---------|
| **EXISTS** | Component has implementation files |
| **MISSING** | Component has DSL but no implementation |
| **EXTRA** | Component exists but has no DSL |

### 2. Structure Compliance

Verifies implementation structure matches DSL anatomy:

- **Root element** matches DSL node type
- **Subcomponents** match DSL-defined subcomponents (not more, not fewer)
- **Folder structure** follows conventions (`common/` for subcomponents)

### 3. DOM Order Compliance

**Critical**: Verifies JSX child order matches DSL edge array order.

```yaml
# DSL specifies:
edges:
  - node: {role: control}   # edges[0]
  - node: {role: heading}   # edges[1]
```

```tsx
// Implementation MUST render in this order:
<control />   {/* first */}
<heading />   {/* second */}
```

### 4. Slot/Prop Compliance

Verifies props match DSL slots:

| DSL Specification | Expected Implementation |
|-------------------|-------------------------|
| `slotName: default` | `children` prop |
| `slotName: header` | `header` prop |
| `cardinality: "1"` | Required prop |
| `cardinality: "0..1"` | Optional prop (`prop?`) |
| `cardinality: "1..*"` | Required, accepts multiple |
| `cardinality: "0..*"` | Optional, accepts multiple |

### 5. Style Compliance

Verifies CSS implements DSL styles:

| DSL Style | Expected CSS |
|-----------|--------------|
| `layout.type: stack` | `display: flex; flex-direction: column` |
| `layout.type: flow` | `display: flex; flex-direction: row` |
| `layout.direction: vertical` | `flex-direction: column` |
| `layout.direction: horizontal` | `flex-direction: row` |
| `layout.align: center` | `align-items: center` |
| `layout.justify: space-between` | `justify-content: space-between` |
| `interaction.cursor: pointer` | `cursor: pointer` |
| `appearance.radius: radius/X` | `border-radius: var(--radius-X)` |

## Workflow

### Step 1: Parse Component List

Extract component names from user prompt. Identify parent components vs subcomponents.

### Step 2: Query Ontology for Each Component

```sparql
SELECT ?uri ?name ?anatomyDsl ?tier ?type WHERE {
  ?uri dso:name ?name .
  OPTIONAL { ?uri dso:anatomyDsl ?anatomyDsl }
  OPTIONAL { ?uri dso:tier ?tier }
  OPTIONAL { ?uri a ?type }
  FILTER(CONTAINS(LCASE(?name), "{component-name}"))
}
```

Also check for Pattern type (some components like Timeline, Breadcrumbs are patterns):

```sparql
?uri a dso:Pattern
```

### Step 3: Resolve Subcomponents

For each parent component, find all subcomponents:

```sparql
SELECT ?name ?anatomyDsl WHERE {
  ?sub a dso:Subcomponent ;
       dso:name ?name .
  FILTER(STRSTARTS(?name, "{ParentName}."))
  OPTIONAL { ?sub dso:anatomyDsl ?anatomyDsl }
}
```

### Step 4: Locate Implementation Files

For each component, find implementation at:

```
{directory}/{ComponentName}/
├── {ComponentName}.tsx
├── types.ts
├── styles.css
├── index.ts
└── common/
    └── {SubName}/
        ├── {SubName}.tsx
        ├── types.ts
        └── styles.css
```

### Step 5: Parse DSL Anatomy

Extract structured anatomy from DSL YAML:

```
Root: {uri}
  styles: {style.key}={value}, ...

  edges[0]: {role/uri}, cardinality={X}, slotName={Y}
    styles: ...
    edges[0]: ...
    edges[1]: ...
  edges[1]: ...
```

### Step 6: Parse Implementation

Read and extract from implementation files:

**From types.ts:**
- Interface name
- Prop names and types
- Required vs optional (`prop` vs `prop?`)
- Extends clause (HTMLAttributes, etc.)

**From Component.tsx:**
- JSX structure
- Child element order
- Class names
- Prop usage

**From styles.css:**
- CSS properties
- Variable usage
- Selector patterns

### Step 7: Compare and Score

For each audit dimension, produce:

| Check | DSL Expectation | Implementation | Status |
|-------|-----------------|----------------|--------|
| {check} | {expected} | {actual} | PASS/FAIL/PARTIAL |

### Step 8: Generate Report

Produce audit report with:
- Executive summary table
- Per-component detailed findings
- Severity ratings
- Recommended fixes
- Priority ordering

## Severity Ratings

| Severity | Criteria | Examples |
|----------|----------|----------|
| **CRITICAL** | DSL violation that breaks semantics | Wrong DOM order, missing required slot |
| **HIGH** | Missing DSL-defined feature | Missing subcomponent, missing slot |
| **MEDIUM** | Partial implementation | Incomplete styles, wrong cardinality |
| **LOW** | Minor deviation | Token naming, CSS property mismatch |
| **INFO** | Not a violation | Extra features not in DSL |

## Response Template

```markdown
# DSL Compliance Audit Report

**Generated**: {date}
**Scope**: {directory}
**Components Audited**: {count}

---

## Executive Summary

| Component | Status | Severity | Summary |
|-----------|--------|----------|---------|
| {name} | {COMPLIANT/NON-COMPLIANT/MISSING/PARTIAL} | {severity} | {one-line} |

---

## Detailed Audits

### {ComponentName}

**DSL URI**: `{uri}`
**Implementation**: `{path}` or NOT IMPLEMENTED
**Status**: {status}

#### DSL Specification

```yaml
{anatomy DSL}
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| {requirement} | {expected} | {actual} | PASS/FAIL |

#### DOM Order Verification

```
Expected (from DSL):          Actual (from JSX):
{tree}                        {tree}
```

**Status**: PASS/FAIL - {explanation if fail}

#### Prop/Slot Verification

| DSL Slot | Cardinality | Expected Prop | Actual Prop | Status |
|----------|-------------|---------------|-------------|--------|
| {slot} | {card} | {expected} | {actual} | PASS/FAIL |

#### Style Verification

| DSL Style | Expected CSS | Actual CSS | Status |
|-----------|--------------|------------|--------|
| {style} | {expected} | {actual} | PASS/FAIL |

#### Issues Found

1. **{severity}**: {description}
   - DSL: {what DSL says}
   - Actual: {what implementation does}
   - Fix: {recommended fix}

#### Recommended Changes

```typescript
// {description of change}
{code snippet}
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total audited | {n} |
| Fully compliant | {n} ({%}) |
| Partial compliance | {n} ({%}) |
| Non-compliant | {n} ({%}) |
| Missing | {n} ({%}) |

---

## Priority Order

### Immediate (Critical/High)

1. **{Component}** - {reason}

### Short-term (Medium)

2. **{Component}** - {reason}

### Long-term (Low)

3. **{Component}** - {reason}
```

## Output Formats

### markdown (default)

Full report as shown in template above.

### summary

Abbreviated output:

```markdown
## Audit Summary: {scope}

| Component | Status | Issues |
|-----------|--------|--------|
| Button | NON-COMPLIANT | Missing icon slot, wrong layout |
| Card | NON-COMPLIANT | Wrong subcomponents |
| Accordion | COMPLIANT | - |

**Action Items**: 3 critical, 2 high, 1 medium
```

### json

Machine-readable output:

```json
{
  "generated": "2026-01-20",
  "scope": "packages/react/ds-global/src/lib",
  "components": [
    {
      "name": "Button",
      "dslUri": "global.component.button",
      "status": "NON_COMPLIANT",
      "severity": "HIGH",
      "issues": [
        {
          "type": "MISSING_SLOT",
          "severity": "HIGH",
          "dslExpected": "icon slot (cardinality: 0..1)",
          "actual": "not present",
          "fix": "Add icon prop"
        }
      ]
    }
  ],
  "summary": {
    "total": 5,
    "compliant": 1,
    "nonCompliant": 3,
    "missing": 1
  }
}
```

## Comparison Tables

### Layout Mapping

| DSL | CSS |
|-----|-----|
| `layout.type: stack` | `display: flex` |
| `layout.type: flow` | `display: flex` or `display: inline-flex` |
| `layout.direction: vertical` | `flex-direction: column` |
| `layout.direction: horizontal` | `flex-direction: row` |
| `layout.align: center` | `align-items: center` |
| `layout.align: start` | `align-items: flex-start` |
| `layout.justify: center` | `justify-content: center` |
| `layout.justify: space-between` | `justify-content: space-between` |
| `layout.display: inline` | `display: inline` |
| `layout.display: inline-block` | `display: inline-block` |
| `layout.overflow: hidden` | `overflow: hidden` |

### Cardinality Mapping

| DSL Cardinality | TypeScript |
|-----------------|------------|
| `"1"` | `propName: Type` (required) |
| `"0..1"` | `propName?: Type` (optional) |
| `"1..*"` | `propName: Type[]` or `children` (required array) |
| `"0..*"` | `propName?: Type[]` or `children` (optional array) |

### Slot Mapping

| DSL SlotName | React Prop |
|--------------|------------|
| `default` | `children` |
| `header` | `header` |
| `icon` | `icon` |
| `actions` | `actions` |
| `media` | `media` |
| `{name}` | `{name}` |

## Common Issues

### 1. Wrong DOM Order

**Symptom**: Elements render in different order than DSL specifies

**Audit Check**:
```
DSL edges: [control, heading]
JSX order: [heading, control]  ← WRONG
```

**Fix**: Reorder JSX children to match edge array order

### 2. Missing Slot

**Symptom**: DSL defines slot, implementation lacks prop

**Audit Check**:
```
DSL: slotName="icon", cardinality="0..1"
Props: no `icon` prop  ← MISSING
```

**Fix**: Add prop to interface and render in JSX

### 3. Wrong Subcomponents

**Symptom**: Implementation has different subcomponents than DSL

**Audit Check**:
```
DSL defines: Card.Header, Card.Content, Card.Image
Impl has: Card.Section, Card.ThumbnailSection, Card.Image  ← WRONG
```

**Fix**: Replace non-DSL subcomponents with DSL-defined ones

### 4. Wrong Layout Type

**Symptom**: CSS uses different layout model than DSL

**Audit Check**:
```
DSL: layout.type=flow  → expect display: flex
CSS: display: inline-block  ← WRONG
```

**Fix**: Change CSS to match DSL layout type

### 5. Wrong Cardinality

**Symptom**: Prop required/optional status doesn't match DSL

**Audit Check**:
```
DSL: cardinality="1" (required)
Props: heading?: ReactNode  ← WRONG (should be required)
```

**Fix**: Change prop to required in interface

### 6. Extra Features

**Symptom**: Implementation has features not in DSL

**Audit Check**:
```
DSL: no leadingIcon defined
Props: leadingIcon?: ReactNode  ← EXTRA
```

**Severity**: INFO (not a violation, but noted)

**Fix**: Remove or document as extension

## Querying Multiple Component Types

Components may be defined as different types in the ontology:

| Type | Query |
|------|-------|
| `dso:Component` | Standard components (Button, Card, Icon) |
| `dso:Subcomponent` | Child components (Card.Header, Accordion.Item) |
| `dso:Pattern` | Composite patterns (Timeline, Breadcrumbs) |

Always query all types when searching:

```sparql
SELECT ?uri ?name ?anatomyDsl ?type WHERE {
  ?uri dso:name ?name .
  ?uri a ?type .
  FILTER(?type IN (dso:Component, dso:Subcomponent, dso:Pattern))
  OPTIONAL { ?uri dso:anatomyDsl ?anatomyDsl }
  FILTER(CONTAINS(LCASE(?name), "{search}"))
}
```

## Tips

1. **Query before auditing**: Always retrieve full DSL before analyzing code
2. **Check all types**: Components may be Component, Subcomponent, or Pattern
3. **Include subcomponents**: Automatically include all subcomponents of parent
4. **Verify DOM order first**: Most common error is wrong child order
5. **Check cardinality carefully**: Required vs optional is often wrong
6. **Look at CSS layout**: Layout type mismatches are common
7. **Document extras**: Note implementation features not in DSL
8. **Prioritize by severity**: Critical issues first
9. **Generate actionable fixes**: Include code snippets for fixes
10. **Track with todos**: Use TodoWrite for multi-component audits

## TSDoc Documentation

Component TSDoc must use the description from the design system ontology. Stories serve as examples, so the component TSDoc should NOT include `@example` blocks.

### Querying DSL Description

```sparql
SELECT ?description WHERE {
  ?uri dso:name "{ComponentName}" .
  ?uri dso:description ?description .
}
```

### TSDoc Format

```typescript
/**
 * {Description from DSL ontology - copied verbatim}
 *
 * @implements dso:{uri}
 */
const Component = ({ ... }: ComponentProps) => { ... };
```

### What NOT to Include

- `@example` blocks (stories fulfill this role)
- Implementation details
- Custom descriptions that deviate from DSL

### Example

**DSL Query Result:**
```
description: "The label component is a compact, non-interactive visual element used to
categorize content or indicate a status. Its primary role is metadata visualization.
While it has similar visual properties to the Chip, it is purely informational and
does not trigger actions or allow for removal."
```

**Correct TSDoc:**
```typescript
/**
 * The label component is a compact, non-interactive visual element used to
 * categorize content or indicate a status. Its primary role is metadata
 * visualization. While it has similar visual properties to the Chip, it is
 * purely informational and does not trigger actions or allow for removal.
 *
 * @implements dso:global.component.label
 */
const Label = ({ ... }: LabelProps) => { ... };
```

**Incorrect TSDoc:**
```typescript
/**
 * Label component  // Bad: Custom title, not from DSL
 *
 * A compact visual element for status indication.  // Bad: Paraphrased, not verbatim
 *
 * @implements dso:global.component.label
 *
 * @example  // Bad: Examples belong in stories
 * ```tsx
 * <Label>Default</Label>
 * <Label criticality="warning">Warning</Label>
 * ```
 */
const Label = ({ ... }: LabelProps) => { ... };
```

## Limitations

- Cannot audit behavior (only structure, not runtime)
- Cannot verify CSS variable values exist in token system
- Cannot audit accessibility beyond ARIA presence
- Does not validate test coverage
- Does not check Storybook story completeness

## Related Skills

- **component-from-ontology**: Generate new components from DSL
- **anatomy-author**: Create/update component anatomy DSL
- **design-auditor**: Higher-level design system coverage analysis

## Example Session

**User**: Audit Button, Card in packages/react/ds-global/src/lib

**Assistant**:

### Step 1: Query Ontology

```
sem_sparql: SELECT components with name matching "button" or "card"
```

Found:
- `global.component.button` (Component)
- `global.component.card` (Component)
- `global.subcomponent.card-header` (Subcomponent)
- `global.subcomponent.card-content` (Subcomponent)
- `global.subcomponent.card-image` (Subcomponent)

### Step 2: Read Implementation Files

Reading:
- `/src/lib/Button/Button.tsx`
- `/src/lib/Button/types.ts`
- `/src/lib/Button/styles.css`
- `/src/lib/Card/Card.tsx`
- `/src/lib/Card/types.ts`
- `/src/lib/Card/styles.css`
- `/src/lib/Card/common/*/`

### Step 3: Parse DSL and Implementation

**Button DSL**:
```
Root: global.component.button
  styles: layout.type=flow, layout.direction=horizontal, layout.align=center, layout.justify=center
  edges[0]: role="icon", cardinality="0..1", slotName="icon"
  edges[1]: role="label", cardinality="0..1", slotName="default"
```

**Button Implementation**:
- CSS: `display: inline-block` (not flex)
- Props: `children` only (no `icon`)
- JSX: `{children}` only

### Step 4: Generate Compliance Report

```markdown
# Audit Report

## Button

**Status**: NON-COMPLIANT

| Check | DSL | Actual | Status |
|-------|-----|--------|--------|
| layout.type | flow | inline-block | FAIL |
| edges[0] icon | slotName: icon | not present | FAIL |
| edges[1] label | slotName: default | children | PASS |

**Issues**:
1. CRITICAL: Missing icon slot
2. HIGH: Wrong layout (should be flex, not inline-block)
```

(continues for Card...)
