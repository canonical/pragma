# @canonical/summon-component

Component scaffolding for React and Svelte projects. Generates production-ready component structures with TypeScript, tests, stories, and styles — all following consistent conventions.

## Why Use This?

Creating a new component by hand means creating 5-7 files with boilerplate that's almost identical every time. This generator handles that in one command, ensuring:

- Consistent file structure across your codebase
- Proper TypeScript types from the start
- Test files that actually test something
- Storybook stories ready to customize
- Auto-registration in your component barrel

## Installation

```bash
bun add @canonical/summon-component
```

Requires `@canonical/summon` as a peer dependency:

```bash
bun add @canonical/summon
```

Or link globally for use across projects:

```bash
cd /path/to/summon-component
bun link        # for bun
npm link        # for npm
```

---

## Quick Start

### React Component

```bash
# Interactive — prompts guide you
summon component react

# Direct — specify path
summon component react --component-path=src/components/Button

# Preview — see what would be created
summon component react --component-path=src/components/Button --dry-run
```

### Svelte Component

```bash
# Interactive
summon component svelte

# Direct
summon component svelte --component-path=src/lib/components/Card

# With TypeScript stories instead of Svelte CSF
summon component svelte --component-path=src/lib/components/Card --use-ts-stories
```

---

## What Gets Generated

### React

For `summon component react --component-path=src/components/Button`:

```
src/components/Button/
├── Button.tsx           # Component implementation
├── types.ts             # Props interface
├── index.ts             # Barrel export
├── Button.test.tsx      # Unit tests (Testing Library)
├── Button.ssr.test.tsx  # SSR tests (optional)
├── Button.stories.tsx   # Storybook stories (optional)
└── styles.css           # Component styles (optional)
```

And appends to `src/components/index.ts`:

```typescript
export * from "./Button";
```

#### Generated Component

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

#### Generated Types

```typescript
// types.ts
import type { HTMLAttributes, PropsWithChildren } from "react";

export interface ButtonProps
  extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {}
```

#### Generated Test

```tsx
// Button.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Hello</Button>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Button className="custom">Content</Button>);
    expect(screen.getByText("Content")).toHaveClass("custom");
  });
});
```

### Svelte

For `summon component svelte --component-path=src/lib/components/Card`:

```
src/lib/components/Card/
├── Card.svelte            # Svelte 5 component with runes
├── types.ts               # Props interface
├── index.ts               # Barrel export
├── Card.svelte.test.ts    # Unit tests
├── Card.ssr.test.ts       # SSR tests (optional)
├── Card.stories.svelte    # Storybook CSF (optional)
└── styles.css             # External styles (optional, or inline <style>)
```

#### Generated Component

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

---

## Options Reference

### React Options

| Flag | Description | Default |
|------|-------------|---------|
| `--component-path` | Full path for the component (e.g., `src/components/Button`) | Interactive prompt |
| `--with-styles` | Include `styles.css` file | `true` |
| `--no-with-styles` | Skip styles file | — |
| `--with-stories` | Include Storybook stories | `true` |
| `--no-with-stories` | Skip stories file | — |
| `--with-ssr-tests` | Include SSR test file | `true` |
| `--no-with-ssr-tests` | Skip SSR tests | — |

### Svelte Options

| Flag | Description | Default |
|------|-------------|---------|
| `--component-path` | Full path for the component (e.g., `src/lib/components/Card`) | Interactive prompt |
| `--with-styles` | Include inline `<style>` block | `true` |
| `--no-with-styles` | Skip styles | — |
| `--with-stories` | Include Storybook stories | `true` |
| `--no-with-stories` | Skip stories | — |
| `--use-ts-stories` | Use `.stories.ts` instead of `.stories.svelte` | `false` |
| `--with-ssr-tests` | Include SSR test file | `true` |
| `--no-with-ssr-tests` | Skip SSR tests | — |

### Global Options

| Flag | Description |
|------|-------------|
| `--dry-run`, `-d` | Preview without writing files |
| `--yes`, `-y` | Skip confirmation prompts |
| `--no-preview` | Skip the file preview step |
| `--help` | Show all options |

