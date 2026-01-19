# Explanation: Why Effects as Data?

This document explores the ideas behind Summon. If you want to *use* Summon, start with the [Tutorial](tutorial.md). If you want to look up specific functions, see the [Reference](reference.md). This is for when you want to *understand* why Summon works the way it does.

---

## The Problem with Traditional Generators

Code generators like Yeoman, Plop, and Hygen are fundamentally imperative. When you call `fs.writeFile()`, the file is written. When you call `exec("npm install")`, the command runs. The generator *does things* as it executes.

This creates three interconnected problems:

### 1. Dry-run is a Lie

Most generators implement `--dry-run` by wrapping side-effecting functions with a "don't actually do it" flag:

```typescript
// Typical dry-run implementation
function writeFile(path, content) {
  if (dryRun) {
    console.log(`Would write: ${path}`);
    return;
  }
  fs.writeFileSync(path, content);
}
```

This works for simple generators. But what happens when your generator has conditional logic?

```typescript
if (fs.existsSync("config.json")) {
  // Modify existing config
  const config = JSON.parse(fs.readFileSync("config.json"));
  config.newSetting = true;
  fs.writeFileSync("config.json", JSON.stringify(config));
} else {
  // Create default config
  fs.writeFileSync("config.json", '{"newSetting": true}');
}
```

In dry-run mode, `existsSync` returns the *actual* filesystem state, not the state that would exist after previous dry-run operations. If an earlier part of your generator would create `config.json`, the dry-run can't know that.

The preview lies. Users see "would create config.json" but can't trust the full picture.

### 2. Testing Requires Mocking

To test a traditional generator, you need to:

1. Mock the filesystem (or use a temp directory)
2. Mock shell commands
3. Mock user input
4. Run the generator
5. Assert on mock calls or file contents
6. Clean up

```typescript
// Typical generator test
test("creates component files", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "test-"));

  // Mock inquirer
  jest.spyOn(inquirer, "prompt").mockResolvedValue({
    name: "Button",
    withTests: true,
  });

  // Run generator
  await generator.run({ cwd: tempDir });

  // Assert
  expect(existsSync(join(tempDir, "Button.tsx"))).toBe(true);
  expect(existsSync(join(tempDir, "Button.test.tsx"))).toBe(true);

  // Cleanup
  await rm(tempDir, { recursive: true });
});
```

This is brittle. Mock drift happens. Edge cases slip through. The test doesn't reflect real behavior.

### 3. Composition is Awkward

Building a complex generator from smaller pieces means manually orchestrating async operations:

```typescript
async function scaffoldFeature(answers) {
  await createComponent(answers);
  await createPage(answers);
  await updateRouter(answers);
  await runLinting();
}
```

Error handling is scattered. State is passed manually. There's no way to inspect what operations *would* happen before they do.

---

## The Insight: Separate Description from Execution

Summon's key insight is borrowed from functional programming: **effects should be data, not actions**.

Instead of *doing* things, your generator *describes* what to do. The description is a data structure — a `Task` — that can be inspected, transformed, and interpreted in different ways.

```typescript
// Traditional: does things
function generate(answers) {
  fs.mkdirSync(`src/${answers.name}`);
  fs.writeFileSync(`src/${answers.name}/index.ts`, code);
}

// Summon: describes things
function generate(answers) {
  return sequence_([
    mkdir(`src/${answers.name}`),
    writeFile(`src/${answers.name}/index.ts`, code),
  ]);
}
```

The Summon version returns a `Task<void>`. That Task contains effect objects:

```typescript
[
  { _tag: "MakeDir", path: "src/Button", recursive: true },
  { _tag: "WriteFile", path: "src/Button/index.ts", content: "..." },
]
```

These are plain JavaScript objects. Data. They don't do anything by themselves.

---

## The Interpreter Pattern

A `Task` is meaningless without something to interpret it. Summon provides multiple interpreters:

### Production Interpreter

Executes effects for real:

```typescript
// Pseudocode
function runProduction(task) {
  for (const effect of task.effects) {
    switch (effect._tag) {
      case "MakeDir":
        fs.mkdirSync(effect.path, { recursive: effect.recursive });
        break;
      case "WriteFile":
        fs.writeFileSync(effect.path, effect.content);
        break;
      // ...
    }
  }
}
```

### Dry-Run Interpreter

Collects effects without executing, maintains virtual state:

```typescript
// Pseudocode
function runDryRun(task) {
  const effects = [];
  const virtualFs = new Map(); // Virtual filesystem

  for (const effect of task.effects) {
    effects.push(effect);

    switch (effect._tag) {
      case "WriteFile":
        virtualFs.set(effect.path, effect.content);
        break;
      case "Exists":
        // Check virtual FS first, then real FS
        return virtualFs.has(effect.path) || fs.existsSync(effect.path);
        break;
      // ...
    }
  }

  return { effects, virtualFs };
}
```

The virtual filesystem is the key innovation. When your generator creates a file and later checks if it exists, the dry-run interpreter knows it "exists" in the virtual state — even though nothing was written to disk.

### Test Interpreter

Just returns the effects for assertions:

```typescript
function dryRun(task) {
  // Run with collection, return effects
  return { effects: collectEffects(task), value: computeValue(task) };
}
```

Same generator code. Different interpreters. Different behaviors.

---

## Why This Matters

