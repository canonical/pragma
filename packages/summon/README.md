# Summon

A monadic task-centric code generator framework with React Ink CLI.

## What is Summon?

Summon is a next-generation code generator framework that replaces traditional imperative generator architectures (like Yeoman) with a principled functional design. It enables you to write testable, composable generators without mocking.

### Key Features

- **Tasks as Pure Functions**: Tasks return effect descriptions rather than performing effects directly
- **Monadic Composition**: Type-safe sequencing with automatic error propagation
- **Interpreter Pattern**: Multiple execution modes (production, dry-run, test) from the same generator
- **React Ink CLI**: Beautiful, interactive terminal UI
- **Built-in Dry-Run**: Preview what files will be created before execution

## Installation

```bash
# Using bun (recommended)
bun add @canonical/summon

# Using npm
npm install @canonical/summon
```

## Quick Start

### Try it immediately

```bash
# List available topics
summon

# See what's under a topic
summon component

# Create a new React component
summon component react

# Dry-run to see what would be created
summon component react --dry-run
```

### Create your own generator

```bash
# Initialize a simple generator
summon init my-generator

# Or create a nested generator (under a topic)
summon init component/vue

# This creates:
# generators/component/vue/
# ├── index.ts
# └── templates/
#     ├── index.ts.ejs
#     └── index.test.ts.ejs

# Run your generator
summon component vue
```

## CLI Commands

### `summon [topic] [subtopic...]`

Navigate the generator tree or run a generator.

```bash
summon                                  # List available topics
summon component                        # List generators under 'component'
summon component react                  # Run the component/react generator
summon component react --dry-run        # Preview without writing files
summon component react --yes            # Skip confirmation
summon component react --no-preview     # Skip file preview
summon component react --answers '{"componentPath":"src/Button"}' # Non-interactive
```

### `summon init <path>`

Create a new generator scaffold. Supports nested paths.

```bash
summon init my-generator                # Creates generators/my-generator/
summon init component/vue               # Creates generators/component/vue/
summon init --dir ./custom component/x  # Creates custom/component/x/
```

## Publishing Generator Packages

You can publish generators as npm packages for others to use. Summon automatically discovers packages from `node_modules`.

### Package Naming Convention

Name your package `summon-<topic>` or `@scope/summon-<topic>`:

```
summon-component     -> summon component ...
summon-api           -> summon api ...
@myorg/summon-utils  -> summon utils ...
```

### Package Structure

```
summon-component/
├── package.json
├── generators/
│   ├── react/
│   │   └── index.ts      # summon component react
│   ├── svelte/
│   │   └── index.ts      # summon component svelte
│   └── shared/           # Shared code (not a generator)
│       └── validation.ts
└── README.md
```

### Package.json Configuration

```json
{
  "name": "summon-component",
  "version": "1.0.0",
  "files": ["generators"]
}
```

Alternatively, use the `summon.topic` field to specify a custom topic name:

```json
{
  "name": "@myorg/ds-generators",
  "summon": {
    "topic": "component"
  },
  "files": ["generators"]
}
```

### Discovery Priority

Generators are discovered in this order (highest priority first):

1. `./generators/` - Local project generators
2. `./.generators/` - Local hidden generators
3. `node_modules/summon-*` - Installed packages
4. Built-in generators from `@canonical/summon`

Local generators always override installed packages, allowing project-specific customization.

## Writing Generators

### Basic Generator Structure

```typescript
import type { GeneratorDefinition } from "@canonical/summon";
import { writeFile, mkdir, info } from "@canonical/summon";
import { sequence_, when } from "@canonical/summon";

interface Answers {
  name: string;
  withTests: boolean;
}

export const generator: GeneratorDefinition<Answers> = {
  meta: {
    name: "my-generator",
    description: "Generate something awesome",
    version: "0.1.0",
  },

  prompts: [
    {
      name: "name",
      type: "text",
      message: "What is the name?",
    },
    {
      name: "withTests",
      type: "confirm",
      message: "Include tests?",
      default: true,
    },
  ],

  generate: (answers) => {
    return sequence_([
      info(`Generating ${answers.name}...`),
      mkdir(answers.name),
      writeFile(`${answers.name}/index.ts`, `export const ${answers.name} = {};`),
      when(
        answers.withTests,
        writeFile(`${answers.name}/index.test.ts`, `test("works", () => {});`)
      ),
      info("Done!"),
    ]);
  },
};

export default generator;
```

### Available Primitives

#### File System

