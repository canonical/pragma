# How-To Guides

Task-oriented guides for common scenarios. Each assumes familiarity with the basics from the [tutorial](tutorial.md).

---

## Gathering User Input

### Adding Different Prompt Types

Beyond simple text input, generators often need boolean choices, selections, or multiple selections. The prompt type should match how users think about the decision:

```typescript
prompts: [
  // Text — for free-form values where anything goes
  {
    name: "name",
    type: "text",
    message: "Project name:",
    default: "my-app",
  },

  // Confirm — for features with clear on/off semantics
  // default: true means users opt *out* with --no-with-tests
  {
    name: "withTests",
    type: "confirm",
    message: "Include test setup?",
    default: true,
  },

  // Select — when exactly one choice must be made
  {
    name: "framework",
    type: "select",
    message: "Framework:",
    choices: [
      { label: "React", value: "react" },
      { label: "Vue", value: "vue" },
      { label: "Svelte", value: "svelte" },
    ],
  },

  // Multiselect — when choices are independent and combinable
  {
    name: "features",
    type: "multiselect",
    message: "Features to include:",
    choices: [
      { label: "TypeScript", value: "typescript" },
      { label: "ESLint", value: "eslint" },
      { label: "Prettier", value: "prettier" },
    ],
  },
]
```

All prompts become CLI flags automatically:

```bash
summon my-gen --name=dashboard --no-with-tests --framework=react --features=typescript,eslint
```

### Validating Input

Validation catches bad input early, before it causes cryptic failures downstream. Return `true` to accept, or a string to show as an error:

```typescript
{
  name: "port",
  type: "text",
  message: "Server port:",
  default: "3000",
  validate: (value) => {
    const n = parseInt(value, 10);
    if (isNaN(n)) return "Port must be a number";
    if (n < 1 || n > 65535) return "Port must be between 1 and 65535";
    return true;
  },
}
```

### Transforming Input

Transform normalizes input before your generator sees it — trimming whitespace, fixing case, sanitizing for filenames:

```typescript
{
  name: "name",
  type: "text",
  message: "Component name:",
  transform: (value) => value.trim().replace(/\s+/g, "-").toLowerCase(),
}
```

Your `generate` function receives the transformed value. Use `withHelpers` later if you need `pascalCase(name)` for class names.

---

## Working with Files

### Reading Existing Files

Generators that modify existing projects — adding scripts to package.json, appending exports to barrels — need to read before writing:

```typescript
import { readFile, flatMap, writeFile, appendFile } from "@canonical/summon";

// Read, transform, write back
generate: (answers) => flatMap(
  readFile("package.json"),
  (content) => {
    const pkg = JSON.parse(content);
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.generate = "summon";
    return writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");
  }
)

// Or just append
generate: (answers) => appendFile(
  "src/components/index.ts",
  `export * from "./${answers.name}";\n`
)

// Append with create-if-missing for files that might not exist yet
generate: (answers) => appendFile(
  "src/components/index.ts",
  `export * from "./${answers.name}";\n`,
  true
)
```

### Checking File Existence

Generators should often behave differently based on what's already there — skipping files that exist, merging with existing config:

```typescript
import { exists, ifElseM, writeFile, warn } from "@canonical/summon";

generate: (answers) => ifElseM(
  exists("tsconfig.json"),
  warn("tsconfig.json exists — skipping to preserve your settings"),
  writeFile("tsconfig.json", defaultTsConfig)
)
```

Note: `ifElseM` takes a Task as its condition (like `exists()`). Use plain `ifElse` when you have a boolean from answers.

### Copying Files and Directories

For static assets that don't need templating — images, fonts, fixtures:

```typescript
import { copyFile, copyDirectory } from "@canonical/summon";

generate: (answers) => sequence_([
  // Source paths are relative to your generator package
  copyFile("./assets/placeholder.png", `${answers.name}/public/placeholder.png`),
  copyDirectory("./fixtures", `${answers.name}/test/fixtures`),
])
```

### Batch Operations with Glob

For operations across many files — renaming, updating imports, generating indexes:

```typescript
import { glob, flatMap, traverse_, readFile, writeFile, info } from "@canonical/summon";

generate: (answers) => flatMap(
  glob("src/**/*.ts"),
  (files) => traverse_(files, (file) =>
    flatMap(readFile(file), (content) => {
      const updated = content.replace(new RegExp(answers.oldName, "g"), answers.newName);
      return updated !== content
        ? writeFile(file, updated)
        : info(`No changes in ${file}`);
    })
  )
)
```

