# Tutorial: Build Your First Generator

In this tutorial, you'll build a Lit + Vite project boilerplate generator. Along the way, you'll learn:

- How to structure a generator package
- How to define prompts that become CLI flags
- How to use file system primitives and templates
- How to add conditional logic
- How to test your generator

By the end, you'll have a working generator that scaffolds production-ready Lit projects.

**Time:** 20-25 minutes

**Prerequisites:** Node.js 18+ and either bun or npm installed.

> **Note:** The finished generator from this tutorial is available as a built-in example. You can run it with `summon example lit-vite` and study its source code.

---

## What We're Building

A generator that creates a complete Lit project with Vite:

```
my-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.ts
│   ├── my-app.ts          # Main Lit component
│   └── my-app.test.ts     # Tests (optional)
└── README.md              # Documentation (optional)
```

Users will run:

```bash
summon lit-app --name=my-dashboard --with-tests --with-readme
```

And get a ready-to-run Lit project with `bun dev` / `npm run dev`.

---

## Step 1: Create the Package

Create a new directory:

```bash
mkdir summon-lit-app
cd summon-lit-app
bun init -y
```

Edit `package.json`:

```json
{
  "name": "summon-lit-app",
  "version": "0.1.0",
  "main": "src/index.ts",
  "peerDependencies": {
    "@canonical/summon": "workspace:*"
  },
  "devDependencies": {
    "@canonical/summon": "workspace:*",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

Create the template directory:

```bash
mkdir -p src/templates
```

---

## Step 2: Create Templates

We'll use [EJS templates](https://ejs.co/) for files that need variable interpolation. EJS uses `<%= %>` for outputting values and `<% %>` for control flow — see the [EJS syntax reference](https://ejs.co/#docs) for details.

### `src/templates/package.json.ejs`

```ejs
{
  "name": "<%= name %>",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"<% if (withTests) { %>,
    "test": "vitest"<% } %>
  },
  "dependencies": {
    "lit": "^3.2.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0"<% if (withTests) { %>,
    "vitest": "^2.0.0",
    "@vitest/browser": "^2.0.0"<% } %>
  }
}
```

### `src/templates/index.html.ejs`

```ejs
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= pascalCase(name) %></title>
  </head>
  <body>
    <<%= kebabCase(name) %>></<%= kebabCase(name) %>>
    <script type="module" src="/src/index.ts"></script>
  </body>
</html>
```

### `src/templates/component.ts.ejs`

```ejs
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("<%= kebabCase(name) %>")
export class <%= pascalCase(name) %> extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      font-family: system-ui, sans-serif;
    }
    h1 {
      color: #324fff;
    }
  `;

  @property({ type: String })
  heading = "Welcome to <%= pascalCase(name) %>";

  render() {
    return html`
      <h1>${this.heading}</h1>
      <p>Edit <code>src/<%= kebabCase(name) %>.ts</code> and save to reload.</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "<%= kebabCase(name) %>": <%= pascalCase(name) %>;
  }
}
```

### `src/templates/component.test.ts.ejs`

```ejs
import { expect, test } from "vitest";
import "./<%= kebabCase(name) %>";

test("<%= kebabCase(name) %> renders heading", async () => {
  const el = document.createElement("<%= kebabCase(name) %>");
  document.body.appendChild(el);
  await el.updateComplete;

  const h1 = el.shadowRoot?.querySelector("h1");
  expect(h1?.textContent).toContain("Welcome");
});
```

### `src/templates/README.md.ejs`

```ejs
# <%= pascalCase(name) %>

A Lit web component project.

## Development

```bash
<%= packageManager %> install
<%= packageManager %> run dev
```

Open http://localhost:5173 in your browser.
<% if (withTests) { %>
## Testing

```bash
<%= packageManager %> run test
```
<% } %>
## Building

```bash
<%= packageManager %> run build
```

Output goes to `dist/`.
```

---

## Step 3: Define the Generator

Create `src/index.ts`:

```typescript
import type { GeneratorDefinition, AnyGenerator } from "@canonical/summon";
import {
  sequence_,
  mkdir,
  writeFile,
  template,
  withHelpers,
  when,
  info,
} from "@canonical/summon";

interface Answers {
  name: string;
  withTests: boolean;
  withReadme: boolean;
  packageManager: "bun" | "npm" | "pnpm";
}

const viteConfig = `
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
  },
});
`.trimStart();

const tsConfig = `
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
`.trimStart();

