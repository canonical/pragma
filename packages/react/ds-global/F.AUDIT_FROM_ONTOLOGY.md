# DSL Compliance Audit Report

**Generated**: 2026-01-20
**Scope**: ds-global React tier
**DSL Source**: design-system ontology (global tier)

---

## Executive Summary

| Component | Status | Severity | Summary |
|-----------|--------|----------|---------|
| **Accordion** | COMPLIANT | - | Fully aligned with DSL |
| **Accordion.Item** | COMPLIANT | - | Fully aligned with DSL |
| **Button** | NON-COMPLIANT | HIGH | Missing `icon` slot, wrong layout |
| **Card** | NON-COMPLIANT | HIGH | Wrong subcomponents, missing slots |
| **Card.Header** | MISSING | HIGH | Not implemented |
| **Card.Content** | MISSING | HIGH | Not implemented |
| **Card.Image** | PARTIAL | MEDIUM | Exists but needs DSL alignment |
| **Icon** | PARTIAL | LOW | Layout mismatch |
| **Label** | MISSING | MEDIUM | Not implemented |
| **Tile** | MISSING | MEDIUM | Not implemented |
| **Tile.Header** | MISSING | MEDIUM | Not implemented |
| **Tile.Content** | MISSING | MEDIUM | Not implemented |
| **Breadcrumbs** | MISSING | MEDIUM | Not implemented |
| **Breadcrumbs.Item** | MISSING | MEDIUM | Not implemented |
| **Timeline** | MISSING | MEDIUM | Not implemented |
| **Timeline.Header** | MISSING | MEDIUM | Not implemented |
| **Timeline.Content** | MISSING | MEDIUM | Not implemented |
| **Timeline.Event** | MISSING | MEDIUM | Not implemented |
| **Timeline.Footer** | MISSING | MEDIUM | Not implemented |

---

## Detailed Audits

---

### 1. Accordion

**DSL URI**: `global.component.accordion`
**Implementation**: `/src/lib/Accordion/Accordion.tsx`
**Status**: COMPLIANT

#### DSL Specification

```yaml
node:
  uri: global.component.accordion
  styles:
    layout.type: stack
    layout.direction: vertical
    appearance.border: border/style/container
  edges:
    - node:
        uri: global.subcomponent.accordion-item
      relation:
        cardinality: "1..*"
        slotName: default
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| `layout.type: stack` | `display: flex` | `display: flex` | PASS |
| `layout.direction: vertical` | `flex-direction: column` | `flex-direction: column` | PASS |
| `appearance.border` | border styling | Present via CSS vars | PASS |
| `edges[0]: accordion-item` | `children` prop | `children: ReactElement<ItemProps>[]` | PASS |
| `cardinality: "1..*"` | Required, multiple | `children` required | PASS |
| `slotName: default` | `children` | `children` | PASS |

#### CSS Token Mapping

| DSL Token | CSS Variable | Status |
|-----------|--------------|--------|
| `border/style/container` | `--accordion-border-*` | PASS |

#### Notes
- Implementation correctly documents `@implements dso:global.component.accordion`
- CSS comments map DSL properties to CSS rules

---

### 2. Accordion.Item

**DSL URI**: `global.subcomponent.accordion-item`
**Implementation**: `/src/lib/Accordion/common/Item/Item.tsx`
**Status**: COMPLIANT

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.accordion-item
  styles:
    layout.type: stack
    layout.direction: vertical
  edges:
    - node:                          # edges[0]
        role: header tab
        styles:
          layout.type: flow
          layout.direction: horizontal
          layout.align: center
          interaction.cursor: pointer
        edges:
          - node:                    # edges[0][0] - FIRST
              role: control
              styles:
                size.width: size/icon/small
                size.height: size/icon/small
            relation:
              cardinality: "1"
          - node:                    # edges[0][1] - SECOND
              role: heading
            relation:
              cardinality: "1"
              slotName: default
      relation:
        cardinality: "1"
        slotName: header
    - node:                          # edges[1]
        role: content panel
        styles:
          layout.overflow: hidden
      relation:
        cardinality: "1"
        slotName: default
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| Root `layout.type: stack` | `display: flex` | `display: flex` | PASS |
| Root `layout.direction: vertical` | `flex-direction: column` | `flex-direction: column` | PASS |
| **Header DOM Order** | control(0), heading(1) | chevron, heading | PASS |
| Header `layout.type: flow` | `display: flex` | `display: flex` | PASS |
| Header `layout.direction: horizontal` | `flex-direction: row` | `flex-direction: row` | PASS |
| Header `layout.align: center` | `align-items: center` | `align-items: center` | PASS |
| Header `interaction.cursor: pointer` | `cursor: pointer` | `cursor: pointer` | PASS |
| Control size | `size/icon/small` | `--size-icon-small` var | PASS |
| Content `layout.overflow: hidden` | `overflow: hidden` | `overflow: hidden` | PASS |
| `heading` prop (cardinality: 1) | Required | `heading: ReactNode` (required) | PASS |
| `children` prop (cardinality: 1) | Required | `children: ReactNode` (required) | PASS |

#### DOM Structure Verification

```
Expected (from DSL edges):          Actual (from JSX):
accordion-item                      accordion-item
├── header tab                      ├── button.accordion-item-header
│   ├── [0] control (chevron)       │   ├── [0] span.accordion-item-chevron
│   └── [1] heading                 │   └── [1] span.accordion-item-heading
└── content panel                   └── div.accordion-item-content
    └── children                        └── div.accordion-item-content-inner
