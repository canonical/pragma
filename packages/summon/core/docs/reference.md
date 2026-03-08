# API Reference

Complete reference for all Summon exports. For conceptual understanding, see [Explanation](explanation.md). For task-oriented guidance, see [How-To Guides](how-to.md).

---

## Generator Definition

### `GeneratorDefinition<A>`

The shape of a generator. `A` is the answers type.

```typescript
interface GeneratorDefinition<A extends Record<string, unknown>> {
  meta: GeneratorMeta;
  prompts: Prompt[];
  generate: (answers: A) => Task<void>;
}
```

### `GeneratorMeta`

```typescript
interface GeneratorMeta {
  name: string;           // Display name
  description: string;    // One-line description
  version?: string;       // Semver version
}
```

### `AnyGenerator`

Type alias for generators with unknown answer types. Use in barrel exports:

```typescript
export const generators: Record<string, AnyGenerator> = { ... };
```

---

## Prompts

Prompts define questions asked interactively. Each prompt becomes a CLI flag.

### Text Prompt

Free-form string input.

```typescript
{
  name: "projectName",
  type: "text",
  message: "Project name:",
  default?: "my-app",
  validate?: (value: string) => true | string,
  transform?: (value: string) => string,
}
```

**CLI:** `--project-name=value`

### Confirm Prompt

Boolean yes/no.

```typescript
{
  name: "withTests",
  type: "confirm",
  message: "Include tests?",
  default?: true,
}
```

**CLI:** `--with-tests` (enable) or `--no-with-tests` (disable)

### Select Prompt

Single selection from choices.

```typescript
{
  name: "framework",
  type: "select",
  message: "Framework:",
  choices: [
    { label: "React", value: "react" },
    { label: "Vue", value: "vue" },
  ],
}
```

**CLI:** `--framework=react`

### Multiselect Prompt

Multiple selections from choices.

```typescript
{
  name: "features",
  type: "multiselect",
  message: "Features:",
  choices: [
    { label: "TypeScript", value: "ts" },
    { label: "ESLint", value: "eslint" },
  ],
}
```

**CLI:** `--features=ts,eslint`

---

## File System Primitives

All file system functions return `Task<T>` — they describe operations without executing them.

### `readFile`

```typescript
readFile(path: string): Task<string>
```

Reads file contents as UTF-8 string. Fails if file doesn't exist.

### `writeFile`

```typescript
writeFile(path: string, content: string): Task<void>
```

Writes content to file. Creates parent directories. Overwrites existing.

**Effect:** `{ _tag: "WriteFile", path: string, content: string }`

### `appendFile`

```typescript
appendFile(path: string, content: string, createIfMissing?: boolean): Task<void>
```

Appends content to file. If `createIfMissing` is true, creates the file if it doesn't exist.

**Effect:** `{ _tag: "AppendFile", path: string, content: string, createIfMissing: boolean }`

### `copyFile`

```typescript
copyFile(src: string, dest: string): Task<void>
```

Copies a single file. Source path is relative to the generator package.

**Effect:** `{ _tag: "CopyFile", src: string, dest: string }`

### `copyDirectory`

```typescript
copyDirectory(src: string, dest: string): Task<void>
```

Recursively copies a directory. Source path is relative to the generator package.

**Effect:** `{ _tag: "CopyDirectory", src: string, dest: string }`

### `deleteFile`

```typescript
deleteFile(path: string): Task<void>
```

Deletes a file. No error if file doesn't exist.

**Effect:** `{ _tag: "DeleteFile", path: string }`

### `deleteDirectory`

```typescript
deleteDirectory(path: string): Task<void>
```

Recursively deletes a directory. No error if directory doesn't exist.

**Effect:** `{ _tag: "DeleteDirectory", path: string }`

### `mkdir`

```typescript
mkdir(path: string): Task<void>
```

Creates directory and all parent directories.

**Effect:** `{ _tag: "MakeDir", path: string, recursive: true }`

### `exists`

```typescript
exists(path: string): Task<boolean>
```

Checks if a file or directory exists. In dry-run, tracks virtual filesystem state.

**Effect:** `{ _tag: "Exists", path: string }`

### `glob`

```typescript
glob(pattern: string, cwd?: string): Task<string[]>
```

