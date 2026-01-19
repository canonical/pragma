# Summon

A functional code generator framework built on the principle that **effects should be data, not actions**.

## The Problem with Traditional Generators

Code generators like Yeoman, Plop, and Hygen execute file operations immediately when you call them. This creates three fundamental problems:

1. **Dry-run is unreliable.** Most generators implement `--dry-run` by wrapping filesystem calls with a "don't actually write" flag. But if your generator has conditional logic (`if file exists, then...`), the dry-run can't accurately predict what will happen because it can't know what files exist without checking.

2. **Testing requires mocking.** To test a generator, you need to mock the filesystem, intercept shell commands, and simulate user input. This is brittle and often doesn't catch real bugs.

3. **Composition is awkward.** Building a complex generator from smaller pieces means manually orchestrating async operations, handling errors at each step, and passing state between functions.

## Summon's Approach: Effects as Data

Summon separates *describing* what to do from *doing* it. A generator returns a `Task` — a data structure representing the operations to perform:

```typescript
generate: (answers) => sequence_([
  mkdir("src/components"),                    // Returns Task<void>, doesn't create directory yet
  writeFile("src/components/Button.tsx", code), // Returns Task<void>, doesn't write yet
  when(answers.withTests,
    writeFile("src/components/Button.test.tsx", testCode)
  ),
])
```

This `Task` is then interpreted by different executors:

| Executor | Behavior |
|----------|----------|
| **Production** | Actually performs all file operations |
| **Dry-run** | Collects operations into a list, tracks virtual filesystem state |
| **Test** | Returns effects for assertions, no I/O |

Because dry-run maintains a virtual filesystem, it correctly handles `exists()` checks — if your generator creates a file and later checks if it exists, the dry-run knows it "exists" even though nothing was written to disk.

## Installation

```bash
bun add @canonical/summon
```

## Quick Start

```bash
# See available generators
summon

# Run a generator (from an installed package)
summon component react --component-path=src/components/Button

# Preview without writing files
summon component react --component-path=src/components/Button --dry-run
```

## Creating a Generator Package

Generators are distributed as npm packages named `summon-*` or `@scope/summon-*`.

### Package Structure

```
@myorg/summon-module/
├── package.json
├── src/
│   ├── index.ts          # Barrel export
│   └── templates/        # EJS templates (optional)
└── README.md
```

### Generator Definition

```typescript
// src/index.ts
import type { GeneratorDefinition, AnyGenerator } from "@canonical/summon";
import { sequence_, mkdir, writeFile, info, when } from "@canonical/summon";

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
    info(`Creating ${answers.name}...`),
    mkdir(`src/${answers.name}`),
    writeFile(`src/${answers.name}/index.ts`, `export const ${answers.name} = {};\n`),
    when(answers.withTests,
      writeFile(`src/${answers.name}/index.test.ts`, `test("works", () => {});\n`)
    ),
  ]),
};

// Barrel export: maps command paths to generators
export const generators: Record<string, AnyGenerator> = {
  "module": generator,
};
```

### package.json

```json
{
  "name": "@myorg/summon-module",
  "main": "src/index.ts",
  "peerDependencies": {
    "@canonical/summon": "^0.1.0"
  }
}
```

### Using Your Package

```bash
# Install in a project
bun add @myorg/summon-module

# Generators are now available
summon module --name=utils --with-tests

# Or link globally (from your package directory)
cd /path/to/summon-module
bun link        # for bun users
npm link        # for npm users

# Now available everywhere
summon module --name=utils
```

## Core Concepts

### Tasks and Effects

A `Task<A>` represents a computation that may perform effects and eventually produce a value of type `A`. Tasks are built from primitives:

```typescript
const task: Task<void> = sequence_([
  mkdir("output"),           // Effect: MakeDir
  writeFile("output/a.txt", "hello"),  // Effect: WriteFile
  exec("npm", ["install"]),  // Effect: Exec
]);
```

Each primitive creates an **effect** — a plain object describing the operation:

```typescript
{ _tag: "MakeDir", path: "output", recursive: true }
{ _tag: "WriteFile", path: "output/a.txt", content: "hello" }
{ _tag: "Exec", command: "npm", args: ["install"] }
```

The interpreter pattern means you can inspect, transform, or execute these effects however you want.

### Combinators

Combinators compose tasks into larger tasks:

