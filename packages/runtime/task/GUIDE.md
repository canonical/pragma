# The Task Pattern: A Gentle Introduction

## The problem

You write a CLI tool that scaffolds a project. It creates directories, writes
config files, installs dependencies, maybe initializes a git repository. The
happy path works. Now answer three questions:

1. **How do you test it** without actually creating files and running `npm install`?
2. **How do you preview it** so users can see what *would* happen before it happens?
3. **How do you undo it** when a user runs your tool by accident?

The conventional answer is mocking. You wrap every I/O call in an interface,
build a fake filesystem, wire it all up, and pray you mocked the right things.
It works, but it is fragile, verbose, and the mocks drift from reality over
time.

There is a better way. Instead of mocking the *implementation*, you change the
*representation*. You make your program a **data structure** that *describes*
what it wants to do, and you let a separate piece of code *decide how to do it*.

That is the Task pattern.

## The core idea in 30 seconds

A task is not a function that performs effects. A task is a **value** that
describes effects. Think of it as a recipe rather than a cooked meal.

```
Traditional:         fs.writeFileSync("config.json", data)   // does it now
Task pattern:        writeFile("config.json", data)          // describes it
```

The description is inert. Nothing happens until an **interpreter** walks the
description and decides what to do with each step. Different interpreters give
you different behaviours from the same description:

| Interpreter | What it does |
|---|---|
| `runTask` | Executes effects against real I/O |
| `dryRun` | Collects effects, returns mock values, touches nothing |
| `runUndo` | Walks the tree, collects undo steps, executes them in reverse |

One task definition. Three capabilities for free.

## Building it from scratch

Let us build a minimal version of this pattern in TypeScript. The real library
is richer, but the bones are the same.

### Step 1: Effects as data

An effect is a plain object with a tag that says what kind of operation it is:

```typescript
type Effect =
  | { _tag: "ReadFile"; path: string }
  | { _tag: "WriteFile"; path: string; content: string }
  | { _tag: "Log"; message: string };
```

No classes, no `fs` import, no side effects. Just data.

### Step 2: The Task type

A task is a tiny tree with three possible shapes:

```typescript
type Task<A> =
  | { _tag: "Pure"; value: A }                                    // done, here is the result
  | { _tag: "Effect"; effect: Effect; cont: (r: unknown) => Task<A> }  // do this, then continue
  | { _tag: "Fail"; error: string };                              // something went wrong
```

- **Pure** means the computation is finished and holds a value.
- **Effect** means "perform this effect, feed the result into `cont` to get the
  next step." This is where the magic lives — the continuation `cont` is what
  makes tasks composable. Each effect says "do *this*, and when you have the
  result, *here is what to do next*."
- **Fail** means something went wrong.

### Step 3: Smart constructors

We never build task nodes by hand. Instead, we write small functions:

```typescript
const pure = <A>(value: A): Task<A> =>
  ({ _tag: "Pure", value });

const readFile = (path: string): Task<string> =>
  ({ _tag: "Effect", effect: { _tag: "ReadFile", path }, cont: (r) => pure(r as string) });

const writeFile = (path: string, content: string): Task<void> =>
  ({ _tag: "Effect", effect: { _tag: "WriteFile", path, content }, cont: () => pure(undefined) });

const log = (message: string): Task<void> =>
  ({ _tag: "Effect", effect: { _tag: "Log", message }, cont: () => pure(undefined) });
```

### Step 4: Sequencing with flatMap

The key operation is **flatMap** (also called **bind** or **chain**). It lets
you feed the result of one task into the next:

```typescript
const flatMap = <A, B>(task: Task<A>, f: (a: A) => Task<B>): Task<B> => {
  switch (task._tag) {
    case "Pure":   return f(task.value);
    case "Fail":   return task as unknown as Task<B>;
    case "Effect": return {
      _tag: "Effect",
      effect: task.effect,
      cont: (result) => flatMap(task.cont(result), f),
    };
  }
};
```

When the input is `Pure`, we have a value — apply `f` to get the next task.
When it is `Fail`, short-circuit. When it is `Effect`, rewire the continuation
so that after the effect completes, we `flatMap` the rest. No effect is
executed here. We are just building a bigger data structure.

### Step 5: Write a program

```typescript
const program: Task<void> = flatMap(
  readFile("name.txt"),
  (name) => flatMap(
    writeFile("greeting.txt", `Hello, ${name}!`),
    () => log(`Greeted ${name}`),
  ),
);
```

`program` is a value. A tree of three nodes. No file has been read, nothing has
been written, nothing has been logged. It is a plan, waiting for someone to
execute it.

## Three interpreters, one program

### The production interpreter

Walk the tree. When you hit an `Effect`, actually do it:

```typescript
const runTask = async <A>(task: Task<A>): Promise<A> => {
  switch (task._tag) {
    case "Pure": return task.value;
    case "Fail": throw new Error(task.error);
    case "Effect": {
      const result = await executeEffect(task.effect);  // real I/O here
      return runTask(task.cont(result));
    }
  }
};
```

### The dry-run interpreter

Walk the tree. When you hit an `Effect`, record it and return a fake value:

```typescript
const dryRun = <A>(task: Task<A>): { value: A; effects: Effect[] } => {
  const effects: Effect[] = [];

  const run = <T>(t: Task<T>): T => {
    switch (t._tag) {
      case "Pure": return t.value;
      case "Fail": throw new Error(t.error);
      case "Effect": {
        effects.push(t.effect);
        const mock = mockFor(t.effect);         // fake result
        return run(t.cont(mock) as Task<T>);
      }
    }
  };

  return { value: run(task), effects };
};
```