---

## Control Flow

### Conditional Generation

Optional files based on user choices:

```typescript
import { when, unless, ifElse, sequence_ } from "@canonical/summon";

generate: (answers) => sequence_([
  writeFile(`${answers.name}.tsx`, componentCode),

  // when: runs if true
  when(answers.withTests, writeFile(`${answers.name}.test.tsx`, testCode)),

  // unless: runs if false
  unless(answers.skipConfig, writeFile("config.json", defaultConfig)),

  // ifElse: choose between two paths
  ifElse(
    answers.useTypeScript,
    writeFile("index.ts", tsCode),
    writeFile("index.js", jsCode)
  ),
])
```

### Processing Arrays

When users provide multiple items to process:

```typescript
import { traverse, traverse_ } from "@canonical/summon";

// traverse_: process each, discard results (for side effects)
generate: (answers) => traverse_(
  answers.modules,
  (mod) => sequence_([
    mkdir(`src/${mod}`),
    writeFile(`src/${mod}/index.ts`, `export const ${mod} = {};\n`),
  ])
)

// traverse: process each, collect results (for further processing)
generate: (answers) => flatMap(
  traverse(answers.modules, (mod) => readFile(`templates/${mod}.json`)),
  (configs) => writeFile("config.json", JSON.stringify(configs.map(JSON.parse), null, 2))
)
```

### Error Handling

For operations that might fail — missing files, flaky network:

```typescript
import { orElse, attempt, optional, pure, retry } from "@canonical/summon";

// orElse: try first, fall back to second
orElse(
  readFile("config.json"),
  () => pure('{"version": "1.0.0"}')
)

// attempt: capture success/failure as Either
flatMap(attempt(readFile("maybe.json")), (result) =>
  result._tag === "Right"
    ? info(`Found: ${result.value}`)
    : warn("Not found, using defaults")
)

// optional: return undefined instead of failing
flatMap(optional(readFile("optional.json")), (content) =>
  content ? processConfig(content) : pure(undefined)
)

// retry: try N times for flaky operations
retry(3, exec("npm", ["install"]))
```

---

## Templates

