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

# Pass answers as flags
summon component react --component-path=src/components/Button

# Preview first (nothing written to disk)
summon component react --component-path=src/components/Button --dry-run
```

Every prompt becomes a CLI flag. Boolean prompts with `default: true` use the `--no-` prefix to disable.

### Installing Generator Packages

Generator packages follow the naming convention `summon-*` or `@scope/summon-*`:

```bash
# Install a generator package
bun add @canonical/summon-component

# Now available
summon component react
summon component svelte
```

## Creating Generators

A generator is a pure function that takes answers and returns a `Task`—a data structure describing what to do.

```typescript
// src/index.ts
import type { GeneratorDefinition, AnyGenerator } from "@canonical/summon";
import { writeFile, mkdir, sequence_, when } from "@canonical/summon";

interface Answers {
  name: string;
  withTests: boolean;
}

const generator: GeneratorDefinition<Answers> = {
  meta: {
    name: "module",
    description: "Creates a new module",
    version: "0.1.0",
  },

  prompts: [
    { name: "name", type: "text", message: "Module name:" },
    { name: "withTests", type: "confirm", message: "Include tests?", default: true },
  ],

  generate: (answers) => sequence_([
    mkdir(`src/${answers.name}`),
    writeFile(`src/${answers.name}/index.ts`, `export const ${answers.name} = {};\n`),
    when(answers.withTests,
      writeFile(`src/${answers.name}/index.test.ts`, `test("works", () => {});\n`)
    ),
  ]),
};

export const generators: Record<string, AnyGenerator> = {
  "module": generator,
};
```

### Package Structure

```
my-summon-package/
├── package.json
├── src/
│   ├── index.ts          # Exports generators record
│   └── templates/        # EJS templates (optional)
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
summon module --name=utils
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

## Documentation

- **[Tutorial](docs/tutorial.md)** — Build your first generator from scratch
- **[How-To Guides](docs/how-to.md)** — Solve specific problems
- **[Reference](docs/reference.md)** — Complete API documentation
- **[Explanation](docs/explanation.md)** — Why effects as data? The ideas behind Summon

## License

GPL-3.0
