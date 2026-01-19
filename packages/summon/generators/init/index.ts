/**
 * Init Generator
 *
 * Scaffolds a new Summon generator with templates and test structure.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { GeneratorDefinition } from "../../src/index.js";
import {
  info,
  mkdir,
  sequence_,
  template,
  withHelpers,
} from "../../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Answers {
  /** Generator path (e.g., "my-gen" or "component/vue") */
  generatorPath: string;
  /** Description of the generator */
  description: string;
  /** Output directory for generators */
  outputDir: string;
}

export const generator: GeneratorDefinition<Answers> = {
  meta: {
    name: "init",
    description: "Create a new Summon generator",
    version: "0.1.0",
    help: `Scaffold a new generator with templates and tests.

The generator path supports nested structures:
  summon init --generator-path=my-gen          # Creates generators/my-gen/
  summon init --generator-path=component/vue   # Creates generators/component/vue/

GENERATED FILES:
  generators/<path>/
  ├── index.ts              # Generator definition
  └── templates/
      ├── index.ts.ejs      # Main file template
      └── index.test.ts.ejs # Test file template`,
    examples: [
      "summon init",
      "summon init --generator-path=my-gen",
      "summon init --generator-path=component/vue",
      "summon init --generator-path=api/rest --output-dir=./custom-generators",
      "summon init --generator-path=util --dry-run",
    ],
  },

  prompts: [
    {
      name: "generatorPath",
      type: "text",
      message: "Generator path (e.g., my-gen or component/vue):",
      default: "my-generator",
    },
    {
      name: "description",
      type: "text",
      message: "Description:",
      default: "A custom generator",
    },
    {
      name: "outputDir",
      type: "text",
      message: "Output directory:",
      default: "./generators",
    },
  ],

  generate: (answers) => {
    // Parse the generator path into segments
    const normalizedPath = answers.generatorPath.replace(/\s+/g, "/");
    const segments = normalizedPath.split("/").filter(Boolean);
    const name = segments[segments.length - 1];
    const generatorDir = path.join(answers.outputDir, ...segments);
    const templatesDir = path.join(generatorDir, "templates");

    const vars = withHelpers({
      name,
      description: answers.description,
      generatorPath: normalizedPath,
      commandPath: segments.join(" "),
    });

    return sequence_([
      info(`Creating generator: ${name}`),

      // Create directories
      mkdir(generatorDir),
      mkdir(templatesDir),

      // Create generator index.ts
      template({
        source: path.join(__dirname, "templates", "generator.ts.ejs"),
        dest: path.join(generatorDir, "index.ts"),
        vars,
      }),

      // Create template files
      template({
        source: path.join(__dirname, "templates", "template-index.ts.ejs"),
        dest: path.join(templatesDir, "index.ts.ejs"),
        vars,
      }),

      template({
        source: path.join(__dirname, "templates", "template-test.ts.ejs"),
        dest: path.join(templatesDir, "index.test.ts.ejs"),
        vars,
      }),

      info(`Created generator at ${generatorDir}`),
      info(`Run with: summon ${segments.join(" ")}`),
    ]);
  },
};

export default generator;
