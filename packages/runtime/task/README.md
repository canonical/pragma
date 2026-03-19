# @canonical/task

A monadic effect framework for composable, testable, dry-runnable CLI operations.

Tasks are pure descriptions of computations — they don't execute until interpreted. This lets you test filesystem operations, shell commands, and user prompts without touching real I/O.

## Installation

```bash
bun add @canonical/task
```

## Quick Start

```typescript
import { gen, $, writeFile, readFile, info, runTask } from "@canonical/task";

const setup = gen(function* () {
  const name = yield* $(readFile("name.txt"));
  yield* $(writeFile("greeting.txt", `Hello, ${name}!`));
  yield* $(info("Done"));
});

await runTask(setup);
```

## Core Concepts

### Task Monad

A `Task<A>` is one of three things:

- **Pure** — a completed computation holding a value
- **Effect** — a side-effect description with a continuation
- **Fail** — a failed computation with a structured error

Tasks compose with `flatMap` or, more ergonomically, with generator syntax:

```typescript
import { flatMap, readFile, writeFile } from "@canonical/task";

// flatMap style
const greet = flatMap(
  readFile("name.txt"),
  (name) => writeFile("greeting.txt", `Hello, ${name}!`),
);
```

### Generator Syntax

The `gen` / `$` pair lets you write sequential effectful code without nested `flatMap` chains. Use `yield*` with `$(task)` to unwrap a task and get its value:

```typescript
import { gen, $, readFile, writeFile, info, exists } from "@canonical/task";

const migrate = gen(function* () {
  const raw = yield* $(readFile("config.json"));
  const config = JSON.parse(raw);

  config.version = 2;

  yield* $(writeFile("config.json", JSON.stringify(config, null, 2)));
  yield* $(info(`Migrated to v${config.version}`));

  return config;
});
```

Under the hood, `gen` composes `flatMap` calls — the task is still a pure data structure until interpreted. Use whichever style you prefer; `gen` is recommended for anything beyond two or three steps.

### Effects

Effects are pure data — tagged unions describing what should happen:

| Category | Effects |
|---|---|
| **File I/O** | `ReadFile`, `WriteFile`, `AppendFile`, `CopyFile`, `CopyDirectory`, `DeleteFile`, `DeleteDirectory`, `MakeDir`, `Exists`, `Glob`, `Symlink` |
| **Process** | `Exec` |
| **Interaction** | `Prompt` (text, confirm, select, multiselect) |
| **Logging** | `Log` (debug, info, warn, error) |
| **Context** | `ReadContext`, `WriteContext` |
| **Concurrency** | `Parallel`, `Race` |

### Primitives

Task-returning wrappers for every effect. These are the building blocks you'll use most:

```typescript
import {
  readFile, writeFile, appendFile, copyFile, copyDirectory,
  deleteFile, deleteDirectory, mkdir, exists, symlink, glob,
  exec, execSimple,
  prompt, promptText, promptConfirm, promptSelect, promptMultiselect,
  log, debug, info, warn, error,
  getContext, setContext, withContext,
  noop, succeed,
} from "@canonical/task";
```

#### File system

```typescript
const content = yield* $(readFile("src/index.ts"));
yield* $(writeFile("dist/index.js", compiled));
yield* $(appendFile("log.txt", `Built at ${Date.now()}\n`));
yield* $(copyFile("template.json", "output/package.json"));
yield* $(copyDirectory("templates/", "output/"));
yield* $(mkdir("output/lib"));
yield* $(symlink("../shared/utils", "src/utils"));

const found = yield* $(exists("tsconfig.json"));
const files = yield* $(glob("src/**/*.ts", "."));
```

#### Process execution

```typescript
const result = yield* $(exec("git", ["status", "--short"]));
// result: { stdout: string, stderr: string, exitCode: number }

const simple = yield* $(execSimple("ls -la"));
```

#### User prompts

```typescript
const name = yield* $(promptText("name", "Project name?", "my-app"));
const ok = yield* $(promptConfirm("confirm", "Continue?", true));
const lang = yield* $(promptSelect("lang", "Language?", [
  { label: "TypeScript", value: "ts" },
  { label: "JavaScript", value: "js" },
]));
const features = yield* $(promptMultiselect("features", "Features?", [
  { label: "Linting", value: "lint" },
  { label: "Testing", value: "test" },
]));
```

#### Logging

