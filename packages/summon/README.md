# Summon

A functional code generator framework for teams who value testability and composition.

## Why Summon?

Traditional generators (Yeoman, Plop, Hygen) mix *what* to generate with *how* to execute it. This makes them hard to test, difficult to compose, and impossible to preview reliably.

Summon takes a different approach: generators describe effects as data, and interpreters execute them. This separation gives you:

- **Dry-run that actually works** - Preview exactly what files will be created, not approximations
- **Tests without mocking** - Run your generator logic without touching the filesystem
- **Composable tasks** - Build complex generators from simple, reusable pieces
- **Type-safe prompts** - CLI flags are generated from your prompt definitions

## Installation

```bash
bun add @canonical/summon
```

## Getting Started

### 1. Run a generator

```bash
# See what's available
summon

# Run the example generator
summon example hello

# Preview without writing files
summon example hello --dry-run
```

### 2. Create your first generator

```bash
# Scaffold a new generator
summon init --generator-path=my-generator

# Preview what would be created
summon init --generator-path=my-generator --dry-run

# Creates:
# generators/my-generator/
# ├── index.ts
# └── templates/
#     ├── index.ts.ejs
#     └── index.test.ts.ejs

# Nested generators work too
summon init --generator-path=component/vue
# Creates generators/component/vue/
```

### 3. Customize it

Edit `generators/my-generator/index.ts`:

```typescript
import type { GeneratorDefinition } from "@canonical/summon";
import { sequence_, mkdir, writeFile, info, when } from "@canonical/summon";

interface Answers {
  name: string;
  withTests: boolean;
}

export const generator: GeneratorDefinition<Answers> = {
  meta: {
    name: "my-generator",
    description: "Creates a new module",
    version: "0.1.0",
  },

  prompts: [
    { name: "name", type: "text", message: "Module name:" },
    { name: "withTests", type: "confirm", message: "Include tests?", default: true },
  ],

  generate: (answers) => sequence_([
    info(`Creating ${answers.name}...`),
    mkdir(`src/${answers.name}`),
    writeFile(`src/${answers.name}/index.ts`, `export const ${answers.name} = {};\n`),
    when(answers.withTests,
      writeFile(`src/${answers.name}/index.test.ts`, `test("works", () => {});\n`)
    ),
  ]),
};

export default generator;
```

### 4. Run it

```bash
# Interactive mode
summon my-generator

# With CLI flags (auto-generated from prompts)
summon my-generator --name=utils --with-tests

# Preview what would be created
summon my-generator --name=utils --dry-run
```

## Core Concepts

### Tasks describe effects, interpreters execute them

A generator's `generate` function returns a `Task` - a description of what to do, not the execution itself:

```typescript
generate: (answers) => sequence_([
  mkdir("output"),                           // Describes: create directory
  writeFile("output/index.ts", "..."),       // Describes: write file
  exec("npm", ["install"]),                  // Describes: run command
])
```

The interpreter then decides *how* to execute these effects:
- **Production**: Actually perform file operations
- **Dry-run**: Collect effects without executing
- **Test**: Verify effects match expectations

### Prompts become CLI flags

Every prompt in your generator automatically becomes a CLI flag:

```typescript
prompts: [
  { name: "projectName", type: "text", message: "Project name:" },
  { name: "withTests", type: "confirm", default: true },
]
```

```bash
summon my-generator --project-name=my-app --no-with-tests
```

Boolean prompts with `default: true` use the `--no-` prefix to disable.

### Composition with combinators

Build complex workflows from simple pieces:

```typescript
import { sequence_, parallel, when, traverse_, ifElse, orElse } from "@canonical/summon";

// Sequential operations
sequence_([task1, task2, task3])

// Parallel operations
parallel([downloadA, downloadB, downloadC])

// Conditional execution
when(answers.withTests, createTestFiles)

// Branching
ifElse(exists("package.json"), updatePackage, createPackage)

// Error recovery
orElse(readConfig, () => pure(defaultConfig))

// Process arrays
traverse_(features, (feature) => installFeature(feature))
```