Summon uses [EJS](https://ejs.co/) for templating — see the [syntax reference](https://ejs.co/#docs). The basics: `<%= %>` outputs values, `<% %>` runs code.

### Template Variables

Create `templates/component.tsx.ejs`:

```ejs
import type { <%= name %>Props } from "./types";
<% if (withStyles) { %>
import styles from "./<%= name %>.module.css";
<% } %>

export const <%= name %> = ({ children, ...props }: <%= name %>Props) => {
  return <div {...props}>{children}</div>;
};
```

Use it:

```typescript
template({
  source: "./templates/component.tsx.ejs",  // relative to generator package
  dest: `src/components/${answers.name}.tsx`,
  vars: { name: answers.name, withStyles: answers.withStyles },
})
```

### String Helpers

When you need `MyComponent`, `my-component`, and `MY_COMPONENT` from one input:

```typescript
import { template, withHelpers } from "@canonical/summon";

template({
  source: "./templates/component.tsx.ejs",
  dest: `src/components/${answers.name}.tsx`,
  vars: withHelpers({ name: answers.name }),
})
```

In the template:

```ejs
import styles from "./<%= kebabCase(name) %>.module.css";

export class <%= pascalCase(name) %> {
  static readonly <%= constantCase(name) %>_VERSION = "1.0.0";
}
```

Available: `camelCase`, `pascalCase`, `kebabCase`, `snakeCase`, `constantCase`.

### Directory Templates

For scaffolds with many related files:

```
templates/component/
├── Component.tsx.ejs
├── Component.test.tsx.ejs
├── types.ts.ejs
└── index.ts.ejs
```

```typescript
templateDir({
  source: "./templates/component",
  dest: `src/components/${answers.name}`,
  vars: withHelpers({ name: answers.name }),
  rename: {
    "Component.tsx.ejs": `${answers.name}.tsx`,
    "Component.test.tsx.ejs": `${answers.name}.test.tsx`,
  },
})
```

---

## Multi-Generator Packages

### Namespaced Generators

Group related generators under a namespace:

```typescript
export const generators: Record<string, AnyGenerator> = {
  "component/react": reactGenerator,
  "component/svelte": svelteGenerator,
  "component/vue": vueGenerator,
};
```

Users see the hierarchy:

```bash
summon component        # lists react, svelte, vue
summon component react  # runs the React generator
```

### Composing Generators

One generator calling another:

```typescript
import { generators as componentGenerators } from "@canonical/summon-component";

const featureGenerator: GeneratorDefinition<Answers> = {
  // ...
  generate: (answers) => sequence_([
    mkdir(`src/features/${answers.name}`),

    // Delegate to another generator
    componentGenerators["component/react"].generate({
      componentPath: `src/features/${answers.name}/components/Main`,
      withTests: true,
    }),

    writeFile(`src/features/${answers.name}/index.ts`, barrel),
  ]),
};
```

---

## Testing

### Inspecting Effects

```typescript
import { dryRun, filterEffects, getAffectedFiles, getFileWrites, countEffects } from "@canonical/summon";

test("creates expected files", () => {
  const { effects } = dryRun(generator.generate({ name: "test", withTests: true }));

  // File paths
  expect(getAffectedFiles(effects)).toContain("src/test/index.ts");

  // File content
  const writes = getFileWrites(effects);
  expect(writes.find(w => w.path === "src/test/index.ts")?.content).toContain("export");

  // Effect counts
  expect(countEffects(effects)).toEqual({ MakeDir: 1, WriteFile: 3 });

  // Specific effect types
  const execs = filterEffects(effects, "Exec");
  expect(execs[0].command).toBe("npm");
});
```

### Virtual Filesystem State

The dry-run interpreter tracks state, so conditional logic works correctly:

```typescript
const task = sequence_([
  writeFile("config.json", "{}"),
  ifElseM(
    exists("config.json"),  // true — sees the virtual file above
    info("exists"),
    info("missing"),
  ),
]);

const { effects } = dryRun(task);
expect(filterEffects(effects, "Log").some(l => l.message === "exists")).toBe(true);
```

---

## CLI Usage

### Development Mode

Load generators from a specific path without linking:

```bash
summon -g ./packages/my-generators component react
```

### Non-Interactive

For CI/scripts:

```bash
summon my-gen --name=auto -y              # skip prompts, use defaults, skip preview
summon my-gen --name=auto --yes           # same as -y
```

---

## Non-Interactive / LLM Usage

### Running in CI Pipelines

For fully automated execution in CI/CD:

```bash
# Provide ALL required prompts as flags + -y
summon component react \
  --component-path=src/components/Button \
  --with-styles \
  --with-stories \
  --with-ssr-tests \
  -y
```

Key flags:
- `-y` / `--yes` — Skip all confirmation prompts AND the file preview step
- All prompt values as flags (check `summon <generator> --help` for available flags)

### Verbose Dry-Run for LLM Agents

When LLMs need to review generated code before committing, use `--show-contents` with `--dry-run`:

```bash
summon component react src/components/Button --dry-run --show-contents -y
```

This outputs complete file contents with line numbers:

```
├─ Create file   src/components/Button/Button.tsx
│  1 │ import type { ButtonProps } from "./types.js";
│  2 │ import "./styles.css";
│  3 │
│  4 │ const componentCssClassName = "ds button";
│    ... (truncated after 50 lines)
```

**Why this matters for LLMs:**
- Review generated code structure and patterns
- Verify code standards compliance before writing
- Extract patterns for similar components
- Debug generation issues without modifying the filesystem

### Current Limitation: TTY Requirement

Summon's interactive UI (built with Ink) requires a TTY for keyboard input. When running in non-TTY environments (CI, LLM coding assistants like Claude Code):

**Workaround**: Ensure all prompt values are provided via flags. With `--yes` and all values specified, the interactive UI is minimally invoked.

**Alternative**: For complex component generation that integrates with design system ontologies, consider using the `component-from-ontology` skill in `/skills/component-from-ontology/SKILL.md`, which provides LLM-guided generation without TTY requirements.

### Programmatic Usage

For full control, invoke generators programmatically:

```typescript
import { generators } from "@canonical/summon-component";
import { run } from "@canonical/summon";

const generator = generators["component/react"];

// Execute directly
await run(generator.generate({
  componentPath: "src/components/Button",
  withStyles: true,
  withStories: true,
  withSsrTests: true,
}));
```

This bypasses the CLI entirely, suitable for scripts and automation.
