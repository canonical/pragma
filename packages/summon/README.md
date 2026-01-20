# Summon

A code generator framework where generators are pure functions that return data, not side effects.

Write a generator once. Run it for real. Preview with `--dry-run`. Test without mocks. Same code, different interpreters.

```typescript
generate: (answers) => writeFile(`src/${answers.name}.ts`, code)
// Returns a Task describing "write this file"
// Not a file write. Data.
```

## Installation

```bash
bun add @canonical/summon
```

## Using Generators

Summon discovers generators from installed packages automatically.

```bash
# See what's available
summon

# Run a generator interactively
summon component react

# Pass answers as positional argument (when supported)
summon component react src/components/Button

# Or as a flag
summon component react --component-path=src/components/Button

# Preview first (nothing written to disk)
summon component react src/components/Button --dry-run

# Show debug output
summon component react src/components/Button --verbose
```

Every prompt becomes a CLI flag. Boolean prompts with `default: true` use the `--no-` prefix to disable. Generators may also define a **positional argument** for their primary input (like a path), allowing cleaner command invocations.

### CLI Options

| Flag | Description |
|------|-------------|
| `-d, --dry-run` | Preview without writing files |
| `-y, --yes` | Skip confirmation prompts |
| `-v, --verbose` | Show debug output |
| `--no-preview` | Skip the file preview |
| `--no-generated-stamp` | Disable generated file stamp comments |

### Shell Autocompletion

Summon supports TAB completion for Bash, Zsh, and Fish shells. Completions are **dynamic** - they automatically detect newly installed generator packages without needing to re-run setup.

```bash
# Automatic setup (recommended)
summon --setup-completion

# Or manual installation for each shell:

# Zsh
echo '. <(summon --completion)' >> ~/.zshrc

# Bash (may need: brew install bash-completion on macOS)
summon --completion >> ~/.summon-completion.sh
echo 'source ~/.summon-completion.sh' >> ~/.bash_profile

# Fish
echo 'summon --completion-fish | source' >> ~/.config/fish/config.fish
```

After setup, restart your shell or source the config file. Then:

```bash
summon <TAB>                    # Shows: component, init, ...
summon component <TAB>          # Shows: react, svelte
summon component react <TAB>    # Shows: --component-path, --no-with-styles, ...
summon component react --comp<TAB>  # Completes to: --component-path
```

Completion features:
- **Generator names** - Navigate the command tree with TAB
- **Generator flags** - All prompts become completable flags
- **Confirm prompts** - Shows `--no-X` for prompts with `default: true`
- **Select/multiselect** - Completes with available choices
- **Path prompts** - Filesystem path completion for prompts containing "path", "dir", "file", etc.

To remove autocompletion:

```bash
summon --cleanup-completion
```

### Positional Arguments

Generators can define one prompt as a **positional argument**, allowing users to provide the primary input without a flag:

```bash
# With positional argument support
summon component react src/components/Button

# Equivalent to
summon component react --component-path=src/components/Button
```

Positional arguments also get filesystem path completion when using TAB:

```bash
summon component react src/comp<TAB>  # Completes to: src/components/
```

### Installing Generator Packages

Generator packages follow the naming convention `summon-*` or `@scope/summon-*`:

```bash
# Install a generator package
bun add @canonical/summon-component

# Now available (completions work immediately!)
summon component react
summon component svelte
```

## Creating Generators

A generator is a pure function that takes answers and returns a `Task`—a data structure describing what to do.