## Testing Generators

Generators are pure and testable without mocking:

```typescript
import { describe, expect, it } from "vitest";
import { dryRun, getAffectedFiles, filterEffects } from "@canonical/summon";
import { generator } from "./index";

describe("my-generator", () => {
  it("creates expected files", () => {
    const task = generator.generate({ name: "utils", withTests: true });
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("src/utils/index.ts");
    expect(files).toContain("src/utils/index.test.ts");
  });

  it("skips tests when disabled", () => {
    const task = generator.generate({ name: "utils", withTests: false });
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).not.toContain("src/utils/index.test.ts");
  });

  it("writes correct content", () => {
    const task = generator.generate({ name: "utils", withTests: true });
    const { effects } = dryRun(task);
    const writes = filterEffects(effects, "WriteFile");

    const indexFile = writes.find(w => w.path.endsWith("index.ts"));
    expect(indexFile?.content).toContain("export const utils");
  });
});
```

Run tests:

```bash
bun run test
```

## Publishing Generators

Share generators as npm packages. Summon auto-discovers packages named `summon-*` or `@scope/summon-*`.

### Package structure

```
@myorg/summon-component/
├── package.json        # "main": "src/index.ts"
├── src/
│   ├── index.ts       # Barrel exporting generators
│   ├── react/
│   │   └── index.ts   # component/react generator
│   └── svelte/
│       └── index.ts   # component/svelte generator
└── README.md
```

### Barrel export

```typescript
// src/index.ts
import type { AnyGenerator } from "@canonical/summon";
import { generator as reactGenerator } from "./react/index.js";
import { generator as svelteGenerator } from "./svelte/index.js";

export const generators: Record<string, AnyGenerator> = {
  "component/react": reactGenerator as unknown as AnyGenerator,
  "component/svelte": svelteGenerator as unknown as AnyGenerator,
};
```

### Package.json

```json
{
  "name": "@myorg/summon-component",
  "main": "src/index.ts",
  "peerDependencies": {
    "@canonical/summon": "^0.1.0"
  }
}
```

### Using published generators

```bash
bun add @myorg/summon-component

# Generators are now available
summon component react
summon component svelte
```

## Discovery Priority

Generators are discovered in order (first match wins):

1. `./generators/` - Local project generators
2. `./.generators/` - Hidden local generators
3. `node_modules/summon-*` - Installed packages
4. Built-in example generators

Local generators override installed ones, enabling project-specific customization.

## API Reference

### Primitives

```typescript
// File system
readFile(path)                    // Task<string>
writeFile(path, content)          // Task<void>
appendFile(path, content)         // Task<void>
copyFile(src, dest)               // Task<void>
copyDirectory(src, dest)          // Task<void>
deleteFile(path)                  // Task<void>
deleteDirectory(path)             // Task<void>
mkdir(path)                       // Task<void>
exists(path)                      // Task<boolean>
glob(pattern, cwd?)               // Task<string[]>

// Process
exec(cmd, args?, cwd?)            // Task<ExecResult>
execSimple(command)               // Task<ExecResult>

// Logging
info(message)                     // Task<void>
warn(message)                     // Task<void>
error(message)                    // Task<void>
debug(message)                    // Task<void>

// Prompts (for dynamic prompts during generation)
promptText(name, message, default?)
promptConfirm(name, message, default?)
promptSelect(name, message, choices)
promptMultiselect(name, message, choices)
```

### Combinators