```typescript
yield* $(debug("Verbose detail"));   // shown with --verbose
yield* $(info("Progress update"));
yield* $(warn("Non-fatal issue"));
yield* $(error("Something broke"));
```

### Context

Context is a key-value store that lives for the duration of a task execution. Use it to pass data between steps without threading values manually:

```typescript
import { gen, $, setContext, getContext, withContext } from "@canonical/task";

const setup = gen(function* () {
  yield* $(setContext("projectName", "my-app"));

  // later, in a different part of the task tree
  const name = yield* $(getContext<string>("projectName"));
  // name: "my-app"
});

// withContext sets a key for the duration of a child task
const scoped = withContext("env", "production", deployTask);
```

Context is backed by a `Map<string, unknown>` in the production interpreter. The dry-run interpreter does not persist context by default — use `dryRunWith` to provide mock context values.

### Error Model

Tasks fail with structured `TaskError` values:

```typescript
interface TaskError {
  code: string;              // programmatic error code
  message: string;           // human-readable description
  cause?: unknown;           // original error that caused this failure
  context?: Record<string, unknown>;  // additional structured data
  stack?: string;            // stack trace if available
  suppressed?: TaskError[];  // for parallel: all errors, not just the first
}
```

#### Creating errors

```typescript
import { fail, failWith } from "@canonical/task";

const notFound = failWith("FILE_NOT_FOUND", "Config file missing");

const detailed = fail({
  code: "VALIDATION_FAILED",
  message: "Schema mismatch",
  context: { path: "config.json", expected: "v2" },
});
```

The framework defines base error codes (`FILE_NOT_FOUND`, `EXEC_FAILED`, `PROMPT_CANCELLED`, `TASK_INTERRUPTED`, `INTERNAL`); consumers can use any string code.

#### Handling errors

```typescript
import { recover, mapError, orElse, optional, attempt, fold } from "@canonical/task";

// recover: catch a failure and produce a new task
const safe = recover(riskyTask, (err) =>
  err.code === "FILE_NOT_FOUND" ? writeFile("config.json", "{}") : fail(err),
);

// mapError: transform the error without changing recovery
const retagged = mapError(innerTask, (err) => ({
  ...err,
  code: "DEPLOY_FAILED",
  context: { ...err.context, phase: "build" },
}));

// orElse: try A, fall back to B
const config = orElse(readFile("config.local.json"), readFile("config.json"));

// optional: swallow failure, return undefined
const maybePkg = optional(readFile("package.json"));

// attempt: capture success or failure as a value
const result = yield* $(attempt(riskyTask));
if (result.ok) { /* result.value */ } else { /* result.error */ }

// fold: handle both branches and unify the type
const status = fold(deployTask, () => "deployed", (err) => `failed: ${err.code}`);
```

#### Parallel errors

When `parallel` tasks fail, the first error becomes the primary `TaskError` and any remaining errors are attached as `suppressed`:

```typescript
// If tasks[0] and tasks[2] both fail:
// error.code      → first failure's code
// error.suppressed → [task[2]'s error]
```

### Combinators

Compose tasks into larger workflows:

#### Sequencing

```typescript
import { sequence, sequence_, traverse, traverse_ } from "@canonical/task";

// Run in order, collect results
const contents = sequence([readFile("a.txt"), readFile("b.txt")]);

// Run in order, discard results
sequence_([writeFile("a.txt", "A"), writeFile("b.txt", "B")]);

// Map + sequence over an array
const compiled = traverse(sourceFiles, (f) => readFile(f));

// Map + sequence, discard results
traverse_(files, (f) => deleteFile(f));
```

#### Parallel execution

```typescript
import { parallel, parallelN, race } from "@canonical/task";

// Run concurrently, collect all results
const all = parallel([fetchA, fetchB, fetchC]);

// Run with concurrency limit (batches of 3)
const throttled = parallelN(3, manyTasks);

// Return first to complete
const fastest = race([mirrorA, mirrorB]);
```

#### Conditionals

```typescript
import { when, unless, ifElse, whenM, ifElseM } from "@canonical/task";

// Run only if condition is true
when(isDirty, cleanUp);

// Run only if condition is false
unless(isCI, promptForConfirmation);

// Choose between two tasks
ifElse(hasConfig, loadConfig, useDefaults);

// Condition is itself a task
whenM(exists("package.json"), installDeps);

// Both condition and branches are tasks
ifElseM(exists(".env"), loadEnv, createEnv);
```