```typescript
// src/module/types.ts
interface ModuleAnswers {
  name: string;
  withTests: boolean;
}

// src/module/generator.ts
import type { GeneratorDefinition } from "@canonical/summon";
import { debug, info, writeFile, mkdir, sequence_, when } from "@canonical/summon";
import type { ModuleAnswers } from "./types.js";

export const generator = {
  meta: {
    name: "module",
    description: "Creates a new module",
    version: "0.1.0",
  },

  prompts: [
    // positional: true allows `summon module src/utils` instead of `--name=src/utils`
    { name: "name", type: "text", message: "Module name:", positional: true },
    { name: "withTests", type: "confirm", message: "Include tests?", default: true },
  ],

  generate: (answers) => sequence_([
    info(`Creating module: ${answers.name}`),

    debug("Creating module directory"),
    mkdir(`src/${answers.name}`),

    debug("Creating index file"),
    writeFile(`src/${answers.name}/index.ts`, `export const ${answers.name} = {};\n`),

    when(answers.withTests, debug("Creating test file")),
    when(answers.withTests,
      writeFile(`src/${answers.name}/index.test.ts`, `test("works", () => {});\n`)
    ),

    info(`Created module at src/${answers.name}`),
  ]),
} as const satisfies GeneratorDefinition<ModuleAnswers>;

// src/module/index.ts (barrel)
export { generator } from "./generator.js";
export type { ModuleAnswers } from "./types.js";

// src/index.ts (package barrel)
import type { AnyGenerator } from "@canonical/summon";
import { generator as moduleGenerator } from "./module/index.js";

export const generators = {
  "module": moduleGenerator,
} as const satisfies Record<string, AnyGenerator>;
```

### Package Structure

Each generator should be split into three files for maintainability:

```
my-summon-package/
├── package.json
├── src/
│   ├── index.ts              # Package barrel - exports generators record
│   ├── module/
│   │   ├── index.ts          # Generator barrel
│   │   ├── types.ts          # Answer types
│   │   └── generator.ts      # Generator definition
│   └── templates/            # EJS templates (optional)
└── README.md
```

```json
{
  "name": "@myorg/summon-module",
  "main": "src/index.ts",
  "peerDependencies": {
    "@canonical/summon": "workspace:*"
  }
}
```

### Local Development

For developing generators locally, link them to make them globally available:

```bash
# From your generator package directory
cd /path/to/my-summon-package
bun link        # for bun
npm link        # for npm

# Now available everywhere
summon module src/utils
```

Project-local packages (in `./node_modules`) take precedence over globally linked ones, so you can override with project-specific versions.

### Testing Generators

Because generators return data, testing is straightforward—no mocks needed:

```typescript
import { dryRun, getAffectedFiles } from "@canonical/summon";
import { generators } from "./index";

const generator = generators["module"];

test("creates expected files", () => {
  const task = generator.generate({ name: "utils", withTests: true });
  const { effects } = dryRun(task);

  expect(getAffectedFiles(effects)).toEqual([
    "src/utils/index.ts",
    "src/utils/index.test.ts",
  ]);
});

test("skips test file when disabled", () => {
  const task = generator.generate({ name: "utils", withTests: false });
  const { effects } = dryRun(task);

  expect(getAffectedFiles(effects)).not.toContain("src/utils/index.test.ts");
});
```

The dry-run interpreter maintains a virtual filesystem, so conditional logic based on `exists()` works correctly even without touching the disk.

## The Monadic Pattern

Summon uses a **monad** to compose tasks. If you've used Promises, you already understand the core idea.

### What's a Monad?

A monad is a design pattern for chaining operations that have some context (like "might fail" or "has effects"). Think of it as a pipeline where each step can:

1. **Transform values** (`map`) — Apply a function to the result
2. **Chain operations** (`flatMap`) — Use the result to create the next step
3. **Short-circuit on failure** — Errors propagate automatically

```typescript
// Promise (async context)
fetchUser(id)
  .then(user => fetchOrders(user.id))    // chain
  .then(orders => orders.length)          // transform
  .catch(handleError);                    // recover

// Task (effect context)
task(readFile("config.json"))
  .map(content => JSON.parse(content))    // transform
  .flatMap(config => writeFile(           // chain
    config.outputPath,
    generateCode(config)
  ))
  .recover(err => pure(defaultConfig));   // recover
```

### The Task Type

`Task<A>` represents a computation that:
- Describes effects (file I/O, shell commands, etc.)
- Eventually produces a value of type `A`
- May fail with an error

```typescript
// A Task is one of three things:
type Task<A> =
  | { _tag: "Pure"; value: A }                           // Done, here's the value
  | { _tag: "Fail"; error: TaskError }                   // Failed with error
  | { _tag: "Effect"; effect: Effect; cont: ... }        // Do this effect, then continue
```