```typescript
// Sequential: run in order, collect results
const both: Task<[string, string]> = sequence([readFile("a.txt"), readFile("b.txt")]);

// Sequential: run in order, discard results
const setup: Task<void> = sequence_([mkdir("dist"), mkdir("dist/assets")]);

// Parallel: run concurrently
const files: Task<[string, string, string]> = parallel([
  readFile("a.txt"),
  readFile("b.txt"),
  readFile("c.txt"),
]);

// Conditional: only run if condition is true
const maybeTest: Task<void> = when(answers.withTests, writeFile("test.ts", code));

// Branching: choose based on condition
const config: Task<Config> = ifElse(
  exists("config.json"),
  map(readFile("config.json"), JSON.parse),
  pure(defaultConfig)
);

// Error recovery: try first, fall back to second
const content: Task<string> = orElse(
  readFile("config.yaml"),
  () => readFile("config.json")
);

// Array processing: map over items
const allDeps: Task<void> = traverse_(dependencies, (dep) =>
  exec("npm", ["install", dep])
);
```

### Prompts Become CLI Flags

Every prompt in your generator automatically becomes a CLI flag:

```typescript
prompts: [
  { name: "projectName", type: "text", message: "Project name:" },
  { name: "withTests", type: "confirm", message: "Include tests?", default: true },
  { name: "framework", type: "select", message: "Framework:", choices: [
    { label: "React", value: "react" },
    { label: "Vue", value: "vue" },
  ]},
]
```

```bash
summon my-gen --project-name=my-app --no-with-tests --framework=vue
```

Boolean prompts with `default: true` use the `--no-` prefix to disable. The CLI also shows grouped help:

```
Generator Options:
  --project-name <value>     Project name:
  --framework <value>        Framework: [react|vue]

Options:
  --no-with-tests            Include tests?
```

### Templates

Use EJS templates for complex file content:

```typescript
import { template, withHelpers } from "@canonical/summon";

generate: (answers) => template({
  source: "./templates/component.tsx.ejs",
  dest: `src/components/${answers.name}.tsx`,
  vars: withHelpers({
    name: answers.name,
    props: answers.props,
  }),
})
```

`withHelpers()` adds string transformation functions to your template context:

```ejs
// templates/component.tsx.ejs
import styles from './<%= kebabCase(name) %>.module.css';

export interface <%= pascalCase(name) %>Props {
  <%= camelCase(name) %>Id: string;
}

export const <%= pascalCase(name) %> = (props: <%= pascalCase(name) %>Props) => {
  return <div className={styles.<%= camelCase(name) %>}>...</div>;
};
```

Available helpers: `camelCase`, `pascalCase`, `kebabCase`, `snakeCase`, `constantCase`.

## Testing Generators

The key benefit of effects-as-data is testability. Use `dryRun()` to execute your generator without touching the filesystem:

```typescript
import { describe, expect, it } from "vitest";
import { dryRun, filterEffects, getAffectedFiles } from "@canonical/summon";
import { generators } from "./index";

const generator = generators["module"];

describe("module generator", () => {
  it("creates the expected files", () => {
    const task = generator.generate({ name: "utils", withTests: true });
    const { effects } = dryRun(task);

    const files = getAffectedFiles(effects);
    expect(files).toEqual([
      "src/utils/index.ts",
      "src/utils/index.test.ts",
    ]);
  });

  it("skips test file when withTests is false", () => {
    const task = generator.generate({ name: "utils", withTests: false });
    const { effects } = dryRun(task);

    const files = getAffectedFiles(effects);
    expect(files).not.toContain("src/utils/index.test.ts");
  });

  it("writes correct content to index file", () => {
    const task = generator.generate({ name: "utils", withTests: true });
    const { effects } = dryRun(task);

    const writes = filterEffects(effects, "WriteFile");
    const indexFile = writes.find(w => w.path === "src/utils/index.ts");

    expect(indexFile?.content).toBe("export const utils = {};\n");
  });

  it("creates directory before files", () => {
    const task = generator.generate({ name: "utils", withTests: false });
    const { effects } = dryRun(task);

    const mkdirIndex = effects.findIndex(e => e._tag === "MakeDir");
    const writeIndex = effects.findIndex(e => e._tag === "WriteFile");

    expect(mkdirIndex).toBeLessThan(writeIndex);
  });
});
```

The dry-run interpreter tracks virtual filesystem state, so conditional logic based on `exists()` works correctly:

```typescript
// This generator checks if a file exists before deciding what to do
generate: (answers) => ifElseM(
  exists("package.json"),
  // File exists: append to it
  flatMap(readFile("package.json"), (content) => {
    const pkg = JSON.parse(content);
    pkg.scripts.test = "vitest";
    return writeFile("package.json", JSON.stringify(pkg, null, 2));
  }),
  // File doesn't exist: create it
  writeFile("package.json", JSON.stringify({ scripts: { test: "vitest" } }, null, 2))
);

// In dry-run, if a previous effect created package.json, exists() returns true
const task = sequence_([
  writeFile("package.json", "{}"),
  generator.generate(answers),  // exists() correctly returns true here
]);
```

## Multi-Generator Packages

A single package can export multiple generators under a namespace:

```typescript
// src/index.ts
import { generator as reactGenerator } from "./react/index.js";
import { generator as svelteGenerator } from "./svelte/index.js";
import { generator as vueGenerator } from "./vue/index.js";

export const generators = {
  "component/react": reactGenerator,
  "component/svelte": svelteGenerator,
  "component/vue": vueGenerator,
};
```

This creates a hierarchy:

```bash
summon component react --component-path=src/Button
summon component svelte --component-path=src/lib/Button
summon component vue --component-path=src/components/Button
```

Running `summon component` shows available sub-generators:

```
Available under 'component':

  react [pkg]
  svelte [pkg]
  vue [pkg]

Usage: summon component <topic>
```

## Global Generators

Link generator packages globally using your package manager:

```bash
# From the generator package directory
cd /path/to/summon-component
bun link        # for bun users
npm link        # for npm users
```

When you run `summon`, it shows where each generator comes from:

```
Available topics:

  component [global] (has subtopics)
    └─ react, svelte, vue
  example [builtin] (has subtopics)
    └─ hello, webapp
```

## Discovery Priority

Generators are discovered in order (later overrides earlier):

1. **Built-in** — Example generators shipped with Summon
2. **Global packages** — Packages linked via `bun link` or `npm link`
3. **Project packages** — `./node_modules/summon-*`

Project packages override global ones, allowing project-specific versions.

## API Reference

### File System Primitives

```typescript
readFile(path: string): Task<string>
writeFile(path: string, content: string): Task<void>
appendFile(path: string, content: string, createIfMissing?: boolean): Task<void>
copyFile(src: string, dest: string): Task<void>
copyDirectory(src: string, dest: string): Task<void>
deleteFile(path: string): Task<void>
deleteDirectory(path: string): Task<void>
mkdir(path: string): Task<void>
exists(path: string): Task<boolean>
glob(pattern: string, cwd?: string): Task<string[]>
```

### Process Primitives

```typescript
exec(command: string, args?: string[], options?: ExecOptions): Task<ExecResult>
execSimple(command: string): Task<ExecResult>
```

### Logging Primitives

```typescript
info(message: string): Task<void>
warn(message: string): Task<void>
error(message: string): Task<void>
debug(message: string): Task<void>
```

### Template Primitives

```typescript
template(options: { source: string; dest: string; vars: Record<string, unknown> }): Task<void>
templateDir(options: { source: string; dest: string; vars: Record<string, unknown>; rename?: Record<string, string> }): Task<void>
withHelpers<T extends Record<string, unknown>>(vars: T): T & TemplateHelpers
```

### Combinators

```typescript
// Sequencing
sequence<T extends Task<unknown>[]>(tasks: T): Task<Results<T>>
sequence_(tasks: Task<unknown>[]): Task<void>

// Parallelism
parallel<T extends Task<unknown>[]>(tasks: T): Task<Results<T>>
parallelN<A>(concurrency: number, tasks: Task<A>[]): Task<A[]>
race<A>(tasks: Task<A>[]): Task<A>

// Conditionals
when<A>(condition: boolean, task: Task<A>): Task<A | void>
unless<A>(condition: boolean, task: Task<A>): Task<A | void>
ifElse<A, B>(condition: boolean, thenTask: Task<A>, elseTask: Task<B>): Task<A | B>
ifElseM<A, B>(conditionTask: Task<boolean>, thenTask: Task<A>, elseTask: Task<B>): Task<A | B>

// Error handling
orElse<A>(task: Task<A>, fallback: (error: TaskError) => Task<A>): Task<A>
retry<A>(times: number, task: Task<A>): Task<A>
attempt<A>(task: Task<A>): Task<Either<TaskError, A>>
optional<A>(task: Task<A>): Task<A | undefined>

// Arrays
traverse<A, B>(items: A[], fn: (item: A) => Task<B>): Task<B[]>
traverse_<A>(items: A[], fn: (item: A) => Task<unknown>): Task<void>

// Monadic
pure<A>(value: A): Task<A>
map<A, B>(task: Task<A>, fn: (a: A) => B): Task<B>
flatMap<A, B>(task: Task<A>, fn: (a: A) => Task<B>): Task<B>
tap<A>(task: Task<A>, fn: (a: A) => void): Task<A>
```

### Testing Utilities

```typescript
dryRun<A>(task: Task<A>): { value: A; effects: Effect[] }
filterEffects<T extends Effect["_tag"]>(effects: Effect[], tag: T): Effect[]
getAffectedFiles(effects: Effect[]): string[]
getFileWrites(effects: Effect[]): { path: string; content: string }[]
countEffects(effects: Effect[]): Record<string, number>
```

### CLI Flags

```bash
summon [generator] [options]

Global options:
  -d, --dry-run          Preview without writing files
  -y, --yes              Skip confirmation prompts
  --no-preview           Skip the preview step
  -g, --generators       Load generators from specific path only

Generator options are auto-generated from prompts.
Use --help on any generator to see its options.
```

## License

GPL-3.0