```typescript
import {
  readFile,      // Read file contents
  writeFile,     // Write file (creates if not exists)
  appendFile,    // Append to file (creates if not exists)
  copyFile,      // Copy file
  copyDirectory, // Copy directory recursively
  deleteFile,    // Delete file
  deleteDirectory, // Delete directory
  mkdir,         // Create directory
  exists,        // Check if path exists
  glob,          // Find files matching pattern
} from "@canonical/summon";

// appendFile is great for barrel files (index.ts exports)
appendFile("src/index.ts", `export * from "./${name}.js";\n`);
```

#### Process

```typescript
import { exec, execSimple } from "@canonical/summon";

exec("npm", ["install"], "/path/to/dir");
execSimple("npm install");
```

#### Prompts

```typescript
import {
  promptText,
  promptConfirm,
  promptSelect,
  promptMultiselect,
} from "@canonical/summon";

promptText("name", "Enter your name:", "default");
promptConfirm("proceed", "Continue?", true);
promptSelect("choice", "Pick one:", [
  { label: "Option A", value: "a" },
  { label: "Option B", value: "b" },
]);
```

#### Logging

```typescript
import { debug, info, warn, error } from "@canonical/summon";

info("Creating files...");
warn("File already exists");
```

### Combinators

```typescript
import {
  sequence,      // Run tasks in order, collect results
  sequence_,     // Run tasks in order, discard results
  traverse,      // Map function over array, sequence results
  parallel,      // Run tasks concurrently
  when,          // Conditional execution
  unless,        // Negative conditional
  ifElse,        // If/else branching
  retry,         // Retry on failure
  orElse,        // Fallback on failure
  optional,      // Return undefined on failure
  bracket,       // Resource management (acquire/use/release)
} from "@canonical/summon";
```

### Templates

```typescript
import { template, templateDir, withHelpers } from "@canonical/summon";

// Single template
template({
  source: "./templates/component.tsx.ejs",
  dest: `./src/components/${name}.tsx`,
  vars: withHelpers({ name, description }),
});

// Directory of templates
templateDir({
  source: "./templates",
  dest: `./src/${name}`,
  vars: { name },
  rename: { "Component.tsx": `${name}.tsx` },
  ignore: ["*.md"],
});
```

### Testing Generators