```

#### Notes
- Edge order CORRECT: control before heading
- Props correctly named per DSL roles
- Accessibility attributes present (aria-expanded, aria-controls)

---

### 3. Button

**DSL URI**: `global.component.button`
**Implementation**: `/src/lib/Button/Button.tsx`
**Status**: NON-COMPLIANT

#### DSL Specification

```yaml
node:
  uri: global.component.button
  styles:
    layout.type: flow
    layout.direction: horizontal
    layout.align: center
    layout.justify: center
    interaction.cursor: pointer
    appearance.radius: radius/button
  edges:
    - node:                          # edges[0] - FIRST
        role: icon
        styles:
          size.width: size/icon/small
          size.height: size/icon/small
      relation:
        cardinality: "0..1"
        slotName: icon
    - node:                          # edges[1] - SECOND
        role: label
        styles:
          typography.weight: font/weight/medium
      relation:
        cardinality: "0..1"
        slotName: default
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| `layout.type: flow` | `display: flex` or `inline-flex` | `display: inline-block` | **FAIL** |
| `layout.direction: horizontal` | `flex-direction: row` | N/A (not flex) | **FAIL** |
| `layout.align: center` | `align-items: center` | N/A | **FAIL** |
| `layout.justify: center` | `justify-content: center` | N/A | **FAIL** |
| `interaction.cursor: pointer` | `cursor: pointer` | `cursor: pointer` | PASS |
| `appearance.radius` | border-radius | Not present | **FAIL** |
| **edges[0]: icon slot** | `icon` prop (ReactNode) | **NOT PRESENT** | **FAIL** |
| **edges[1]: label slot** | `children` prop | `children` present | PASS |
| Icon cardinality: "0..1" | Optional | N/A | **FAIL** |
| Label cardinality: "0..1" | Optional | Optional via `?.toString()` | PASS |

#### Critical Issues

1. **Missing `icon` slot** (HIGH)
   - DSL specifies `edges[0]` as icon with `slotName: icon`
   - Implementation has no `icon` prop
   - DOM order should be: icon (if present), then label

2. **Wrong layout model** (MEDIUM)
   - DSL: `layout.type: flow` → should use flexbox
   - Actual: `display: inline-block` → not flexbox
   - This prevents proper icon+label alignment

3. **Missing border-radius** (LOW)
   - DSL: `appearance.radius: radius/button`
   - CSS has no border-radius rule

#### Required Changes

```typescript
// types.ts - ADD:
icon?: ReactNode;  // cardinality: 0..1, slotName: icon

// Button.tsx - CHANGE JSX:
<button className={...} style={style} {...props}>
  {icon && <span className="button-icon">{icon}</span>}  {/* edges[0] */}
  {children && <span className="button-label">{children}</span>}  {/* edges[1] */}
</button>

// styles.css - CHANGE:
.ds.button {
  display: inline-flex;        /* layout.type: flow */
  flex-direction: row;         /* layout.direction: horizontal */
  align-items: center;         /* layout.align: center */
  justify-content: center;     /* layout.justify: center */
  gap: var(--button-gap);
  border-radius: var(--button-border-radius);  /* appearance.radius */
}

.ds.button .button-icon {
  width: var(--size-icon-small);
  height: var(--size-icon-small);
}
```

---

### 4. Card