#### Dispatch

```typescript
import { switchMap } from "@canonical/task";

// Detect-then-dispatch: run a detection task, branch on its result
const result = switchMap(
  detectHarness,                // Task<"jest" | "vitest" | null>
  {
    jest: configureJest,        // Task<Config>
    vitest: configureVitest,    // Task<Config>
  },
  useDefaultConfig,             // fallback Task<Config>
);
```

#### Error handling

```typescript
import { retry, orElse, optional, attempt, bracket, ensure } from "@canonical/task";

// Retry up to 3 times
const resilient = retry(flakyTask, 3);

// Try primary, fall back to secondary
const config = orElse(readFile("local.json"), readFile("default.json"));

// Swallow errors, return undefined
const maybe = optional(readFile("optional.json"));

// Capture result or error as a value
const result = attempt(riskyTask);

// Resource management (acquire → use → release, even on failure)
const safe = bracket(acquireConn, useConn, releaseConn);

// Ensure cleanup runs regardless of outcome
const withCleanup = ensure(mainTask, cleanup);
```

#### Utilities

```typescript
import { tap, tapError, fold, zip, zip3 } from "@canonical/task";

// Side-effect without changing the value
const logged = tap(readFile("a.txt"), (content) => info(`Read ${content.length} bytes`));

// Side-effect on failure
const observed = tapError(riskyTask, (err) => error(`Failed: ${err.code}`));

// Handle both success and failure → unified type
const status = fold(deploy, () => "ok", (err) => `fail: ${err.code}`);

// Combine tasks into tuples
const [a, b] = yield* $(zip(readFile("a.txt"), readFile("b.txt")));
const [x, y, z] = yield* $(zip3(taskX, taskY, taskZ));
```

### Fluent Builder

The `task()` / `of()` API provides a chainable alternative:

```typescript
import { task, of, mkdir, writeFile, info } from "@canonical/task";

const result = task(mkdir("output"))
  .andThen(writeFile("output/a.txt", "A"))
  .andThen(writeFile("output/b.txt", "B"))
  .andThen(info("Done!"))
  .unwrap();

const doubled = of(21)
  .map((n) => n * 2)
  .flatMap((n) => writeFile("answer.txt", String(n)))
  .unwrap();
```

Call `.unwrap()` to extract the underlying `Task<A>` when you need to pass it to combinators or interpreters.

### Interpreters

Tasks are inert data until an interpreter walks the structure and decides what to do with each effect. The package ships two interpreters:

#### Production interpreter (`runTask`)

Executes effects against real I/O — filesystem, processes, prompts:

```typescript
import { runTask } from "@canonical/task";

const value = await runTask(myTask);
```

`runTask` accepts a `RunTaskOptions` object:

```typescript
await runTask(myTask, {
  // Shared key-value context for ReadContext/WriteContext effects
  context: new Map([["env", "production"]]),

  // Custom prompt handler (required if the task uses Prompt effects)
  promptHandler: async (effect) => {
    // effect.question: PromptQuestion
    return "user input";
  },

  // Log routing (default: console.log with level prefix)
  onLog: (level, message) => logger[level](message),

  // Effect lifecycle hooks
  onEffectStart: (effect) => { /* before each effect */ },
  onEffectComplete: (effect, durationMs) => { /* after each effect */ },

  // AbortSignal for interruption
  signal: controller.signal,
});
```

When a task fails, `runTask` throws a `TaskExecutionError` that wraps the `TaskError`:

```typescript
import { runTask, TaskExecutionError } from "@canonical/task";

try {
  await runTask(myTask);
} catch (err) {
  if (err instanceof TaskExecutionError) {
    console.log(err.code);          // error code string
    console.log(err.taskError);     // full TaskError object
  }
}
```

#### Dry-run interpreter (`dryRun`)

Collects effects without executing them. Each effect gets a mock return value so the task can continue:

```typescript
import { dryRun } from "@canonical/task";

const { value, effects } = dryRun(myTask);
// value: the task's return value (using mocked effect results)
// effects: Effect[] — every effect the task would have performed
```

Default mocks: `ReadFile` → `"[mock content of <path>]"`, `Exists` → `true`, `Exec` → `{ stdout: "", stderr: "", exitCode: 0 }`, `Prompt` → default or first choice, write effects → `undefined`.