### Composing Tasks

The `TaskBuilder` provides a fluent API for composition:

```typescript
import { task, pure } from "@canonical/summon";

// Build a pipeline
const pipeline = task(readFile("input.txt"))
  .map(content => content.toUpperCase())           // Transform the value
  .flatMap(upper => writeFile("output.txt", upper)) // Chain another effect
  .andThen(info("Done!"))                          // Sequence (ignore previous value)
  .recover(err => pure(void 0));                   // Handle errors

// pipeline is still just data — nothing has executed yet
```

### Key Operations

| Operation | Description | Example |
|-----------|-------------|---------|
| `pure(value)` | Wrap a value in a Task | `pure(42)` |
| `map(fn)` | Transform the result | `.map(x => x * 2)` |
| `flatMap(fn)` | Chain with another Task | `.flatMap(x => writeFile(...))` |
| `andThen(task)` | Sequence, discard previous | `.andThen(info("next"))` |
| `recover(fn)` | Handle errors | `.recover(e => pure(default))` |
| `tap(fn)` | Side effect, keep value | `.tap(x => debug(x))` |

### Why Monads for Generators?

1. **Composable** — Small tasks combine into complex workflows
2. **Predictable** — Errors propagate without explicit handling at each step
3. **Testable** — The pipeline is data; inspect it without running effects
4. **Declarative** — Describe *what* to do, not *how* to do it

```typescript
// Complex workflow, reads like a recipe
const scaffoldFeature = (name: string) =>
  task(mkdir(`src/features/${name}`))
    .andThen(template({
      source: "templates/feature.ts.ejs",
      dest: `src/features/${name}/index.ts`,
      vars: { name },
    }))
    .andThen(when(config.withTests,
      template({
        source: "templates/test.ts.ejs",
        dest: `src/features/${name}/index.test.ts`,
        vars: { name },
      })
    ))
    .andThen(info(`Created feature: ${name}`))
    .unwrap();
```

For a deeper dive into the "effects as data" philosophy, see [Explanation](docs/explanation.md).

## Templating Engine

Summon uses EJS by default for template rendering, but supports custom templating engines via the `TemplatingEngine` interface.

### Default (EJS)

```typescript
import { template, templateDir } from "@canonical/summon";

// Uses EJS by default
template({
  source: "templates/component.tsx.ejs",
  dest: "src/components/<%= name %>.tsx",
  vars: { name: "Button" },
});
```

### Custom Engines

Implement `TemplatingEngine` to use Handlebars, Mustache, Nunjucks, or any other engine:

```typescript
import type { TemplatingEngine } from "@canonical/summon";
import Handlebars from "handlebars";
import * as fs from "node:fs/promises";

const handlebarsEngine: TemplatingEngine = {
  render(template, vars) {
    return Handlebars.compile(template)(vars);
  },

  async renderAsync(template, vars) {
    return Handlebars.compile(template)(vars);
  },

  async renderFile(templatePath, vars) {
    const content = await fs.readFile(templatePath, "utf-8");
    return Handlebars.compile(content)(vars);
  },
};

// Use in templates
template({
  source: "templates/component.hbs",
  dest: "src/components/{{name}}.tsx",
  vars: { name: "Button" },
  engine: handlebarsEngine,
});
```

### Interface

```typescript
interface TemplatingEngine {
  /** Render a template string synchronously */
  render(template: string, vars: Record<string, unknown>): string;

  /** Render a template string asynchronously */
  renderAsync(template: string, vars: Record<string, unknown>): Promise<string>;

  /** Render a template file asynchronously */
  renderFile(templatePath: string, vars: Record<string, unknown>): Promise<string>;
}
```

The `engine` option is available on `template()`, `templateDir()`, `renderString()`, `renderStringAsync()`, and `renderFile()`.

## Documentation

- **[Tutorial](docs/tutorial.md)** — Build your first generator from scratch
- **[How-To Guides](docs/how-to.md)** — Solve specific problems
- **[Reference](docs/reference.md)** — Complete API documentation
- **[Explanation](docs/explanation.md)** — Why effects as data? The ideas behind Summon

## License

GPL-3.0