**DSL URI**: `global.component.card`
**Implementation**: `/src/lib/Card/Card.tsx`
**Status**: NON-COMPLIANT

#### DSL Specification

```yaml
node:
  uri: global.component.card
  styles:
    layout.type: stack
    layout.direction: vertical
    appearance.background: color/surface/card
    appearance.radius: radius/card
  edges:
    - node:                          # edges[0]
        uri: global.subcomponent.card-header
      relation:
        cardinality: "0..1"
        slotName: header
    - node:                          # edges[1]
        uri: global.subcomponent.card-image
      relation:
        cardinality: "0..1"
        slotName: media
    - node:                          # edges[2]
        uri: global.subcomponent.card-content
      relation:
        cardinality: "1"
        slotName: default
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| `layout.type: stack` | `display: flex` | Not specified (uses `overflow: auto`) | **FAIL** |
| `layout.direction: vertical` | `flex-direction: column` | Not present | **FAIL** |
| `appearance.background` | background-color | Present via CSS vars | PASS |
| `appearance.radius` | border-radius | Not present | **FAIL** |
| **edges[0]: Card.Header** | `header` slot | **NOT IMPLEMENTED** | **FAIL** |
| **edges[1]: Card.Image** | `media` slot | Present as `Card.Image` | PARTIAL |
| **edges[2]: Card.Content** | `children`/default | **NOT IMPLEMENTED** | **FAIL** |

#### Subcomponent Mismatch

| DSL Subcomponent | Implementation | Status |
|------------------|----------------|--------|
| `Card.Header` | Not present | **MISSING** |
| `Card.Image` | `Card.Image` | EXISTS (needs slot rename) |
| `Card.Content` | Not present | **MISSING** |
| - | `Card.Section` | **EXTRA** (not in DSL) |
| - | `Card.ThumbnailSection` | **EXTRA** (not in DSL) |

#### Critical Issues

1. **Wrong subcomponents** (HIGH)
   - DSL defines: Header, Image, Content
   - Impl provides: ThumbnailSection, Image, Section

2. **Missing Card.Header** (HIGH)
   - Should have `title` slot (cardinality: 1) and `actions` slot (cardinality: 0..1)

3. **Missing Card.Content** (HIGH)
   - Should be the main content area with `slotName: default`

4. **Slot naming mismatch** (MEDIUM)
   - DSL uses `slotName: media` for Image
   - Need to verify prop/API alignment

---

### 5. Card.Header (MISSING)

**DSL URI**: `global.subcomponent.card-header`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.card-header
  styles:
    layout.type: flow
    layout.direction: horizontal
    layout.justify: space-between
    layout.align: center
    spacing.internal: spacing/medium
  edges:
    - node:                          # edges[0]
        role: title
        styles:
          typography.weight: font/weight/semibold
      relation:
        cardinality: "1"
        slotName: default
    - node:                          # edges[1]
        role: actions
      relation:
        cardinality: "0..1"
        slotName: actions
```

#### Required Implementation

```typescript
// types.ts
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;     // title, cardinality: 1, slotName: default
  actions?: ReactNode;     // actions, cardinality: 0..1, slotName: actions
}

// CardHeader.tsx
<div className="ds card-header">
  <span className="card-header-title">{children}</span>     {/* edges[0] */}
  {actions && <div className="card-header-actions">{actions}</div>}  {/* edges[1] */}
</div>

// styles.css
.ds.card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-medium);
}
.ds.card-header .card-header-title {
  font-weight: var(--font-weight-semibold);
}
```

---

### 6. Card.Content (MISSING)

**DSL URI**: `global.subcomponent.card-content`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.card-content
  styles:
    layout.type: stack
    layout.direction: vertical
    spacing.internal: spacing/medium
```

#### Required Implementation

```typescript
// types.ts
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;  // cardinality: 1, slotName: default
}

// CardContent.tsx
<div className="ds card-content">{children}</div>