Finds files matching a glob pattern. Returns array of paths relative to cwd.

**Effect:** `{ _tag: "Glob", pattern: string, cwd?: string }`

---

## File Transformation Primitives

### `sortFileLines`

```typescript
sortFileLines(path: string, options?: SortFileLinesOptions): Task<void>
```

Sorts the lines of a file. Useful for maintaining sorted barrel files (index.ts with exports), sorted import lists, or any file where line order should be alphabetical.

```typescript
interface SortFileLinesOptions {
  /** Custom comparator function. Default: localeCompare */
  compare?: (a: string, b: string) => number;
  /** Remove duplicate lines after sorting. Default: false */
  unique?: boolean;
  /** Lines matching this pattern stay at top, unsorted */
  headerPattern?: RegExp;
  /** Lines matching this pattern stay at bottom, unsorted */
  footerPattern?: RegExp;
  /** Preserve blank lines in relative positions. Default: false */
  preserveBlankLines?: boolean;
}
```

**Examples:**

```typescript
// Sort a barrel file alphabetically
sortFileLines("src/index.ts")

// Append an export then sort
sequence_([
  appendFile("src/index.ts", '\nexport { newFeature } from "./new-feature.js";'),
  sortFileLines("src/index.ts"),
])

// Keep header comments at top
sortFileLines("src/index.ts", {
  headerPattern: /^\/\//,
})

// Sort and remove duplicates
sortFileLines("src/exports.ts", { unique: true })

// Case-insensitive sort
sortFileLines("src/index.ts", {
  compare: (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
})

// Keep "export default" at bottom
sortFileLines("src/index.ts", {
  headerPattern: /^\/\//,
  footerPattern: /^export default/,
})
```

**Effects:** `ReadFile` + `WriteFile` (composed primitive)

---

## Process Primitives

### `exec`

```typescript
exec(command: string, args?: string[], options?: ExecOptions): Task<ExecResult>
```

Executes a shell command.

