# @canonical/summon-component

Component scaffolding for React and Svelte projects.

## What You Get

Production-ready component structures with:
- TypeScript types and props
- Unit tests (Testing Library)
- SSR tests (optional)
- Storybook stories (optional)
- CSS styles (optional)
- Auto-export from parent barrel

## Installation

```bash
# Install in a project
bun add @canonical/summon-component

# Or link globally (from this package directory)
bun link        # for bun users
npm link        # for npm users
```

Requires `@canonical/summon` as a peer dependency.

## Quick Start

### React Component

```bash
# Interactive mode - prompts guide you through options
summon component react

# Specify the component path directly
summon component react --component-path=src/components/Button

# Preview what will be created
summon component react --component-path=src/components/Button --dry-run
```

Creates:

```
src/components/Button/
├── Button.tsx           # Component with typed props
├── types.ts             # TypeScript interface
├── index.ts             # Barrel export
├── Button.test.tsx      # Unit tests
├── Button.ssr.test.tsx  # SSR tests
├── Button.stories.tsx   # Storybook stories
└── styles.css           # Component styles
```

And appends to `src/components/index.ts`:

```typescript
export * from "./Button";
```

### Svelte Component

```bash
# Interactive mode
summon component svelte

# Specify the component path
summon component svelte --component-path=src/lib/components/Card

# With TypeScript stories instead of Svelte CSF
summon component svelte --component-path=src/lib/components/Card --use-ts-stories
```

Creates:

```
src/lib/components/Card/
├── Card.svelte            # Svelte 5 component with runes
├── types.ts               # TypeScript interface
├── index.ts               # Barrel export
├── Card.svelte.test.ts    # Unit tests
├── Card.ssr.test.ts       # SSR tests
├── Card.stories.svelte    # Storybook stories (Svelte CSF)
└── styles.css             # Component styles (inline <style>)
```

## Options

### React

| Flag | Description | Default |
|------|-------------|---------|
| `--component-path` | Where to create the component | `src/components/MyComponent` |
| `--no-with-styles` | Skip styles.css | included |
| `--no-with-stories` | Skip Storybook stories | included |
| `--no-with-ssr-tests` | Skip SSR test file | included |

### Svelte

| Flag | Description | Default |
|------|-------------|---------|
| `--component-path` | Where to create the component | `src/lib/components/MyComponent` |
| `--no-with-styles` | Skip inline `<style>` block | included |
| `--no-with-stories` | Skip Storybook stories | included |
| `--use-ts-stories` | Use `.stories.ts` instead of `.stories.svelte` | Svelte CSF |
| `--no-with-ssr-tests` | Skip SSR test file | included |

### Global

| Flag | Description |
|------|-------------|
| `--dry-run`, `-d` | Preview without writing files |
| `--yes`, `-y` | Skip confirmation prompts |
| `--help` | Show all options |

## Generated Code

### React Component

```tsx
// Button.tsx
import type { ButtonProps } from "./types";
import "./styles.css";

export const Button = ({
  className,
  children,
  ...props
}: ButtonProps): JSX.Element => {
  return (
    <div className={`button${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </div>
  );
};
```

```typescript
// types.ts
import type { HTMLAttributes, PropsWithChildren } from "react";

export interface ButtonProps
  extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {}
```

### Svelte Component

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import type { CardProps } from "./types";

  let {
    class: className = "",
    children,
    ...props
  }: CardProps = $props();
</script>

<div class="card{className ? ` ${className}` : ''}" {...props}>
  {@render children?.()}
</div>

<style>
  .card {
    /* Component styles */
  }
</style>
```

Uses Svelte 5 runes (`$props()`) and render tags (`@render`).

## Customization

### Override with local generators

Create `generators/component/react/index.ts` in your project to override the installed generator. Local generators take precedence.

### Extend the generators

Import and compose with the base generators:

```typescript
import { generators } from "@canonical/summon-component";
import { sequence_ } from "@canonical/summon";

const baseReactGenerator = generators["component/react"];

export const generator = {
  ...baseReactGenerator,
  generate: (answers) => sequence_([
    baseReactGenerator.generate(answers),
    // Add your custom tasks here
  ]),
};
```

## License

GPL-3.0