### Reliable Previews

Because dry-run tracks virtual state, the preview is accurate. If step 3 depends on step 2 creating a file, the preview correctly shows what step 3 would do.

### Trivial Testing

No mocks. No temp directories. No cleanup.

```typescript
test("creates files", () => {
  const task = generator.generate({ name: "Button" });
  const { effects } = dryRun(task);

  expect(getAffectedFiles(effects)).toContain("Button.tsx");
});
```

You're testing the *description* of what would happen, not the side effects of what did happen.

### Composable Abstractions

Tasks compose naturally:

```typescript
// Combine tasks
const setup = sequence_([mkdir("src"), mkdir("test")]);
const files = parallel([writeFile("a.ts", a), writeFile("b.ts", b)]);
const all = sequence_([setup, files]);

// Conditional tasks
const maybeTest = when(answers.withTests, writeFile("test.ts", testCode));

// Error recovery
const config = orElse(readFile("config.json"), () => pure(defaultConfig));
```

These are just function calls that return Tasks. No async/await ceremony. No callback nesting.

---

## The Functional Programming Heritage

Summon's approach comes from a long tradition in functional programming:

### Free Monads and Effect Systems

The pattern of describing effects as data and interpreting them later is called the "free monad" or "effect system" pattern. Languages like Haskell, PureScript, and Scala have entire ecosystems built on this idea.

The core insight: if side effects are values, you can:
- Inspect them before running
- Transform them (add logging, change paths, etc.)
- Interpret them differently in different contexts
- Test them trivially

### IO Monad

Haskell's IO monad pioneered the idea that effectful computations are values. `IO String` is a *description* of a computation that produces a string — it doesn't run until the runtime interprets it.

### Algebraic Effects

Modern languages like Eff, Koka, and OCaml 5 have algebraic effects built in. Summon brings a simplified version of this idea to TypeScript.

---

## Comparison to Other Tools

### Yeoman

**Approach:** Class-based generators with lifecycle methods. Effects happen immediately during execution.

**Testing:** Requires yeoman-test helper which creates temp directories and runs generators for real.

**Dry-run:** Basic logging, doesn't track state.

**Summon difference:** Pure functions instead of classes. Effects are data. Testing doesn't touch the filesystem.

### Plop

**Approach:** Declarative action arrays, but actions still execute immediately when interpreted.

**Testing:** Must mock the filesystem or use temp directories.

**Dry-run:** Lists actions but doesn't simulate state changes.

**Summon difference:** Similar declarative feel, but with stateful dry-run and true effect isolation.

### Hygen

**Approach:** Template-based, convention-over-configuration. Templates in `_templates/` directory.

**Testing:** Difficult — it's file-based, not programmatic.

**Dry-run:** Shows files that would be created.

**Summon difference:** Programmatic generators with full TypeScript. Testable without filesystem. More flexible control flow.

### Nx Generators

**Approach:** Tree-based virtual filesystem. Changes accumulate in a tree, then flush to disk.

**Testing:** Tree can be inspected before flushing.

**Dry-run:** Tree shows accumulated changes.

**Summon difference:** Similar philosophy! Nx's tree is close to Summon's approach. Summon is framework-agnostic and focuses on the generator experience rather than monorepo tooling.

---

## Design Decisions

### Why EJS for Templates?

EJS is simple, widely known, and doesn't require compilation. The `<%= %>` syntax is intuitive for anyone who's used template strings. More powerful template languages (Handlebars, Nunjucks) add complexity without proportional benefit for code generation.

See [EJS documentation](https://ejs.co/) for syntax details.

### Why Barrel Exports for Discovery?

Generator packages export a `generators` record:

```typescript
export const generators: Record<string, AnyGenerator> = { ... };
```

This is explicit and type-safe. Summon can import the module and inspect what's available without filesystem conventions or magic.

### Why `sequence_` with Underscore?

Following Haskell convention: `sequence` returns results, `sequence_` discards them. The underscore signals "I don't care about the return values." This is common in effect-heavy code where you're running things for their effects, not their results.

### Why No Built-in Scaffolding CLI?

Summon is a library, not a scaffolding tool. You can build any CLI on top of it. The `summon` command is a thin wrapper that discovers and runs generators — the real work happens in generator packages.

---

## When NOT to Use Summon

Summon isn't the right choice for everything:

### Simple One-Off Scripts

If you're writing a quick script to set up a project once, the overhead of defining a generator isn't worth it. Just write imperative code.

### Non-Repeatable Operations

Generators are for repeatable scaffolding. If every invocation is unique and doesn't follow a pattern, you don't need a generator.

### When Existing Tools Fit

If Yeoman, Plop, or Hygen already do what you need and testing isn't a concern, there's no reason to switch. Use the tool that fits your workflow.

---

## Further Reading

- [Free Monads in Haskell](https://www.haskellforall.com/2012/06/you-could-have-invented-free-monads.html) — Gabriel Gonzalez's classic introduction
- [Algebraic Effects for the Rest of Us](https://overreacted.io/algebraic-effects-for-the-rest-of-us/) — Dan Abramov's accessible explanation
- [Effect Systems in Scala](https://typelevel.org/cats-effect/) — Cats Effect documentation
- [The IO Monad for Skeptics](https://www.youtube.com/watch?v=YANfkAqG9Oo) — Talk on why effect systems matter