```typescript
interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

**Effect:** `{ _tag: "Exec", command: string, args: string[], options?: ExecOptions }`

### `execSimple`

```typescript
execSimple(command: string): Task<ExecResult>
```

Executes a shell command string (parsed by shell).

---

## Logging Primitives

### `info`

```typescript
info(message: string): Task<void>
```

Logs an info message.

**Effect:** `{ _tag: "Log", level: "info", message: string }`

### `warn`

```typescript
warn(message: string): Task<void>
```

Logs a warning message.

**Effect:** `{ _tag: "Log", level: "warn", message: string }`

### `error`

```typescript
error(message: string): Task<void>
```

Logs an error message.

**Effect:** `{ _tag: "Log", level: "error", message: string }`

### `debug`

```typescript
debug(message: string): Task<void>
```

Logs a debug message (only shown with verbose flag).

**Effect:** `{ _tag: "Log", level: "debug", message: string }`

---

## Template Primitives

Templates use [EJS syntax](https://ejs.co/#docs).

### `template`

```typescript
template(options: {
  source: string;
  dest: string;
  vars: Record<string, unknown>;
}): Task<void>
```

Renders an EJS template file.

- `source` — Path to `.ejs` file, relative to generator package
- `dest` — Output path, relative to where summon runs
- `vars` — Variables available in template

**Effect:** `{ _tag: "Template", source: string, dest: string, vars: Record<string, unknown> }`

### `templateDir`

```typescript
templateDir(options: {
  source: string;
  dest: string;
  vars: Record<string, unknown>;
  rename?: Record<string, string>;
}): Task<void>
```

Renders all EJS templates in a directory.

- `source` — Directory path, relative to generator package
- `dest` — Output directory, relative to where summon runs
- `vars` — Variables available in templates
- `rename` — Map of source filename → destination filename

**Effect:** `{ _tag: "TemplateDir", ... }`

### `withHelpers`

```typescript
withHelpers<T extends Record<string, unknown>>(vars: T): T & TemplateHelpers
```

Adds string transformation functions to template variables.

```typescript
interface TemplateHelpers {
  camelCase: (s: string) => string;    // myComponent
  pascalCase: (s: string) => string;   // MyComponent
  kebabCase: (s: string) => string;    // my-component
  snakeCase: (s: string) => string;    // my_component
  constantCase: (s: string) => string; // MY_COMPONENT
}
```

---

## Combinators

### Sequencing

#### `sequence`

```typescript
sequence<T extends Task<unknown>[]>(tasks: T): Task<Results<T>>
```

Runs tasks in order, returns array of results.

```typescript
const [a, b] = await run(sequence([readFile("a.txt"), readFile("b.txt")]));
```

#### `sequence_`

```typescript
sequence_(tasks: Task<unknown>[]): Task<void>
```

Runs tasks in order, discards results.

```typescript
sequence_([mkdir("out"), writeFile("out/a.txt", "...")])
```

### Parallelism

#### `parallel`

```typescript
parallel<T extends Task<unknown>[]>(tasks: T): Task<Results<T>>
```

Runs tasks concurrently, returns array of results.

#### `parallelN`

```typescript
parallelN<A>(concurrency: number, tasks: Task<A>[]): Task<A[]>
```

Runs tasks concurrently with a concurrency limit.

#### `race`

```typescript
race<A>(tasks: Task<A>[]): Task<A>
```

Runs tasks concurrently, returns first to complete.

### Conditionals

#### `when`

```typescript
when<A>(condition: boolean, task: Task<A>): Task<A | void>
```

Runs task only if condition is true.

#### `unless`

```typescript
unless<A>(condition: boolean, task: Task<A>): Task<A | void>
```

Runs task only if condition is false.

#### `ifElse`

```typescript
ifElse<A, B>(condition: boolean, thenTask: Task<A>, elseTask: Task<B>): Task<A | B>
```

Runs thenTask if condition is true, elseTask otherwise.

#### `ifElseM`

```typescript
ifElseM<A, B>(conditionTask: Task<boolean>, thenTask: Task<A>, elseTask: Task<B>): Task<A | B>
```

Like `ifElse` but condition is a Task (e.g., `exists()`).

### Error Handling

#### `orElse`

```typescript
orElse<A>(task: Task<A>, fallback: (error: TaskError) => Task<A>): Task<A>
```

Runs fallback if task fails.

#### `retry`

```typescript
retry<A>(times: number, task: Task<A>): Task<A>
```

Retries task up to N times on failure.

#### `attempt`

```typescript
attempt<A>(task: Task<A>): Task<Either<TaskError, A>>
```

Captures success/failure as an Either value.

```typescript
interface Either<E, A> {
  _tag: "Left" | "Right";
  error?: E;   // when _tag === "Left"
  value?: A;   // when _tag === "Right"
}
```

#### `optional`

```typescript
optional<A>(task: Task<A>): Task<A | undefined>
```

Returns undefined instead of failing.

### Array Processing

#### `traverse`

```typescript
traverse<A, B>(items: A[], fn: (item: A) => Task<B>): Task<B[]>
```

Maps function over items, collects results.

#### `traverse_`

```typescript
traverse_<A>(items: A[], fn: (item: A) => Task<unknown>): Task<void>
```

Maps function over items, discards results.

### Monadic

#### `pure`

```typescript
pure<A>(value: A): Task<A>
```

Creates a Task that immediately returns the value.

#### `map`

```typescript
map<A, B>(task: Task<A>, fn: (a: A) => B): Task<B>
```

Transforms the result of a Task.

#### `flatMap`

```typescript
flatMap<A, B>(task: Task<A>, fn: (a: A) => Task<B>): Task<B>
```

Chains Tasks — runs first, passes result to function that returns second.

#### `tap`

```typescript
tap<A>(task: Task<A>, fn: (a: A) => void): Task<A>
```

Runs side effect with result, returns original result.

---

## Testing Utilities

### `dryRun`

```typescript
dryRun<A>(task: Task<A>): { value: A; effects: Effect[] }
```

Executes task with a test interpreter that:
- Collects effects instead of executing them
- Maintains virtual filesystem state
- Returns the computed value and list of effects

### `filterEffects`

```typescript
filterEffects<T extends Effect["_tag"]>(effects: Effect[], tag: T): Effect[]
```

Returns effects matching the given tag.

```typescript
const writes = filterEffects(effects, "WriteFile");
const execs = filterEffects(effects, "Exec");
```

### `getAffectedFiles`

```typescript
getAffectedFiles(effects: Effect[]): string[]
```

Returns paths of all file operations (write, copy, delete, template).

### `getFileWrites`

```typescript
getFileWrites(effects: Effect[]): { path: string; content: string }[]
```

Returns path and content for WriteFile effects.

### `countEffects`

```typescript
countEffects(effects: Effect[]): Record<string, number>
```

Counts effects by tag.

```typescript
{ WriteFile: 3, MakeDir: 1, Exec: 2 }
```

---

## Effect Types

All effects have a `_tag` discriminator.

```typescript
type Effect =
  | { _tag: "WriteFile"; path: string; content: string }
  | { _tag: "AppendFile"; path: string; content: string; createIfMissing: boolean }
  | { _tag: "CopyFile"; src: string; dest: string }
  | { _tag: "CopyDirectory"; src: string; dest: string }
  | { _tag: "DeleteFile"; path: string }
  | { _tag: "DeleteDirectory"; path: string }
  | { _tag: "MakeDir"; path: string; recursive: boolean }
  | { _tag: "Exists"; path: string }
  | { _tag: "Glob"; pattern: string; cwd?: string }
  | { _tag: "Exec"; command: string; args: string[]; options?: ExecOptions }
  | { _tag: "Log"; level: "info" | "warn" | "error" | "debug"; message: string }
  | { _tag: "Template"; source: string; dest: string; vars: Record<string, unknown> }
  | { _tag: "TemplateDir"; source: string; dest: string; vars: Record<string, unknown>; rename?: Record<string, string> }
