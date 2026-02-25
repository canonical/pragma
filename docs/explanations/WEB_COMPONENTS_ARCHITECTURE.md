# Web Components Architecture

This document explains the architectural decisions for Lit web components in Pragma's monorepo, covering why we chose certain patterns and how they align with established standards while adapting to web component constraints.


## Component Folder Structure

Web components follow the same structural principles as React components, as defined in [component folder structure and conventions](../component-folder-structure-and-conventions.md): co-location (everything related lives in one folder), predictable naming (file names match component names), and explicit exports (barrel files list public APIs).

The structure adapts to web component specifics (`.ts` instead of `.tsx`):

```
Component/
├── Component.ts            # Component implementation
├── types.ts                # TypeScript properties interface  
├── styles.css              # Component styles
├── index.ts                # Barrel export
├── Component.stories.ts    # Storybook stories
└── Component.tests.ts      # Unit tests
```

For components with subcomponents, add a `common/` directory containing related secondary components that follow the same structure.

## 1. CSS Styles: Separate Files vs. Inline

### The Choice: Separate CSS Files with Build Transformation

**Decision:** Use separate `.css` files that are transformed to `CSSResult` objects at build time.

```typescript
// Button.ts
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './styles.css';  // Transformed by Vite plugin

@customElement('can-button')
export class CanButton extends LitElement {
  static styles = styles;

  render() {
    return html`<button class="ds button"><slot></slot></button>`;
  }
}
```

```css
/* styles.css */
:host {
  display: inline-block;
  
  /* Component variables - must be declared on :host for Shadow DOM */
  --button-color-text: var(--color-text-inverted);
  --button-color-background: var(--color-action-default);
  --button-color-border: var(--color-border-default);
  --button-padding-vertical: var(--spacing-vertical-small);
  --button-padding-horizontal: var(--spacing-horizontal-medium);
}

.ds.button {
  display: inline-flex;
  align-items: center;
  
  color: var(--modifier-color-text, var(--button-color-text));
  background-color: var(--modifier-color, var(--button-color-background));
  border-color: var(--modifier-color-border, var(--button-color-border));
}
```

### Why Separate CSS Files

**Developer Experience Benefits:**
- **Full CSS tooling support**: IntelliSense, autocomplete, syntax highlighting, linting
- **Clear separation**: `Button.ts` (113 lines of logic) + `styles.css` (186 lines of styles)
- **Better maintainability**: Easier to scan, search, and edit dedicated CSS files
- **Consistency with monorepo structure**: Matches React component file organization

**Architectural Alignment:**
- **Follows separation of concerns**: Logic in `.ts`, presentation in `.css`
- **Follows standards documentation**: [STANDARDS_FOR_STYLING.md](../references/STANDARDS_FOR_STYLING.md) assumes separate `styles.css` files


### Trade-offs Accepted

**Violates "No Magic" Principle:**
- Build-time transformation: `.css` → `CSSResult` is invisible to developers
- Requires Vite plugin for package builds (not pure `tsc`)
- Different build process from React packages
- What you write (plain CSS) differs from what ships (JavaScript with Lit's `css` tagged templates)

**Additional Complexity:**
- Requires custom Vite plugin configuration
- Requires type declaration file (`css.d.ts`)
- Adds build tool dependency (Vite for builds, not just dev)

**Summary:**
Within Pragma's monorepo context, the benefits of separate CSS files outweigh the architectural purity concerns:
1. **Monorepo consistency** matters more than framework orthodoxy
2. **Developer experience** is critical for team productivity
3. **Build transformation** is acceptable when benefits are substantial

### Shadow DOM Scoping: Critical Implementation Detail

**Component variables MUST be declared on `:host`, not at the file top.**

Shadow DOM creates an isolated scope. Variables declared outside `:host` are not accessible to descendant elements the way `:root` variables are in global CSS.

**Incorrect** (variables not in scope):
```css
/* These variables won't be accessible to .ds.button */
--button-color-text: var(--color-text-inverted);
--button-color-background: var(--color-action-default);

.ds.button {
  color: var(--button-color-text);  /* undefined! */
}
```

**Correct** (variables on :host):
```css
:host {
  /* These variables cascade to all elements in shadow tree */
  --button-color-text: var(--color-text-inverted);
  --button-color-background: var(--color-action-default);
}

.ds.button {
  color: var(--button-color-text);  /* works! */
}
```

### Build Requirements

This approach requires:
- Custom Vite plugin to transform CSS imports to `CSSResult` objects
- Type declaration file (`css.d.ts`) for TypeScript support
- Build script combining Vite (for CSS transformation) and `tsc` (for type definitions)

**Why Vite over pure `tsc`:** TypeScript cannot transform CSS files. Vite handles the CSS-to-JavaScript transformation while `tsc` generates type definitions.


## 2. Content Projection: Slots vs. React Children

**Decision:** Use native Web Component slots for content projection.

**Key Architectural Differences from React:**
- Slots are a **browser standard**, not a framework abstraction
- Support **named slots** for multiple content areas
- Slotted content remains in the **light DOM** (accessible to parent page styles)
- Components can provide **fallback content** declaratively

**Styling Constraint:** The `::slotted()` pseudo-element only styles direct children, not deeply nested elements. This is a platform limitation that affects component API design.


## 3. Shadow DOM and Global Styles

### CSS Variables Pierce Shadow DOM

Global design tokens work across shadow boundaries:

```css
/* global.css */
:root {
  --color-action-default: blue;
}

/* component styles.css */
:host {
  --button-color-background: var(--color-action-default);  /* Works! */
}
```

### Inheritable Properties Work Across Shadow DOM

Inheritable CSS properties (like `font-family`, `color`, `line-height`) naturally cascade into shadow trees without explicit configuration. Shadow DOM only isolates **non-inheritable** properties and prevents **selectors** from crossing the boundary.


### External Customization

Consumers can customize components using CSS variables:

```css
can-button {
  --button-color-background: red;  /* Override component default */
}
```


## 4. Component Naming and Styling Pattern

**Decision:** Apply the `ds` namespace class **inside the component template**, not on the host element.

Following [STANDARDS_FOR_STYLING.md](../references/STANDARDS_FOR_STYLING.md), this maintains consistency with React components while working within Shadow DOM constraints. 


## 5. Testing Architectural Considerations

**Key Difference from React:** Web component tests query **two DOM trees**:
- **Shadow DOM** (`elem.shadowRoot?.querySelector()`) for internal component structure
- **Light DOM** (`elem.querySelector()`) for slotted content

Tests must wait for custom element registration using `customElements.whenDefined()` before querying the shadow tree.