// styles.css
.ds.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-medium);
  padding: var(--spacing-medium);
}
```

---

### 7. Card.Image

**DSL URI**: `global.subcomponent.card-image`
**Implementation**: `/src/lib/Card/common/Image/Image.tsx`
**Status**: PARTIAL

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.card-image
  styles:
    layout.type: block
    size.width: fill
    object.fit: cover
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| `layout.type: block` | `display: block` | Not explicit | **FAIL** |
| `size.width: fill` | `width: 100%` | Not in CSS | **FAIL** |
| `object.fit: cover` | `object-fit: cover` | Not in CSS | **FAIL** |

#### Current CSS (from parent Card)
```css
& .card-image {
  &:not(:last-child) {
    border-bottom: ...;
  }
}
```

#### Required CSS
```css
.ds.card-image {
  display: block;
  width: 100%;
  object-fit: cover;
}
```

---

### 8. Icon

**DSL URI**: `global.component.icon`
**Implementation**: `/src/lib/Icon/Icon.tsx`
**Status**: PARTIAL

#### DSL Specification

```yaml
node:
  uri: global.component.icon
  styles:
    layout.display: inline-block
    size.width: size/icon/default
    size.height: size/icon/default
```

#### Compliance Matrix

| DSL Requirement | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| `layout.display: inline-block` | `display: inline-block` | `display: inline-flex` | **MISMATCH** |
| `size.width: size/icon/default` | `--size-icon-default` | `--icon-size` | **PARTIAL** |
| `size.height: size/icon/default` | `--size-icon-default` | `--icon-size` | **PARTIAL** |

#### Issues

1. **Display mismatch** (LOW)
   - DSL: `inline-block`
   - Actual: `inline-flex` with justify/align center
   - Functional but not exact match

2. **Token naming** (LOW)
   - DSL: `size/icon/default`
   - CSS: `--icon-size` (generic, no "default" qualifier)

---

### 9. Label (MISSING)

**DSL URI**: `global.component.label`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.component.label
  styles:
    layout.display: inline
    typography.size: font/size/label
    typography.weight: font/weight/medium
```

#### Required Implementation

```typescript
// types.ts
interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  criticality?: ModifierFamily<"criticality">;  // hasModifierFamily
}

// Label.tsx
<span className={["ds", "label", criticality, className].filter(Boolean).join(" ")}>
  {children}
</span>

// styles.css
.ds.label {
  display: inline;
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-medium);
}
```

---

### 10. Tile (MISSING)

**DSL URI**: `global.component.tile`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.component.tile
  styles:
    layout.type: stack
    layout.direction: vertical
    interaction.cursor: pointer
    appearance.background: color/surface/tile
    appearance.radius: radius/tile
  edges:
    - node:                          # edges[0]
        uri: global.subcomponent.tile-header
      relation:
        cardinality: "1"
        slotName: header
    - node:                          # edges[1]
        uri: global.subcomponent.tile-content
      relation:
        cardinality: "1"
        slotName: default
```

#### Required Implementation

```typescript
// types.ts
interface TileProps extends HTMLAttributes<HTMLDivElement> {
  header: ReactNode;     // cardinality: 1, slotName: header
  children: ReactNode;   // cardinality: 1, slotName: default
}

// Tile.tsx
<div className="ds tile">
  <Tile.Header>{header}</Tile.Header>    {/* edges[0] */}
  <Tile.Content>{children}</Tile.Content> {/* edges[1] */}
</div>
```

---

### 11. Tile.Header (MISSING)

**DSL URI**: `global.subcomponent.tile-header`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.tile-header
  styles:
    layout.type: flow
    layout.direction: horizontal
    layout.align: center
    spacing.internal: spacing/medium
```

---

### 12. Tile.Content (MISSING)

**DSL URI**: `global.subcomponent.tile-content`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.tile-content
  styles:
    layout.type: stack
    layout.direction: vertical
    spacing.internal: spacing/medium
```

---

### 13. Breadcrumbs (MISSING)

**DSL URI**: `global.pattern.breadcrumbs`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.component.breadcrumbs
  styles:
    layout.type: flow
    layout.direction: horizontal
    layout.align: center
  edges:
    - node:
        uri: global.subcomponent.breadcrumbs-item
      relation:
        cardinality: "1..*"
        slotName: default
```

---

### 14. Breadcrumbs.Item (MISSING)

**DSL URI**: `global.subcomponent.breadcrumbs-item`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.breadcrumbs-item
  styles:
    layout.type: flow
    layout.direction: horizontal
    layout.align: center
  edges:
    - node:                          # edges[0]
        role: link
        styles:
          typography.color: color/text/link
      relation:
        cardinality: "1"
        slotName: default
    - node:                          # edges[1]
        role: separator
        styles:
          spacing.external: spacing/small
      relation:
        cardinality: "0..1"
```

#### Required Implementation

```typescript
// DOM order: link THEN separator
<span className="ds breadcrumbs-item">
  <a className="breadcrumbs-item-link">{children}</a>  {/* edges[0] */}
  {separator && <span className="breadcrumbs-item-separator">{separator}</span>}  {/* edges[1] */}
