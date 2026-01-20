# Component Folder Structure and Conventions

Every React component in Pragma follows the same structure. This consistency means that understanding one component teaches you how to navigate any component. When a new developer joins the team or when you return to code after months away, the predictable structure eliminates guesswork about where to find things.

## The Structure

A component folder contains all files related to that component. The folder name matches the component name exactly, and files follow a consistent naming pattern.

```
Button/
├── Button.tsx           # Component implementation
├── types.ts             # TypeScript interface
├── styles.css           # Component styles
├── index.ts             # Barrel export
├── Button.stories.tsx   # Storybook stories
├── Button.tests.tsx     # Unit tests
└── Button.ssr.tests.tsx # Server-side rendering tests
```

Components with subcomponents add a `common/` directory that contains related but secondary components. The Tooltip component, for example, has a TooltipArea subcomponent:

```
Tooltip/
├── Tooltip.tsx
├── types.ts
├── styles.css
├── index.ts
├── Tooltip.stories.tsx
├── Tooltip.tests.tsx
├── withTooltip.tsx       # Higher-order component variant
├── withTooltip.stories.tsx
└── common/
    ├── index.ts
    └── TooltipArea/
        ├── TooltipArea.tsx
        ├── types.ts
        ├── styles.css
        ├── index.ts
        ├── TooltipArea.stories.tsx
        └── TooltipArea.tests.tsx
```

Subcomponents follow the same structure as top-level components. The `common/` directory indicates that these components exist to support the parent component rather than standing alone.

## Creating Components

The [component generator](../packages/generator-ds) creates new components with all required files following these conventions. From within a component package directory:

```bash
yo @canonical/ds:component src/ui/MyComponent
```

The generator creates the component file, types, barrel export, and unit tests by default. Use flags to include additional files:

```bash
# Include styles and stories
yo @canonical/ds:component src/ui/MyComponent --withStyles --withStories

# Skip SSR tests
yo @canonical/ds:component src/ui/MyComponent --withoutSsrTests
```

The generated code follows all conventions described in this document, so you can start implementing immediately rather than setting up boilerplate.

See the [generator-ds README](../packages/generator-ds/README.md) for installation and all available options.

## Why This Structure

Three principles drive this structure: co-location, predictable naming, and explicit exports.

Co-location means everything related to a component lives in one folder. The implementation, types, styles, tests, and documentation travel together. When you modify a component, you know where to find its tests. When you delete a component, you delete one folder. No hunting through separate `__tests__` directories or `styles/` folders scattered across the codebase.

Predictable naming means the component file matches the component name. The Button component lives in `Button.tsx`. Stories live in `Button.stories.tsx`. Tests live in `Button.tests.tsx`. This pattern scales because it requires no memorization. The convention encodes the information.

Explicit exports mean the barrel file (`index.ts`) lists exactly what the component exposes. No `export *` statements that accidentally expose internal utilities. The public API is visible at a glance.

## The Implementation File

The component implementation file imports its types and styles, then exports a function component.

```typescript
import type Props from "./types.js";
import "./styles.css";

const Button = ({
  id,
  className,
  children,
  style,
  appearance,
  ...props
}: Props): React.ReactElement => {
  return (
    <button
      id={id}
      className={["ds", "button", appearance, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-label={props["aria-label"] || children?.toString()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
```

Several patterns appear consistently across all components. The type import uses `.js` extension because TypeScript compilation produces JavaScript files with those extensions. The CSS import has no specifier because it triggers a side effect (loading styles) rather than providing a value. The component uses default export because the barrel file will re-export it with a named export.

The className construction follows a standard pattern. The array `["ds", "button", appearance, className]` contains the namespace (`ds`), the component class (`button`), any modifier props (`appearance`), and any consumer-provided classes (`className`). The `filter(Boolean)` removes falsy values like `undefined` when no appearance is specified. The `join(" ")` produces the final class string.

This pattern allows modifier classes to apply directly. When `appearance="positive"`, the rendered element has `class="ds button positive"`. The `positive` class triggers CSS that sets intent colours without component-specific logic.

## The Types File

Props interfaces extend the appropriate HTML attributes interface to ensure all native attributes pass through correctly.

```typescript
import type { ModifierFamily } from "@canonical/ds-types";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface BaseProps {
  id?: string;
  className?: string;
  children: ReactNode;
  appearance?: ModifierFamily<"severity"> | "base" | "link";
}

type Props = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default Props;
```

The `BaseProps` interface defines component-specific props with documentation comments. These are the props that appear in Storybook's controls panel and in IDE autocomplete.

The intersection with `ButtonHTMLAttributes<HTMLButtonElement>` adds all standard button attributes: `onClick`, `disabled`, `type`, `form`, and dozens of others. Consumers can use any native button attribute without the component explicitly declaring it.

The `ModifierFamily<"severity">` type comes from `@canonical/ds-types`. It resolves to a union of valid severity modifiers: `"neutral" | "positive" | "negative" | "caution" | "information"`. This type safety prevents typos in modifier names and enables IDE autocomplete.

## The Styles File

Component styles use CSS custom properties that reference design tokens. The styles define component-specific behaviour while delegating colour and spacing values to the design system.

```css
.ds.button {
  display: inline-block;
  cursor: pointer;

  color: var(--modifier-color-text, var(--button-color-text));
  background-color: var(--modifier-color, var(--button-color-background));
  border-color: var(--modifier-color-border, var(--button-color-border));
  border-style: solid;
  border-width: var(--button-border-width);
  font-size: var(--button-font-size);
  padding-block: var(--button-padding-vertical);
  padding-inline: var(--button-padding-horizontal);

  &:hover {
    background-color: var(
      --modifier-color-hover,
      var(--button-color-background-hover)
    );
  }
}
```