---

## Component Path Convention

The `--component-path` determines:
1. **Directory location** — where files are created
2. **Component name** — derived from the last path segment

```bash
--component-path=src/components/UserProfile
#                └──────────────┘└─────────┘
#                   directory      name: UserProfile
```

The component name is used as-is for PascalCase (class names) and converted for other cases:
- `UserProfile.tsx` (filename)
- `UserProfileProps` (types)
- `user-profile` (CSS class in styles)

---

## Barrel Export Auto-Update

The generator automatically appends an export to the parent directory's `index.ts`:

```bash
summon component react --component-path=src/components/Button
```

Appends to `src/components/index.ts`:

```typescript
export * from "./Button";
```

If the barrel file doesn't exist, it's created.

---

## Customization

### Override with Local Generators

Create a local generator to override the installed one. Local generators take precedence:

```
your-project/
└── generators/
    └── component/
        └── react/
            └── index.ts    # Your custom React component generator
```

Now `summon component react` uses your version.

### Extend the Base Generators

Import and compose with the existing generators:

```typescript
// generators/component/react/index.ts
import { generators } from "@canonical/summon-component";
import { sequence_, writeFile } from "@canonical/summon";

const baseGenerator = generators["component/react"];

export const generator = {
  ...baseGenerator,

  // Add custom prompts
  prompts: [
    ...baseGenerator.prompts,
    {
      name: "withI18n",
      type: "confirm",
      message: "Include i18n hooks?",
      default: false,
    },
  ],

  // Extend generation
  generate: (answers) => sequence_([
    // Run base generator
    baseGenerator.generate(answers),

    // Add your files
    answers.withI18n && writeFile(
      `${answers.componentPath}/useTranslations.ts`,
      `export const useTranslations = () => ({ t: (k: string) => k });\n`
    ),
  ].filter(Boolean)),
};

export const generators = {
  "component/react": generator,
};
```

### Modify Templates

Fork the package and edit templates in `src/react/templates/` or `src/svelte/templates/`. Templates use [EJS syntax](https://ejs.co/).

---

## Testing Your Components

The generated test files use Vitest and Testing Library. Run them with:

```bash
# If you have vitest configured
bun test

# Or specifically
bun vitest src/components/Button/Button.test.tsx
```

### SSR Tests

SSR tests verify the component renders without errors on the server:

```typescript
// Button.ssr.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Button>Click me</Button>);
    expect(html).toContain("Click me");
  });
});
```

---

## Storybook Integration

Generated stories work with Storybook 7+:

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "Components/Button",
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Click me",
  },
};
```

### Svelte CSF vs TypeScript Stories

By default, Svelte components get `.stories.svelte` files using [Svelte CSF](https://github.com/storybookjs/addon-svelte-csf). Use `--use-ts-stories` for traditional TypeScript stories if you prefer.

---

## Programmatic Usage

Use the generators in your own code:

```typescript
import { generators } from "@canonical/summon-component";
import { dryRun, getAffectedFiles } from "@canonical/summon";

const reactGenerator = generators["component/react"];

// Preview what would be created
const task = reactGenerator.generate({
  componentPath: "src/components/Button",
  withStyles: true,
  withStories: true,
  withSsrTests: false,
});

const { effects } = dryRun(task);
console.log("Would create:", getAffectedFiles(effects));
```

---

## Troubleshooting

### "Generator not found"

Ensure the package is installed and discoverable:

```bash
# Check if summon sees it
summon

# Should show:
# component [pkg] (has subtopics)
#   └─ react, svelte
```

If not, verify installation:

```bash
bun add @canonical/summon-component
```

### "Cannot find module @canonical/summon"

Install the peer dependency:

```bash
bun add @canonical/summon
```

### Barrel file not updated

The generator appends to `{parentDir}/index.ts`. If your project uses a different convention (e.g., `index.tsx` or no barrel), manually add the export.

---

## Related

- **[@canonical/summon](../summon/)** — The generator framework (required peer dependency)
- **[@canonical/summon-package](../summon-package/)** — Package scaffolding for the monorepo

## License

GPL-3.0