The dry-run interpreter tracks a virtual filesystem — files created by `WriteFile` or `MakeDir` effects are visible to subsequent `Exists` checks within the same run.

##### Custom mocks with `dryRunWith`

Override mock behaviour per effect type:

```typescript
import { dryRunWith } from "@canonical/task";

const mocks = new Map([
  ["ReadFile", (effect) => {
    if (effect.path === "package.json") return '{"name": "my-app"}';
    return "default content";
  }],
  ["Exists", () => false],
]);

const { value, effects } = dryRunWith(myTask, mocks);
```

##### Effect analysis utilities

```typescript
import {
  collectEffects, countEffects, filterEffects,
  getFileWrites, getAffectedFiles,
} from "@canonical/task";

const effects = collectEffects(myTask);

countEffects(effects);
// { WriteFile: 3, ReadFile: 1, Log: 2 }

filterEffects(effects, "WriteFile");
// [{ _tag: "WriteFile", path: "...", content: "..." }, ...]

getFileWrites(effects);
// [{ path: "a.txt", content: "A" }, ...]

getAffectedFiles(effects);
// ["a.txt", "b.txt", "output/"] — sorted, deduplicated
```

##### Test assertions

```typescript
import { assertEffects, assertFileWrites, expectTask } from "@canonical/task";

// Assert exact effect sequence
assertEffects(myTask, [
  { _tag: "MakeDir", path: "output" },
  { _tag: "WriteFile", path: "output/index.ts" },
]);

// Assert which files would be written
assertFileWrites(myTask, ["output/index.ts", "output/package.json"]);

// Fluent matcher
const result = expectTask(myTask);
result.toHaveValue("done");
result.toHaveEffectCount(3);
result.toWriteFile("output/index.ts");
result.toNotWriteFile("output/secret.key");
```

## API Summary

| Category | Key Exports |
|----------|-------------|
| **Monad** | `pure`, `flatMap`, `map`, `ap`, `fail`, `failWith`, `recover`, `mapError` |
| **Generator** | `gen`, `$`, `TaskGen` |
| **Builder** | `task`, `of`, `TaskBuilder` |
| **Guards** | `isPure`, `isFailed`, `hasEffects` |
| **Primitives** | `readFile`, `writeFile`, `appendFile`, `copyFile`, `copyDirectory`, `deleteFile`, `deleteDirectory`, `mkdir`, `exists`, `symlink`, `glob`, `sortFileLines` |
| **Process** | `exec`, `execSimple` |
| **Prompts** | `prompt`, `promptText`, `promptConfirm`, `promptSelect`, `promptMultiselect` |
| **Logging** | `log`, `debug`, `info`, `warn`, `error` |
| **Context** | `getContext`, `setContext`, `withContext` |
| **Pure** | `noop`, `succeed` |
| **Sequencing** | `sequence`, `sequence_`, `traverse`, `traverse_` |
| **Parallel** | `parallel`, `parallelN`, `race` |
| **Conditionals** | `when`, `unless`, `ifElse`, `whenM`, `ifElseM` |
| **Dispatch** | `switchMap` |
| **Error handling** | `retry`, `retryWithBackoff`, `orElse`, `optional`, `attempt` |
| **Resources** | `bracket`, `ensure` |
| **Utilities** | `tap`, `tapError`, `delay`, `timeout`, `fold`, `zip`, `zip3` |
| **Production interpreter** | `runTask`, `run`, `executeEffect`, `TaskExecutionError`, `RunTaskOptions` |
| **Dry-run interpreter** | `dryRun`, `dryRunWith`, `mockEffect`, `collectEffects`, `countEffects`, `filterEffects`, `getFileWrites`, `getAffectedFiles`, `assertEffects`, `assertFileWrites`, `expectTask` |
| **Effect constructors** | `readFileEffect`, `writeFileEffect`, `appendFileEffect`, `copyFileEffect`, `copyDirectoryEffect`, `deleteFileEffect`, `deleteDirectoryEffect`, `makeDirEffect`, `existsEffect`, `symlinkEffect`, `globEffect`, `execEffect`, `promptEffect`, `logEffect`, `readContextEffect`, `writeContextEffect`, `parallelEffect`, `raceEffect` |
| **Effect utilities** | `describeEffect`, `isWriteEffect`, `getAffectedPaths` |

## License

LGPL-3.0