The `.ds.button` selector combines the namespace class with the component class. This specificity prevents accidental style conflicts while remaining overridable by consumers.

The nested fallback pattern `var(--modifier-color, var(--button-color-background))` enables intent inheritance. When a button sits inside a container with the `positive` class, `--modifier-color` is defined and the button inherits the intent colours. When no intent context exists, the button falls back to its own `--button-color-background` variable.

Consumers can override button styling by setting custom properties on the element:

```jsx
<Button style={{ "--button-color-background": "lightblue" }}>
  Custom
</Button>
```

This works because CSS custom properties cascade and the component styles read from those properties rather than hardcoded values.

## The Barrel Export

The index file explicitly lists every public export. This makes the component's API visible at a glance.

```typescript
export { default as Button } from "./Button.js";
export type {
  BaseProps as ButtonBaseProps,
  default as ButtonProps,
} from "./types.js";
```

Several patterns appear here. The default export from `Button.tsx` becomes a named export `Button`. This allows consumers to use destructuring imports: `import { Button } from "@canonical/react-ds-global"`.

Type exports use the `export type` syntax to ensure they are erased during compilation. The types are renamed during export (`BaseProps as ButtonBaseProps`) to include the component name, preventing naming conflicts when multiple components define similar base props.

The `.js` extension appears in import paths because the compiled JavaScript files will have that extension. TypeScript understands that `.js` refers to the corresponding `.ts` file during development.

## Stories

Storybook stories document component usage and provide a testing surface for visual regression tests.

```typescript
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import Component from "./Button.js";

const meta = {
  title: "Button",
  component: Component,
  tags: ["autodocs"],
  args: { onClick: fn() },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Contact us",
  },
};

export const Positive: Story = {
  args: {
    children: "Confirm",
    appearance: "positive",
  },
};
```

The `tags: ["autodocs"]` directive tells Storybook to generate documentation from the component's JSDoc comments and TypeScript types. This provides API reference documentation without maintaining separate docs.

Each exported story represents a distinct state or variant of the component. Story names become visible in Storybook's sidebar and in Chromatic's visual comparison interface. Descriptive names like `Positive` and `Negative` help reviewers understand what each screenshot should show.

The `fn()` function from Storybook's test utilities wraps callbacks to enable interaction testing and spying in the Storybook UI.

## Unit Tests

Unit tests verify component behaviour using Testing Library's user-centric queries.

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Button.js";

describe("Button component", () => {
  it("renders", () => {
    render(<Component>Hello world!</Component>);
    expect(screen.getByText("Hello world!")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className="test-class">Hello world!</Component>);
    expect(screen.getByText("Hello world!")).toHaveClass("test-class");
  });
});
```

Tests focus on observable behaviour rather than implementation details. The first test verifies that children render. The second test verifies that custom classes pass through. Neither test inspects internal state or implementation patterns.

Testing Library queries like `getByText` and `getByRole` encourage tests that interact with components the way users do. If a test cannot find an element by its accessible role or text content, that often indicates an accessibility problem in the component itself.

## SSR Tests

Server-side rendering tests verify that components render correctly without browser APIs.

```typescript
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Button.js";

describe("Button SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component>Hello world!</Component>);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component>Hello world!</Component>);
    expect(html).toMatch(/<button[^>]*>Hello world!<\/button>/);
  });

  it("applies className", () => {
    const html = renderToString(
      <Component className="test-class">Hello world!</Component>,
    );
    expect(html).toContain('class="ds button test-class"');
  });
});
```

SSR tests use `renderToString` from `react-dom/server` rather than Testing Library's `render`. This function executes in a Node.js environment without `window` or `document` globals. Components that access browser APIs directly will throw during SSR.

The "doesn't throw" test catches the most common SSR problems: direct `window` access, `document.querySelector` calls, or other browser-specific code executed during render. Components that need browser APIs must guard those accesses with environment checks or move them to effects that run only on the client.

The HTML string assertions verify that the server-rendered output matches expectations. Hydration mismatches occur when server and client render different HTML. Testing the actual HTML string helps catch these issues before they cause hydration warnings in production.

## Design System Ontology

Components in `react-ds-global` implement entities defined in the Design System Ontology. The ontology provides the authoritative specification for each component, including its purpose, modifier families, and anatomy.

The `@canonical/ds-types` package derives its types from the ontology. When a component accepts `appearance?: ModifierFamily<"severity">`, that type resolves to the severity modifiers defined in the ontology: neutral, positive, negative, caution, and information.

This connection between ontology and implementation ensures that component APIs remain consistent with design specifications. Changes to modifier families in the ontology propagate to TypeScript types, which surface as compile errors in components that need updating.

The ontology is available at [github.com/canonical/design-system](https://github.com/canonical/design-system). Query it to understand which components exist, what modifiers they support, and how they relate to each other.

## Code Standards

The component structure implements patterns codified in the code-standards ontology. Key standards include:

**Component Folder Structure** (react/component/structure/folder): All component files live in a single folder named after the component. No separation of concerns by file type across the codebase.

**Barrel Exports** (react/component/barrel-exports): The index.ts file uses explicit named exports. Type exports use `export type` syntax. No `export *` statements.

**Class Name Construction** (react/component/class-name-construction): CSS classes are built from an array containing namespace, component class, modifiers, and consumer classes, filtered for truthiness and joined with spaces.

These standards exist in machine-readable form at [github.com/canonical/code-standards](https://github.com/canonical/code-standards). Tooling can query the standards to generate scaffolding, validate implementations, or produce documentation.
