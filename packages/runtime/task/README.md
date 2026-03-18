# @canonical/task

A monadic effect framework for composable, testable, dry-runnable CLI operations.

Tasks are pure descriptions of computations — they don't execute until interpreted. This lets you test filesystem operations, shell commands, and user prompts without touching real I/O.

## Installation

```bash
bun add @canonical/task
```

## Quick Start

```typescript
import { writeFile, sequence_, readFile, runTask } from "@canonical/task";

const setup = sequence_([
  writeFile("hello.txt", "Hello, world!"),
  writeFile("goodbye.txt", "Goodbye!"),
]);

await runTask(setup);
```

## Core Concepts

### Task Monad

A `Task<A>` is one of three things:
- **Pure** — a completed computation holding a value
- **Effect** — a side-effect description with a continuation
- **Fail** — a failed computation with a structured error

```typescript
import { pure, flatMap, writeFile, readFile } from "@canonical/task";

const greet = flatMap(
  readFile("name.txt"),
  (name) => writeFile("greeting.txt", `Hello, ${name}!`),
);
```

### Effects

Effects are pure data — tagged unions describing what should happen:

- **File I/O**: `ReadFile`, `WriteFile`, `AppendFile`, `CopyFile`, `CopyDirectory`, `DeleteFile`, `DeleteDirectory`, `MakeDir`, `Exists`, `Glob`
- **Process**: `Exec`
- **Interaction**: `Prompt` (text, confirm, select, multiselect)
- **Logging**: `Log` (debug, info, warn, error)
- **Context**: `ReadContext`, `WriteContext`
- **Concurrency**: `Parallel`, `Race`

### Primitives

Task-returning wrappers for every effect:

```typescript
import { readFile, writeFile, exec, promptConfirm, info } from "@canonical/task";

const deploy = flatMap(
  promptConfirm("Deploy to production?"),
  (yes) => yes
    ? sequence_([exec("deploy.sh", []), info("Deployed")])
    : info("Cancelled"),
);
```

### Combinators

Compose tasks into larger workflows:

```typescript
import { sequence, parallel, when, retry, bracket } from "@canonical/task";

// Run in order, collect results
const results = sequence([readFile("a.txt"), readFile("b.txt")]);

// Run concurrently
const fast = parallel([fetchA, fetchB, fetchC]);

// Conditional
const maybeClean = when(isDirty, cleanUp);

// Retry with backoff
const resilient = retry(flakeyTask, 3);

// Resource management (acquire → use → release)
const safe = bracket(openDb, useDb, closeDb);
```

### Interpreter

Execute tasks against real I/O:

```typescript
import { runTask } from "@canonical/task";

const result = await runTask(myTask, {
  cwd: "/my/project",
  onLog: (level, msg) => console.log(`[${level}] ${msg}`),
});
```

### Dry-Run

Test tasks without executing side effects:

```typescript
import { dryRun, collectEffects, getFileWrites, assertEffects } from "@canonical/task";

const { value, effects } = dryRun(myTask);
// effects: [{ _tag: "WriteFile", path: "hello.txt", content: "Hello!" }, ...]

const writes = getFileWrites(effects);
// [{ path: "hello.txt", content: "Hello!" }]

// Assert in tests
assertEffects(myTask, [
  { _tag: "WriteFile", path: "hello.txt" },
]);
```

## API Summary

| Category | Key Exports |
|----------|-------------|
| **Monad** | `pure`, `flatMap`, `map`, `fail`, `recover`, `task` (builder) |
| **Primitives** | `readFile`, `writeFile`, `exec`, `prompt*`, `log`, `mkdir`, `glob` |
| **Combinators** | `sequence`, `parallel`, `when`, `retry`, `bracket`, `traverse`, `zip` |
| **Interpreter** | `runTask`, `run`, `executeEffect` |
| **Dry-Run** | `dryRun`, `dryRunWith`, `collectEffects`, `assertEffects` |

## License

GPL-3.0
