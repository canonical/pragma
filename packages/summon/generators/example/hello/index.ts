/**
 * Hello World Generator (Demo)
 *
 * A simple example generator that demonstrates the core features of Summon,
 * including EJS templates and the withHelpers utility.
 *
 * Use this as a reference when building your own generators.
 */

import * as path from "node:path";
import {
  info,
  mkdir,
  sequence_,
  template,
  when,
  withHelpers,
} from "../../../src/index.js";
import type { GeneratorDefinition } from "../../../src/types.js";

// =============================================================================
// Types
// =============================================================================

interface HelloAnswers {
  name: string;
  description: string;
  greeting: string;
  withReadme: boolean;
}

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<HelloAnswers> = {
  meta: {
    name: "hello",
    description: "A demo generator that creates a simple hello world project",
    version: "0.1.0",
    help: `This generator demonstrates the core features of Summon:

  - EJS templates for dynamic file generation
  - The withHelpers utility for case transformations (camelCase, pascalCase, etc.)
  - Conditional file generation with the 'when' combinator
  - Sequential task composition with 'sequence_' or fluent '.then()' chains

Use this generator as a reference when building your own generators.`,
    examples: [
      // Zero-config: interactive prompts with defaults
      "summon hello",
      // Minimal: just the name
      "summon hello --name=my-app",
      // Partial: customize greeting
      "summon hello --name=my-app --greeting=Hey",
      // Skip optional file
      "summon hello --name=my-app --no-withReadme",
      // Preview without writing
      "summon hello --dry-run",
      // Full non-interactive
      "summon hello --name=demo --greeting=Hello --description='A demo' --yes",
    ],
  },

  prompts: [
    {
      name: "name",
      type: "text",
      message: "Project name:",
      default: "my-project",
    },
    {
      name: "description",
      type: "text",
      message: "Description (optional):",
      default: "",
    },
    {
      name: "greeting",
      type: "select",
      message: "Choose a greeting:",
      choices: [
        { label: "Hello", value: "Hello" },
        { label: "Hi", value: "Hi" },
        { label: "Hey", value: "Hey" },
        { label: "Greetings", value: "Greetings" },
      ],
      default: "Hello",
    },
    {
      name: "withReadme",
      type: "confirm",
      message: "Include README.md?",
      default: true,
    },
  ],

  generate: (answers) => {
    const { name, withReadme } = answers;

    // withHelpers adds camelCase, kebabCase, pascalCase, etc. to the template vars
    const vars = withHelpers(answers);

    return sequence_([
      info(`Creating ${name}...`),

      // Create project directory
      mkdir(name),

      // Create main file using EJS template
      template({
        source: path.join(__dirname, "templates", "index.ts.ejs"),
        dest: path.join(name, "index.ts"),
        vars,
      }),

      // Conditionally create README using EJS template
      when(
        withReadme,
        template({
          source: path.join(__dirname, "templates", "README.md.ejs"),
          dest: path.join(name, "README.md"),
          vars,
        }),
      ),

      info(`Done! Run: cd ${name} && bun run index.ts`),
    ]);
  },
};

export default generator;