```

---

## CLI

### Usage

```bash
summon [generator-path] [options]
```

### Global Options

| Flag | Short | Description |
|------|-------|-------------|
| `--dry-run` | `-d` | Preview without writing files |
| `--yes` | `-y` | Skip confirmation prompts and preview |
| `--verbose` | `-v` | Show debug output |
| `--show-contents` | | Show file contents in dry-run (useful for LLMs) |
| `--no-preview` | | Skip file preview step |
| `--no-generated-stamp` | | Disable generated file stamp comments |
| `--generators` | `-g` | Load generators from specific path |
| `--help` | `-h` | Show help |

### Verbose Dry-Run with File Contents

The `--show-contents` flag enables verbose output during dry-run, showing the complete content of files that would be generated. This is particularly useful for:

- **LLM agents**: AI assistants can review generated code without writing to disk
- **Code review**: Preview exact file contents before committing to generation
- **CI pipelines**: Log generated content for debugging or auditing

```bash
# Preview with file contents (non-interactive mode)
summon component react src/components/Button --dry-run --show-contents -y
```

Output includes line-numbered file content:

```
├─ Create file   src/components/Button/Button.tsx
│  1 │ import type { ButtonProps } from "./types.js";
│  2 │ import "./styles.css";
│  3 │
│  4 │ const componentCssClassName = "ds button";
│    ... (truncated after 50 lines)
```

Content is truncated to 50 lines and 120 characters per line to keep output manageable.

### Generated File Stamps

By default, Summon adds a stamp comment to all generated files:

```typescript
// Generated by @canonical/summon-component v0.1.0
```

The comment style is automatically chosen based on file type (e.g., `/* */` for CSS, `<!-- -->` for HTML). Files that don't support comments (like JSON) are left unchanged.

Use `--no-generated-stamp` to disable this behavior.

### Generator Options

Generator prompts become CLI flags:

- Text prompts: `--name=value`
- Confirm prompts: `--with-foo` or `--no-with-foo`
- Select prompts: `--framework=react`
- Multiselect prompts: `--features=a,b,c`

Boolean prompts with `default: true` use `--no-*` prefix to disable.

### Discovery

Generators are discovered in order (later overrides earlier):

1. **Built-in** — Example generators in Summon
2. **Global** — Packages linked via `bun link` / `npm link`
3. **Project** — `./node_modules/summon-*` or `./node_modules/@*/summon-*`

### Package Naming

Generator packages must be named:
- `summon-*` (e.g., `summon-component`)
- `@scope/summon-*` (e.g., `@myorg/summon-component`)

### Barrel Export

Packages must export a `generators` record:

```typescript
export const generators: Record<string, AnyGenerator> = {
  "name": generator,
  "namespace/name": nestedGenerator,
};
```
