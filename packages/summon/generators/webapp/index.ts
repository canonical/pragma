/**
 * Web App Generator (Advanced Demo)
 *
 * A comprehensive example generator that demonstrates the full power of Summon,
 * including parallel operations, file I/O, conditionals, error handling,
 * context management, and template rendering.
 *
 * Use this as a reference for building complex generators.
 */

import * as path from "node:path";
import {
  appendFile,
  copyFile,
  debug,
  exec,
  exists,
  getContext,
  ifElse,
  info,
  mkdir,
  orElse,
  parallel,
  promptConfirm,
  promptSelect,
  promptText,
  readFile,
  sequence_,
  setContext,
  template,
  traverse_,
  warn,
  when,
  withHelpers,
  writeFile,
} from "../../src/index.js";
import type { GeneratorDefinition, Task } from "../../src/types.js";
import { flatMap, map, pure } from "../../src/task.js";

// =============================================================================
// Types
// =============================================================================

interface WebAppAnswers {
  name: string;
  description: string;
  framework: "react" | "vanilla";
  styling: "css" | "tailwind" | "none";
  features: string[];
  withTests: boolean;
  withDocs: boolean;
  installDeps: boolean;
}

// =============================================================================
// Helper Tasks
// =============================================================================

/**
 * Check if a directory exists, creating it if not.
 * Demonstrates: exists + ifElse + info logging
 */
const ensureDir = (dirPath: string): Task<void> =>
  flatMap(exists(dirPath), (doesExist) =>
    ifElse(
      doesExist,
      sequence_([debug(`Directory ${dirPath} already exists`)]),
      sequence_([info(`Creating ${dirPath}/`), mkdir(dirPath)]),
    ),
  );

/**
 * Write a JSON file with pretty formatting.
 * Demonstrates: writeFile with transformation
 */
const writeJson = (filePath: string, data: object): Task<void> =>
  writeFile(filePath, JSON.stringify(data, null, 2) + "\n");

/**
 * Try to read an existing config, falling back to default.
 * Demonstrates: orElse for error recovery
 */
