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

### The Problem

Lit's recommended approach for component styles is to write them inline as tagged template literals:

```typescript
import { css, LitElement } from 'lit';

export class MyComponent extends LitElement {
  static styles = css`
    .ds.button { color: red; }
  `;
}
```

This works at runtime but means no CSS tooling — no syntax highlighting, no IntelliSense, no linting — and a completely different authoring experience from every other package in the monorepo. The challenge is keeping CSS as plain `.css` files for the developer while still satisfying Lit's requirement of a `CSSResult` object at runtime.

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

Keeping styles in `.css` files restores the full CSS authoring experience: syntax highlighting, IntelliSense, linting, and autocomplete all work as expected. It also keeps component files focused — logic stays in `.ts`, presentation stays in `.css` — which matches how every other package in the monorepo is structured and aligns with the conventions in [STANDARDS_FOR_STYLING.md](../references/STANDARDS_FOR_STYLING.md).


### Trade-offs Accepted

This approach introduces a build step that React packages don't need: a Vite plugin transforms `.css` imports into `CSSResult` objects, alongside a `css.d.ts` declaration for TypeScript. The transformation is an explicit, documented part of the build pipeline rather than hidden behaviour, but it does mean the webcomponents build process diverges from the simpler `tsc`-only approach used elsewhere.

Within Pragma's monorepo, this is an acceptable trade-off. Consistency in developer experience and file organisation across packages matters more than build pipeline uniformity, and the additional tooling is self-contained within the webcomponents package.

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

The build combines Vite (for CSS-to-`CSSResult` transformation) and `tsc` (for type definitions). A `css.d.ts` declaration file tells TypeScript that `.css` imports are valid.

**Why Vite over pure `tsc`:** TypeScript cannot transform CSS files. Vite handles the CSS-to-JavaScript transformation while `tsc` generates type definitions.

**Why a type declaration alone is not enough:** A `css.d.ts` declaration only tells TypeScript that the import is valid and what type to assign it — it is a compile-time concern only. At runtime, Lit's `static styles` must receive a `CSSResult` object (produced by Lit's `css\`...\`` tagged template). Without the Vite plugin, the import would resolve to a plain string or an empty object depending on the bundler, and Lit would silently apply no styles.


## 2. Content Projection: Slots vs. React Children

Unlike React's `children` prop, slots are a browser standard — no framework abstraction involved. They support named slots for multiple content areas, and slotted content remains in the light DOM, meaning parent page styles can still reach it. Components can also declare fallback content directly in the template.

One platform constraint to be aware of: the `::slotted()` pseudo-element only styles direct slotted children, not deeply nested elements. This should be considered when designing component APIs.


## 3. Shadow DOM and Global Styles

Shadow DOM creates a style boundary: CSS rules defined outside the component cannot reach elements inside it, and vice versa. This is intentional — it prevents global styles from accidentally breaking component internals — but it raises a practical question: how do design tokens and global styles like typography reach components at all?

There are two mechanisms that cross the shadow boundary by design.

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

Inheritable CSS properties (like `font-family`, `color`, `line-height`) naturally cascade into shadow trees without explicit configuration. Shadow DOM only isolates non-inheritable properties and prevents selectors from crossing the boundary.


### External Customization

Consumers can customize components using CSS variables:

```css
ds-button {
  --button-color-background: red;  /* Override component default */
}
```


## 4. Component Naming and Styling Pattern

**Decision:** Apply the `ds` namespace class **inside the component template**, not on the host element.

Following [STANDARDS_FOR_STYLING.md](../references/STANDARDS_FOR_STYLING.md), this maintains consistency with React components while working within Shadow DOM constraints. 


## 5. Testing Architectural Considerations

Unlike React, web component tests need to query two separate DOM trees: the shadow DOM (`elem.shadowRoot?.querySelector()`) for internal component structure, and the light DOM (`elem.querySelector()`) for slotted content. Tests must also wait for custom element registration via `customElements.whenDefined()` before querying the shadow tree, since the element may not be upgraded yet when the test begins.

