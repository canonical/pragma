# Preface

How a React component in this repository types its props: it extends the native props of the element it renders as its root. Read this before writing or changing a React component's props type.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

A React component's props type must extend the native props of the element it renders as its root, so every attribute that element accepts (`data-*`, `aria-*`, `onMouseEnter`, `id`, `style`, …) reaches the DOM without extra work. Write it as a design-system-owned `OwnProps` intersected with the root tag's `ComponentProps`, indexed by tag:

```ts
import type { ComponentProps } from "react";

type OwnProps = {
  /* design-system-owned props */
};

// Change "button" to the component's actual root element tag.
export type ButtonProps = OwnProps & Omit<ComponentProps<"button">, keyof OwnProps>;
```

# Important

1. **Use `ComponentProps<"tag">`**, the tag-indexed form. Do not use the per-element `XxxHTMLAttributes<T>` interfaces, which are easy to instantiate against the wrong element, and do not use `ComponentPropsWithoutRef`: the repository peers React 19, where `ref` is an ordinary prop and belongs in the surface.
2. **Use a `type` alias with an intersection, never `interface … extends`.** Intersections distribute over unions and compose predictably; `interface extends` does not, and mixing it with union members silently collapses props to `any`.
3. **Always write `Omit<ComponentProps<"tag">, keyof OwnProps>`**, so the design-system-owned keys win by construction. Any further exclusion the component deliberately controls, such as `| "type"` when the design system fixes the button type, gets a doc comment saying why.
4. **Runtime obligation:** destructure every `OwnProps` member, spread the remaining `{...rest}` onto the root element, and set design-system-controlled attributes after the spread so they win. Merge `className` and `style` rather than letting either side overwrite the other; the repository pattern is `[componentCssClassName, className].filter(Boolean).join(" ")`. No design-system-internal prop may leak onto the DOM node.
5. **A component whose root element depends on a prop** uses a small discriminated union of two such intersections, one per possible root tag. No polymorphic `as` generics.
6. **A component with no single root element** (a fragment, a portal, pure composition or a wrapper) is exempt, and says so in a one-line doc comment.