const readConfigOrDefault = <T>(
  configPath: string,
  defaultValue: T,
): Task<T> =>
  orElse(
    map(readFile(configPath), (content) => JSON.parse(content) as T),
    pure(defaultValue),
  );

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<WebAppAnswers> = {
  meta: {
    name: "webapp",
    description:
      "Create a web application with configurable framework, styling, and features",
    version: "0.1.0",
    help: `This advanced generator demonstrates the full capabilities of Summon:

  EFFECTS DEMONSTRATED:
  - File Operations: readFile, writeFile, copyFile, mkdir, exists
  - Process Execution: exec (npm/bun commands)
  - Logging: info, warn, debug
  - Context: getContext, setContext (for passing data between tasks)

  COMBINATORS DEMONSTRATED:
  - sequence_: Sequential task composition
  - parallel: Concurrent task execution
  - traverse_: Mapping over arrays with tasks
  - when/ifElse: Conditional task execution
  - orElse: Error recovery with fallbacks
  - flatMap/map: Monadic composition

  TEMPLATES:
  - EJS templates with withHelpers (camelCase, pascalCase, etc.)
  - Conditional template sections
  - Dynamic content based on answers`,
    examples: [
      // Zero-config: uses all defaults, interactive prompts
      "summon webapp",
      // Minimal: just override the name, rest uses defaults
      "summon webapp --name=my-app",
      // Partial: specify stack choices, defaults for the rest
      "summon webapp --name=my-app --framework=react --styling=tailwind",
      // Features: add specific modules
      "summon webapp --name=my-app --features=router,state,api",
      // Full non-interactive: all options specified, skip prompts
      "summon webapp --name=my-app --framework=react --styling=tailwind --features=router,state --no-withDocs --yes",
      // Preview mode: see what would be generated without writing
      "summon webapp --dry-run",
    ],
  },

  prompts: [
    {
      name: "name",
      type: "text",
      message: "Project name:",
      default: "my-webapp",
      group: "Project",
    },
    {
      name: "description",
      type: "text",
      message: "Description:",
      default: "A web application",
      group: "Project",
    },
    {
      name: "framework",
      type: "select",
      message: "Framework:",
      choices: [
        { label: "React", value: "react" },
        { label: "Vanilla JS", value: "vanilla" },
      ],
      default: "react",
      group: "Stack",
    },
    {
      name: "styling",
      type: "select",
      message: "Styling solution:",
      choices: [
        { label: "Plain CSS", value: "css" },
        { label: "Tailwind CSS", value: "tailwind" },
        { label: "None", value: "none" },
      ],
      default: "css",
      group: "Stack",
    },
    {
      name: "features",
      type: "multiselect",
      message: "Additional features:",
      choices: [
        { label: "Router", value: "router" },
        { label: "State Management", value: "state" },
        { label: "API Client", value: "api" },
        { label: "Logging", value: "logging" },
      ],
      default: [],
      group: "Stack",
    },
    {
      name: "withTests",
      type: "confirm",
      message: "Include test setup?",
      default: true,
      group: "Extras",
    },
    {
      name: "withDocs",
      type: "confirm",
      message: "Include documentation?",
      default: true,
      group: "Extras",
    },
    {
      name: "installDeps",
      type: "confirm",
      message: "Install dependencies after generation?",
      default: false,
      group: "Extras",
    },
  ],

  generate: (answers) => {
    const {
      name,
      framework,
      styling,
      withTests,
      withDocs,
      installDeps,
    } = answers;

    // Filter out empty strings from features (handles --features= edge case)
    const features = (answers.features ?? []).filter((f) => f.length > 0);

    // Enhance answers with case transformation helpers
    const vars = withHelpers({
      ...answers,
      features, // Use cleaned features
      hasRouter: features.includes("router"),
      hasState: features.includes("state"),
      hasApi: features.includes("api"),
      hasLogging: features.includes("logging"),
    });

    const projectDir = name;

    // =========================================================================
    // Task 1: Setup directory structure (parallel)
    // Demonstrates: parallel + ensureDir helper
    // =========================================================================
    const createDirectories = sequence_([
      info("Setting up directory structure..."),
      // Store project path in context for later tasks
      setContext("projectDir", projectDir),
      // Create directories in parallel for efficiency
      parallel([
        ensureDir(projectDir),
        ensureDir(path.join(projectDir, "src")),
        ensureDir(path.join(projectDir, "src", "components")),
        ensureDir(path.join(projectDir, "public")),
        when(withTests, ensureDir(path.join(projectDir, "tests"))),
        when(withDocs, ensureDir(path.join(projectDir, "docs"))),
      ]),
    ]);

    // =========================================================================
    // Task 2: Generate configuration files
    // Demonstrates: writeJson, readConfigOrDefault, parallel
    // =========================================================================
    const generateConfigs = sequence_([
      info("Generating configuration files..."),
      parallel([
        // Package.json with dependencies based on choices
        writeJson(path.join(projectDir, "package.json"), {
          name,
          version: "0.1.0",
          description: answers.description,
          type: "module",
          scripts: {
            dev: framework === "react" ? "vite" : "live-server public",
            build: framework === "react" ? "vite build" : "echo 'No build step'",
            ...(withTests ? { test: "vitest" } : {}),
          },
          dependencies: {
            ...(framework === "react"
              ? { react: "^18.2.0", "react-dom": "^18.2.0" }
              : {}),
            ...(styling === "tailwind" ? { tailwindcss: "^3.4.0" } : {}),
            ...(features.includes("router") && framework === "react"
              ? { "react-router-dom": "^6.20.0" }
              : {}),
            ...(features.includes("state") && framework === "react"
              ? { zustand: "^4.4.0" }
              : {}),
            ...(features.includes("api") ? { ky: "^1.1.0" } : {}),
          },
          devDependencies: {
            ...(framework === "react"
              ? { vite: "^5.0.0", "@vitejs/plugin-react": "^4.2.0" }
              : {}),
            ...(withTests ? { vitest: "^1.0.0" } : {}),
            typescript: "^5.3.0",
            ...(styling === "tailwind"
              ? { autoprefixer: "^10.4.0", postcss: "^8.4.0" }
              : {}),
          },
        }),

        // TypeScript config
        writeJson(path.join(projectDir, "tsconfig.json"), {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            jsx: framework === "react" ? "react-jsx" : undefined,
            esModuleInterop: true,
            skipLibCheck: true,
            outDir: "dist",
          },
          include: ["src/**/*"],
          exclude: ["node_modules"],
        }),

        // Tailwind config (conditional)
        when(
          styling === "tailwind",
          writeFile(
            path.join(projectDir, "tailwind.config.js"),
            `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
`,
          ),
        ),
      ]),
    ]);

    // =========================================================================
    // Task 3: Generate source files using templates
    // Demonstrates: template, traverse_, when
    // =========================================================================
    const generateSourceFiles = sequence_([
      info("Generating source files..."),

      // Main entry point
      template({
        source: path.join(__dirname, "templates", "main.tsx.ejs"),
        dest: path.join(projectDir, "src", `main.${framework === "react" ? "tsx" : "ts"}`),
        vars,
      }),

      // App component (React) or main module (Vanilla)
      template({
        source: path.join(
          __dirname,
          "templates",
          framework === "react" ? "App.tsx.ejs" : "app.ts.ejs",
        ),
        dest: path.join(
          projectDir,
          "src",
          framework === "react" ? "App.tsx" : "app.ts",
        ),
        vars,
      }),

      // Index HTML
      template({
        source: path.join(__dirname, "templates", "index.html.ejs"),
        dest: path.join(projectDir, "index.html"),
        vars,
      }),

      // Optional: Generate feature modules
      when(
        features.length > 0,
        sequence_([
          info(`Adding ${features.length} feature module(s)...`),
          traverse_(features, (feature) =>
            template({
              source: path.join(__dirname, "templates", "feature.ts.ejs"),
              dest: path.join(projectDir, "src", `${feature}.ts`),
              vars: { ...vars, featureName: feature },
            }),
          ),
          // Create barrel file (index.ts) with exports for each feature
          // Demonstrates: appendFile for creating/updating barrel files
          info("Creating barrel file (src/index.ts)..."),
          writeFile(
            path.join(projectDir, "src", "index.ts"),
            `// Barrel file - auto-generated by summon webapp\n// Re-exports all modules for easy importing\n\n`,
          ),
          traverse_(features, (feature) =>
            appendFile(
              path.join(projectDir, "src", "index.ts"),
              `export * from "./${feature}.js";\n`,
            ),
          ),
        ]),
      ),

      // Optional: Styles
      when(
        styling !== "none",
        template({
          source: path.join(__dirname, "templates", "styles.css.ejs"),
          dest: path.join(projectDir, "src", "styles.css"),
          vars,
        }),
      ),
    ]);

    // =========================================================================
    // Task 4: Generate tests (conditional)
    // Demonstrates: when + parallel for optional features
    // =========================================================================
    const generateTests = when(
      withTests,
      sequence_([
        info("Setting up tests..."),
        parallel([
          template({
            source: path.join(__dirname, "templates", "app.test.ts.ejs"),
            dest: path.join(projectDir, "tests", "app.test.ts"),
            vars,
          }),
          writeFile(
            path.join(projectDir, "vitest.config.ts"),
            `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: '${framework === "react" ? "jsdom" : "node"}',
    include: ['tests/**/*.test.ts'],
  },
});
`,
          ),
        ]),
      ]),
    );

    // =========================================================================
    // Task 5: Generate documentation (conditional)
    // Demonstrates: when + traverse_ for multiple docs
    // =========================================================================
    const generateDocs = when(
      withDocs,
      sequence_([
        info("Generating documentation..."),
        traverse_(
          [
            { name: "README.md", template: "README.md.ejs", dest: "" },
            {
              name: "ARCHITECTURE.md",
              template: "ARCHITECTURE.md.ejs",
              dest: "docs",
            },
          ],
          (doc) =>
            template({
              source: path.join(__dirname, "templates", doc.template),
              dest: path.join(projectDir, doc.dest, doc.name),
              vars,
            }),
        ),
      ]),
    );

    // =========================================================================
    // Task 6: Install dependencies (conditional)
    // Demonstrates: exec + context reading + warn
    // =========================================================================
    const installDependencies = when(
      installDeps,
      sequence_([
        info("Installing dependencies..."),
        warn("This may take a moment..."),
        flatMap(getContext<string>("projectDir"), (dir) =>
          flatMap(exec("bun", ["install"], dir ?? projectDir), (result) =>
            ifElse(
              result.exitCode === 0,
              info("Dependencies installed successfully!"),
              warn(`Installation completed with warnings (exit code: ${result.exitCode})`),
            ),
          ),
        ),
      ]),
    );

    // =========================================================================
    // Final: Compose all tasks sequentially
    // =========================================================================
    return sequence_([
      info(`Creating ${name} with ${framework} + ${styling}...`),
      debug(`Features: ${features.join(", ") || "none"}`),

      createDirectories,
      generateConfigs,
      generateSourceFiles,
      generateTests,
      generateDocs,
      installDependencies,

      info(`
Done! Your web app is ready.

Next steps:
  cd ${name}
  ${installDeps ? "" : "bun install\n  "}bun run dev
`),
    ]);
  },
};

export default generator;