</span>
```

---

### 15. Timeline (MISSING)

**DSL URI**: `global.pattern.timeline`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.pattern.timeline
  styles:
    layout.type: stack
    layout.direction: vertical
  edges:
    - node:                          # edges[0]
        uri: global.subcomponent.timeline-header
      relation:
        cardinality: "0..1"
    - node:                          # edges[1]
        uri: global.subcomponent.timeline-content
      relation:
        cardinality: "1"
        slotName: default
    - node:                          # edges[2]
        uri: global.subcomponent.timeline-footer
      relation:
        cardinality: "0..1"
```

---

### 16. Timeline.Header (MISSING)

**DSL URI**: `global.subcomponent.timeline-header`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.timeline-header
  styles:
    layout.type: flow
    layout.direction: horizontal
    layout.justify: space-between
  edges:
    - node:                          # edges[0]
        role: filters
      relation:
        cardinality: "0..1"
        slotName: start
    - node:                          # edges[1]
        role: sorting
      relation:
        cardinality: "0..1"
        slotName: end
```

---

### 17. Timeline.Content (MISSING)

**DSL URI**: `global.subcomponent.timeline-content`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.timeline-content
  styles:
    layout.type: stack
    layout.direction: vertical
  edges:
    - node:
        uri: global.subcomponent.timeline-event
      relation:
        cardinality: "0..*"
        slotName: default
```

---

### 18. Timeline.Event (MISSING)

**DSL URI**: `global.subcomponent.timeline-event`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.timeline-event
  styles:
    layout.type: flow
    layout.direction: horizontal
  edges:
    - node:                          # edges[0]
        role: actor
      relation:
        cardinality: "0..1"
    - node:                          # edges[1]
        role: datetime
      relation:
        cardinality: "0..1"
    - node:                          # edges[2]
        role: payload
      relation:
        cardinality: "1"
        slotName: default
```

#### Required Implementation

```typescript
// DOM order: actor, datetime, payload
interface TimelineEventProps {
  actor?: ReactNode;      // edges[0], cardinality: 0..1
  datetime?: ReactNode;   // edges[1], cardinality: 0..1
  children: ReactNode;    // edges[2], cardinality: 1, slotName: default (payload)
}
```

---

### 19. Timeline.Footer (MISSING)

**DSL URI**: `global.subcomponent.timeline-footer`
**Implementation**: NOT IMPLEMENTED
**Status**: MISSING

#### DSL Specification

```yaml
node:
  uri: global.subcomponent.timeline-footer
  edges:
    - node:
        role: content
      relation:
        cardinality: "1"
        slotName: default
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total components audited | 19 |
| Fully compliant | 2 (11%) |
| Partial compliance | 2 (11%) |
| Non-compliant | 2 (11%) |
| Missing implementation | 13 (68%) |

---

## Recommended Priority

### Immediate (High Impact)

1. **Button** - Fix layout and add icon slot
2. **Card** - Replace subcomponents with DSL-defined ones

### Short-term (Medium Impact)

3. **Card.Header** - Implement new
4. **Card.Content** - Implement new
5. **Card.Image** - Add missing CSS properties
6. **Label** - Implement new (simple)

### Medium-term

7. **Tile** + Tile.Header + Tile.Content
8. **Breadcrumbs** + Breadcrumbs.Item
9. **Icon** - Minor CSS adjustments

### Long-term

10. **Timeline** + all subcomponents (5 parts)

---

## Audit Methodology

This audit follows the `component-from-ontology` skill methodology:

1. **DSL Extraction**: Query ontology for `anatomyDsl` property
2. **Edge Order Verification**: DSL array indices define DOM order
3. **Cardinality Mapping**:
   - `"1"` → Required prop
   - `"0..1"` → Optional prop
   - `"1..*"` → Required array/multiple
   - `"0..*"` → Optional array/multiple
4. **Slot Mapping**:
   - `slotName: default` → `children` prop
   - `slotName: <name>` → `<name>` prop
5. **Style Mapping**: DSL style tokens → CSS custom properties
6. **Layout Mapping**:
   - `layout.type: stack` → `display: flex`
   - `layout.type: flow` → `display: flex` (or `inline-flex`)
   - `layout.direction: vertical` → `flex-direction: column`
   - `layout.direction: horizontal` → `flex-direction: row`