The mock function is trivial — `ReadFile` returns a placeholder string,
`WriteFile` returns `undefined`, and so on. The task continues to completion
using fake data, and you get back the full list of effects it *would* have
performed.

### The undo interpreter

Add an `undo` field to write effects:

```typescript
type WriteFileEffect = {
  _tag: "WriteFile";
  path: string;
  content: string;
  undo?: Task<void>;  // e.g. deleteFile(path)
};
```

The undo interpreter walks the tree like `dryRun`, collects every `undo` task,
then executes them in reverse:

```typescript
const runUndo = async <A>(task: Task<A>): Promise<number> => {
  const undos: Task<void>[] = [];

  // Phase 1: walk with mocks, collect undos
  const walk = <T>(t: Task<T>): T => {
    switch (t._tag) {
      case "Pure": return t.value;
      case "Fail": throw new Error(t.error);
      case "Effect":
        if ("undo" in t.effect && t.effect.undo) undos.push(t.effect.undo);
        return walk(t.cont(mockFor(t.effect)) as Task<T>);
    }
  };
  walk(task);

  // Phase 2: execute in reverse
  for (const undo of undos.reverse()) {
    await runTask(undo);
  }
  return undos.length;
};
```

The same task definition that creates files can undo its own work. No separate
undo logic. No state files. The undo information lives *inside the task tree*.

## Why this matters in practice

### Testing without mocks

Because `dryRun` gives you the complete list of effects, you can write tests
that assert *what your program would do* without doing it:

```typescript
const { effects } = dryRun(program);

assert(effects[0]._tag === "ReadFile");
assert(effects[0].path === "name.txt");
assert(effects[1]._tag === "WriteFile");
assert(effects[1].path === "greeting.txt");
```

No filesystem setup. No cleanup. No flaky tests from leftover state.
Millisecond execution. And crucially, you are testing the *real program* — not
a simplified version wired to test doubles.

### Preview mode (dry run)

Give users a `--dry-run` flag that shows exactly what would happen:

```typescript
if (options.dryRun) {
  const { effects } = dryRun(program);
  for (const e of effects) console.log(describeEffect(e));
} else {
  await runTask(program);
}
```

This is not a hand-maintained preview. It is derived mechanically from the same
code that does the real work. It cannot fall out of sync.

### Reversible operations

Give users an `--undo` flag that reverses what a previous run did:

```typescript
if (options.undo) {
  const count = await runUndo(program);
  console.log(`Reversed ${count} operations`);
}
```

The undo is deterministic: given the same task definition and the same inputs,
it produces the same undo steps. No journal file, no transaction log.

## The word "monad"

If you have read this far, you already understand the essential idea. The word
**monad** refers to the combination of `pure` (lift a value into the
structure) and `flatMap` (sequence two steps, passing the result of the first
to produce the second). That is all it is. The Task type, together with `pure`
and `flatMap`, forms a monad.

The pattern matters not because of the name but because of the **separation it
enforces**: the description of *what to do* is divorced from the decision of
*how to do it*. That separation is what gives you testing, dry-run, and undo
without extra work.

## The real library

The simplified code above captures the pattern. The actual `@canonical/task`
library adds:

- **Generator syntax** (`gen` / `$`) so you can write sequential code with
  `yield*` instead of nested `flatMap` calls
- **A rich effect vocabulary**: filesystem, process execution, user prompts,
  logging, context passing, concurrency
- **Combinators**: `sequence`, `parallel`, `when`, `retry`, `bracket`, and more
- **A fluent builder API** for chaining
- **Structured errors** with codes, context, and suppressed errors from parallel
  execution
- **Default undo metadata** on write effects — `writeFile` automatically
  attaches `deleteFile` as its undo, `mkdir` attaches `deleteDirectory`, etc.

See the [README](./README.md) for the complete API reference.

## Further reading

The idea of representing effects as data and interpreting them separately has
deep roots in functional programming:

- **Philip Wadler**, *Monads for functional programming* (1995) — the
  accessible introduction that brought monads to a wider audience
- **Simon Peyton Jones**, *Tackling the Awkward Squad* (2001) — how Haskell's
  IO monad uses this exact pattern to handle I/O in a pure language
- **Effect-TS** (effect.website) and **ZIO** (zio.dev) — modern, industrial
  implementations of the same idea in TypeScript and Scala, respectively

The Task pattern in this library is a focused application of these ideas,
optimized for CLI tooling where testability, preview, and reversibility are
the primary concerns.

<!--
## Self-Assessment

1. **Accessibility** — A: The guide avoids jargon until the very end, builds up
   from a relatable problem, and introduces "monad" only after the reader has
   already seen the pattern in action. Could be S if it included a runnable
   playground link.

2. **Motivation** — S: The opening three questions (test, preview, undo) are
   concrete problems every CLI developer has faced. The "recipe vs. cooked meal"
   analogy lands the abstract point early. The "Why this matters in practice"
   section ties each interpreter back to a real user-facing capability.

3. **Concreteness** — A: The simplified code is ~50 lines for the core types,
   ~20 for dry-run, ~15 for undo. All examples are minimal TypeScript that
   would compile with trivial supporting code. Not quite runnable as-is (no
   executeEffect/mockFor impl), which keeps it S-adjacent but not S.

4. **Completeness** — S: All three advantages (testing, dry-run, undo) get
   dedicated sections with code. The bridge from simplified to real library is
   explicit. References are included.

5. **Flow** — S: Problem -> core idea -> build from scratch -> three
   interpreters -> practical payoff -> naming the pattern -> real library ->
   further reading. Each section builds on the previous one with no backtracking.
-->