```typescript
// Sequencing
sequence([t1, t2])                // Task<[A, B]> - collect results
sequence_([t1, t2])               // Task<void> - discard results

// Parallelism
parallel([t1, t2])                // Task<[A, B]> - concurrent
parallelN(n, tasks)               // Task<A[]> - with concurrency limit
race([t1, t2])                    // Task<A> - first to complete

// Conditionals
when(condition, task)             // Task<void | A>
unless(condition, task)           // Task<void | A>
ifElse(condition, thenTask, elseTask)

// Error handling
orElse(task, fallback)            // Try task, use fallback on error
retry(n, task)                    // Retry n times on failure
attempt(task)                     // Task<Either<Error, A>>
optional(task)                    // Task<A | undefined>

// Arrays
traverse(array, fn)               // Task<B[]> - map and collect
traverse_(array, fn)              // Task<void> - map and discard

// Utilities
tap(task, fn)                     // Run fn with result, return original
delay(ms, task)                   // Wait before running
timeout(ms, task)                 // Fail if takes too long
bracket(acquire, release, use)    // Resource management
```

### Templates

```typescript
import { template, templateDir, withHelpers } from "@canonical/summon";

// Single template file
template({
  source: "./templates/component.tsx.ejs",
  dest: `src/components/${name}.tsx`,
  vars: withHelpers({ name, description }),
})

// Directory of templates
templateDir({
  source: "./templates",
  dest: `src/${name}`,
  vars: { name },
  rename: { "Component.tsx": `${name}.tsx` },
})
```

Template helpers available via `withHelpers()`:

- `camelCase(str)` - myComponent
- `pascalCase(str)` - MyComponent
- `kebabCase(str)` - my-component
- `snakeCase(str)` - my_component
- `constantCase(str)` - MY_COMPONENT

### CLI Flags

```bash
# Global options
--dry-run, -d          # Preview without writing
--yes, -y              # Skip confirmations
--no-preview           # Skip file preview
--generators, -g       # Custom generators path

# Generator help
summon my-generator --help
```

## Migrating from Other Tools

### From Hygen

Hygen uses frontmatter-based templates with shell injection. Summon uses typed generators with explicit effects.

**Hygen:**
```ejs
---
to: src/components/<%= name %>/index.tsx
---
export const <%= name %> = () => <div><%= name %></div>;
```

**Summon:**
```typescript
// generators/component/index.ts
import { template, withHelpers } from "@canonical/summon";

generate: (answers) => template({
  source: "./templates/index.tsx.ejs",
  dest: `src/components/${answers.name}/index.tsx`,
  vars: withHelpers({ name: answers.name }),
})

// templates/index.tsx.ejs
export const <%= name %> = () => <div><%= name %></div>;
```

**Key differences:**
- Prompts are defined in TypeScript, not frontmatter
- File paths are computed in code, not embedded in templates
- Effects are explicit and testable
- Templates use standard EJS (same syntax, cleaner separation)

### From Yeoman

Yeoman uses class-based generators with imperative file operations. Summon uses functional composition with declarative effects.

**Yeoman:**
```javascript
class MyGenerator extends Generator {
  prompting() {
    return this.prompt([
      { type: 'input', name: 'name', message: 'Name:' }
    ]).then(answers => { this.answers = answers; });
  }

  writing() {
    this.fs.copyTpl(
      this.templatePath('index.js'),
      this.destinationPath(`${this.answers.name}/index.js`),
      this.answers
    );
  }
}
```

**Summon:**
```typescript
export const generator: GeneratorDefinition<Answers> = {
  prompts: [
    { name: "name", type: "text", message: "Name:" }
  ],

  generate: (answers) => template({
    source: "./templates/index.js.ejs",
    dest: `${answers.name}/index.js`,
    vars: answers,
  }),
};
```

**Key differences:**
- No classes, just data and functions
- Prompts and generation are declarative
- Built-in dry-run that actually works
- Testable without mocking the filesystem

### Migration checklist

1. **Move prompts** from frontmatter/class methods to the `prompts` array
2. **Convert templates** - EJS syntax is compatible, just remove frontmatter
3. **Replace file operations** with Summon primitives (`writeFile`, `template`, etc.)
4. **Replace conditionals** with `when()`, `ifElse()` combinators
5. **Add tests** using `dryRun()` - no mocking required

## License

GPL-3.0