Generators are pure and testable without mocking. Summon uses [Vitest](https://vitest.dev) for testing:

```bash
# Run tests
bun run test

# Watch mode for development
bun run test:watch

# With coverage report
bun run test:coverage
```

```typescript
import { describe, expect, it } from "vitest";
import { dryRun, expectTask, getAffectedFiles, filterEffects } from "@canonical/summon";
import { generator } from "./index";

describe("my-generator", () => {
  it("creates the expected files", () => {
    const task = generator.generate({
      name: "Button",
      withTests: true,
    });

    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("Button/index.ts");
    expect(files).toContain("Button/index.test.ts");
  });

  it("skips tests when disabled", () => {
    const task = generator.generate({
      name: "Button",
      withTests: false,
    });

    const matcher = expectTask(task);
    matcher.toWriteFile("Button/index.ts");
    matcher.toNotWriteFile("Button/index.test.ts");
  });

  it("verifies file content", () => {
    const task = generator.generate({
      name: "Button",
      withTests: true,
    });

    const { effects } = dryRun(task);
    const writes = filterEffects(effects, "WriteFile");

    const indexFile = writes.find((w) => w.path.endsWith("index.ts"));
    expect(indexFile?.content).toContain("export const Button");
  });
});
```

#### Testing Utilities

Summon provides comprehensive testing utilities:

```typescript
import {
  dryRun,              // Execute task collecting effects
  dryRunWithContext,   // Execute with initial context
  expectTask,          // Fluent assertion helper
  collectEffects,      // Get all effects from a task
  countEffects,        // Count effects by type
  filterEffects,       // Filter effects by type
  hasEffect,           // Check if effect exists
  getFileWrites,       // Get write operations
  getAffectedFiles,    // Get unique affected paths
  createTestContext,   // Create context for testing
} from "@canonical/summon";
```

#### expectTask Matchers

The `expectTask` helper provides fluent assertions:

```typescript
const matcher = expectTask(task);

// Value assertions
matcher.toHaveValue(42);
matcher.toBeSuccessful();
matcher.toBeFailed("ERR_CODE");

// Effect assertions
matcher.toHaveEffect("WriteFile");
matcher.toHaveEffectCount(5);

// File assertions
matcher.toWriteFile("/output/file.txt");
matcher.toWriteFile("/output/file.txt", "expected content");
matcher.toNotWriteFile("/unwanted/file.txt");
matcher.toReadFile("/input/file.txt");
matcher.toMakeDirectory("/output");

// Command assertions
matcher.toExecute("npm");
matcher.toExecute("npm", ["install", "--save-dev"]);

// Log assertions
matcher.toLog("Creating files...");
matcher.toLog("Warning!", "warn");
```

## CLI Flags

Each generator's prompts automatically become CLI flags:

```bash
# Run with flags
summon hello --name=my-project --greeting=Hello

# Boolean flags with default=true use --no-prefix to disable
summon hello --name=my-project --no-withReadme

# Combine with global options
summon hello --name=my-project --dry-run

# View generator-specific help (shows all available flags)
summon hello --help
```

**Global options:**
- `--dry-run`, `-d` - Preview without writing files
- `--yes`, `-y` - Skip confirmation prompts
- `--no-preview` - Skip the file preview
- `--generators`, `-g` - Load generators from a specific path (for testing)

**Reserved option names** (cannot be used as prompt names):
`help`, `version`, `dryRun`, `yes`, `output`, `preview`, `generators`, `run`, `init`

Use the `ForbidReserved` type for compile-time validation:

```typescript
import type { ForbidReserved, GeneratorDefinition } from "@canonical/summon";

interface MyAnswers {
  name: string;       // OK
  // help: string;    // Would cause compile error!
}

// TypeScript will error if any answer key is reserved
export const generator: GeneratorDefinition<ForbidReserved<MyAnswers>> = { ... };
```

## Understanding the Task Monad

The Task monad is the core abstraction that makes Summon generators pure, composable, and testable.

### What is a Task?

A `Task<A>` represents a computation that:
- May perform **effects** (write files, prompt user, etc.)
- May **fail** with an error
- Eventually produces a **value** of type `A`

```typescript
// A Task is one of three things:
type Task<A> =
  | { _tag: "Pure"; value: A }                     // Completed with a value
  | { _tag: "Effect"; effect: Effect; cont: ... }  // An effect to perform
  | { _tag: "Fail"; error: TaskError }             // Failed with an error
```

### Building Tasks

**Method 1: Using primitives (simplest)**

```typescript
import { writeFile, mkdir, info } from "@canonical/summon";

// Primitives return Task<something>
const createDir = mkdir("output");           // Task<void>
const write = writeFile("output/a.txt", ""); // Task<void>
const read = readFile("config.json");        // Task<string>
```

**Method 2: Using combinators**

```typescript
import { sequence_, when, parallel } from "@canonical/summon";

const task = sequence_([
  mkdir("output"),
  parallel([
    writeFile("output/a.txt", "A"),
    writeFile("output/b.txt", "B"),
  ]),
  when(includeReadme, writeFile("README.md", "# Hello")),
]);
```

**Method 3: Using the fluent builder with `.then()`**

```typescript
import { task, mkdir, writeFile, info } from "@canonical/summon";

// .then() chains tasks, discarding intermediate values (great for void tasks)
const myTask = task(info("Starting..."))
  .then(mkdir("output"))
  .then(writeFile("output/a.txt", "A"))
  .then(writeFile("output/b.txt", "B"))
  .then(info("Done!"))
  .unwrap();

// .flatMap() when you need the result of the previous task
const readAndTransform = task(readFile("input.txt"))
  .flatMap((content) => writeFile("output.txt", content.toUpperCase()))
  .unwrap();
```

### Creating Your Own Task Functions

You can create reusable task functions by composing existing primitives:

```typescript
import { sequence_, mkdir, writeFile, info, when } from "@canonical/summon";
import type { Task } from "@canonical/summon";

// A reusable function that returns a Task
const createPackage = (name: string, withTests: boolean): Task<void> => {
  return sequence_([
    info(`Creating package ${name}...`),
    mkdir(`packages/${name}/src`),
    writeFile(`packages/${name}/package.json`, JSON.stringify({
      name: `@myorg/${name}`,
      version: "1.0.0",
    }, null, 2)),
    writeFile(`packages/${name}/src/index.ts`, `export const ${name} = {};`),
    when(withTests, sequence_([
      mkdir(`packages/${name}/tests`),
      writeFile(`packages/${name}/tests/index.test.ts`, `test("works", () => {});`),
    ])),
  ]);
};

// Use it in a generator
export const generator: GeneratorDefinition<Answers> = {
  // ...
  generate: (answers) => createPackage(answers.name, answers.withTests),
};
```

### Monadic Operations

```typescript
import { flatMap, map, pure, fail, recover } from "@canonical/summon";

// flatMap: Chain tasks together
const task = flatMap(readFile("config.json"), (content) => {
  const config = JSON.parse(content);
  return writeFile("output.json", JSON.stringify(config, null, 2));
});

// map: Transform the result
const task2 = map(readFile("data.txt"), (content) => content.toUpperCase());

// recover: Handle errors
const task3 = recover(readFile("maybe-missing.txt"), (error) => {
  return pure("default content");
});
```

### Creating Custom Effects

For advanced use cases, you can create custom effect types:

```typescript
import { effect, pure, flatMap } from "@canonical/summon";
import type { Task, Effect } from "@canonical/summon";

// 1. Create an effect primitive
const sendNotification = (message: string): Task<void> => {
  // For effects that don't need interpreter support,
  // implement them directly:
  return flatMap(
    exec("notify-send", [message]),
    () => pure(undefined)
  );
};

// 2. Or compose from existing effects
const ensureDirectoryAndWrite = (path: string, content: string): Task<void> => {
  const dir = path.substring(0, path.lastIndexOf("/"));
  return sequence_([
    mkdir(dir),
    writeFile(path, content),
  ]);
};
```

## Programmatic API

```typescript
import { run, dryRun } from "@canonical/summon";
import { generator } from "./generators/my-generator";

// Run with custom answers
const task = generator.generate({ name: "Button", withTests: true });

// Dry-run to preview
const { effects, value } = dryRun(task);
console.log("Would create:", effects.length, "files");

// Actually execute
await run(task);
```

## Built-in Generators

### hello (Demo)

A simple demo generator showcasing basic Summon features:

```bash
# Zero-config: interactive prompts with sensible defaults
summon hello

# Minimal: just specify the name, defaults for the rest
summon hello --name=my-app

# Partial: customize specific options
summon hello --name=my-app --greeting=Hey

# Skip optional files
summon hello --name=my-app --no-with-readme

# Preview what would be generated
summon hello --dry-run

# Full non-interactive (CI/scripting)
summon hello --name=demo --greeting=Hello --description='A demo' --yes

# See all options
summon hello --help
```

This generator demonstrates:
- EJS templates with `withHelpers()` for case transformations
- Conditional file generation with `when()`
- Sequential composition with `sequence_()`

### webapp (Advanced Demo)

A comprehensive demo generator showcasing the full power of Summon:

```bash
# Zero-config: uses all defaults, shows interactive prompts
summon webapp

# Minimal: just the project name
summon webapp --name=my-app

# Partial: specify stack choices
summon webapp --name=my-app --framework=react --styling=tailwind

# Add feature modules
summon webapp --name=my-app --features=router,state,api

# Full non-interactive (CI/scripting)
summon webapp --name=my-app --framework=react --styling=tailwind \
  --features=router,state --no-with-docs --yes

# Preview without writing files
summon webapp --dry-run

# See all options with groups
summon webapp --help
```

This generator demonstrates:

**Effects:**
- File Operations: `readFile`, `writeFile`, `copyFile`, `mkdir`, `exists`
- Process Execution: `exec` (npm/bun commands)
- Logging: `info`, `warn`, `debug`
- Context: `getContext`, `setContext` (for passing data between tasks)

**Combinators:**
- `sequence_`: Sequential task composition
- `parallel`: Concurrent task execution
- `traverse_`: Mapping over arrays with tasks
- `when`/`ifElse`: Conditional task execution
- `orElse`: Error recovery with fallbacks
- `flatMap`/`map`: Monadic composition

**Templates:**
- EJS templates with `withHelpers` (camelCase, pascalCase, etc.)
- Conditional template sections
- Dynamic content based on answers

Use this as a reference when building complex generators.

## Combinators Reference

| Combinator | Description |
|------------|-------------|
| `sequence([t1, t2])` | Run in order, collect results as tuple |
| `sequence_([t1, t2])` | Run in order, discard results |
| `parallel([t1, t2])` | Run concurrently, collect results |
| `parallelN(2, tasks)` | Run with concurrency limit |
| `race([t1, t2])` | First to complete wins |
| `when(cond, task)` | Run if condition is true |
| `unless(cond, task)` | Run if condition is false |
| `ifElse(cond, t1, t2)` | Branching |
| `orElse(task, fallback)` | Fallback on error |
| `retry(3, task)` | Retry on failure |
| `attempt(task)` | Convert error to value |
| `bracket(acq, rel, use)` | Resource management |
| `tap(task, fn)` | Side effect without changing value |
| `traverse(arr, fn)` | Map and sequence |

## License

GPL-3.0