const generator: GeneratorDefinition<Answers> = {
  meta: {
    name: "lit-app",
    description: "Creates a Lit + Vite project",
    version: "0.1.0",
  },

  prompts: [
    {
      name: "name",
      type: "text",
      message: "Project name:",
      default: "my-lit-app",
    },
    {
      name: "withTests",
      type: "confirm",
      message: "Include Vitest tests?",
      default: true,
    },
    {
      name: "withReadme",
      type: "confirm",
      message: "Generate README?",
      default: true,
    },
    {
      name: "packageManager",
      type: "select",
      message: "Package manager:",
      choices: [
        { label: "bun", value: "bun" },
        { label: "npm", value: "npm" },
        { label: "pnpm", value: "pnpm" },
      ],
    },
  ],

  generate: (answers) => {
    const vars = withHelpers(answers);
    const dir = answers.name;

    return sequence_([
      info(`Creating ${answers.name}...`),

      // Create directory structure
      mkdir(dir),
      mkdir(`${dir}/src`),

      // Static config files
      writeFile(`${dir}/vite.config.ts`, viteConfig),
      writeFile(`${dir}/tsconfig.json`, tsConfig),

      // Templated files
      template({
        source: "./templates/package.json.ejs",
        dest: `${dir}/package.json`,
        vars,
      }),
      template({
        source: "./templates/index.html.ejs",
        dest: `${dir}/index.html`,
        vars,
      }),
      template({
        source: "./templates/component.ts.ejs",
        dest: `${dir}/src/${vars.kebabCase(answers.name)}.ts`,
        vars,
      }),

      // Entry point that imports the component
      writeFile(
        `${dir}/src/index.ts`,
        `import "./${vars.kebabCase(answers.name)}";\n`
      ),

      // Optional test file
      when(answers.withTests,
        template({
          source: "./templates/component.test.ts.ejs",
          dest: `${dir}/src/${vars.kebabCase(answers.name)}.test.ts`,
          vars,
        })
      ),

      // Optional README
      when(answers.withReadme,
        template({
          source: "./templates/README.md.ejs",
          dest: `${dir}/README.md`,
          vars,
        })
      ),

      info(`Done! Run: cd ${answers.name} && ${answers.packageManager} install`),
    ]);
  },
};

export const generators: Record<string, AnyGenerator> = {
  "lit-app": generator,
};
```

Let's unpack what's happening:

- **`withHelpers(answers)`** adds string transformations (`kebabCase`, `pascalCase`, etc.) to template variables
- **`sequence_([...])`** runs tasks in order, discarding results
- **`when(condition, task)`** only runs the task if the condition is true
- **Templates are resolved relative to your generator package**, not the target project

---

## Step 4: Test Manually

Link your package:

```bash
bun link
```

Run the generator:

```bash
# Interactive mode
summon lit-app

# Or with flags
summon lit-app --name=my-dashboard --with-tests --no-with-readme --package-manager=bun

# Preview first
summon lit-app --name=my-dashboard --dry-run
```

Try the generated project:

```bash
cd my-dashboard
bun install
bun dev
```

Open http://localhost:5173 — you should see your Lit component running.

---

## Step 5: Write Automated Tests

Create `src/index.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { dryRun, getAffectedFiles, filterEffects } from "@canonical/summon";
import { generators } from "./index";

const generator = generators["lit-app"];

describe("lit-app generator", () => {
  const baseAnswers = {
    name: "test-app",
    withTests: true,
    withReadme: true,
    packageManager: "bun" as const,
  };

  it("creates the expected file structure", () => {
    const task = generator.generate(baseAnswers);
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("test-app/package.json");
    expect(files).toContain("test-app/index.html");
    expect(files).toContain("test-app/vite.config.ts");
    expect(files).toContain("test-app/tsconfig.json");
    expect(files).toContain("test-app/src/index.ts");
    expect(files).toContain("test-app/src/test-app.ts");
    expect(files).toContain("test-app/src/test-app.test.ts");
    expect(files).toContain("test-app/README.md");
  });

  it("skips test file when withTests is false", () => {
    const task = generator.generate({ ...baseAnswers, withTests: false });
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).not.toContain("test-app/src/test-app.test.ts");
  });

  it("skips README when withReadme is false", () => {
    const task = generator.generate({ ...baseAnswers, withReadme: false });
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).not.toContain("test-app/README.md");
  });

  it("uses the correct package manager in README", () => {
    const task = generator.generate({ ...baseAnswers, packageManager: "pnpm" });
    const { effects } = dryRun(task);

    const writes = filterEffects(effects, "WriteFile");
    const readme = writes.find(w => w.path === "test-app/README.md");

    expect(readme?.content).toContain("pnpm install");
    expect(readme?.content).toContain("pnpm run dev");
  });

  it("creates properly named component file", () => {
    const task = generator.generate({ ...baseAnswers, name: "my-dashboard" });
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("my-dashboard/src/my-dashboard.ts");
  });
});
```

Run:

```bash
bun test
```

No mocks. No temp directories. No cleanup. Just pure functions returning data.

---

## Step 6: Package and Share

Your generator is ready. Options:

### Publish to npm

```bash
npm publish
```

Others install and use:

```bash
npm install summon-lit-app
summon lit-app --name=my-project
```

### Use in a Monorepo

Add to workspace packages, reference as `"summon-lit-app": "workspace:*"`.

### Keep It Local

Keep it linked for personal use:

```bash
bun link  # from your package directory
summon lit-app  # available everywhere
```

---

## Next Steps

You've built a practical generator that scaffolds real projects. Here's where to go next:

- **[How-To Guides](how-to.md)** — Specific techniques: composing generators, reading files, error handling
- **[Reference](reference.md)** — Complete API documentation
- **[Explanation](explanation.md)** — Why Summon works the way it does

Happy generating!
