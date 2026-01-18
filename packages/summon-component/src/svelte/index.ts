/**
 * Svelte Component Generator
 *
 * Generates a Svelte 5 component with TypeScript, tests, and stories.
 * This replaces the yo @canonical/ds:sv-component generator.
 */

import * as path from "node:path";
import {
  exists,
  flatMap,
  type GeneratorDefinition,
  generatorComment,
  ifElseM,
  info,
  mkdir,
  pure,
  readFile,
  sequence_,
  type Task,
  templateHelpers,
  when,
  writeFile,
} from "@canonical/summon";

// =============================================================================
// Types
// =============================================================================

interface ComponentAnswers {
  componentPath: string;
  withStyles: boolean;
  withStories: boolean;
  useTsStories: boolean;
  withSsrTests: boolean;
}

// =============================================================================
// Validation
// =============================================================================

const isPascalCase = (str: string): boolean => {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str);
};

// =============================================================================
// Templates
// =============================================================================

const componentTemplate = (
  name: string,
  withStyles: boolean,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" }).replace("//", "<!--").replace("$", " -->")}

<script lang="ts">
	import type { ${name}Props } from "./types";

	let {
		class: className = "",
		children,
		...props
	}: ${name}Props = $props();
</script>

<div
	class="${templateHelpers.kebabCase(name)}{className ? \` \${className}\` : ''}"
	{...props}
>
	{@render children?.()}
</div>
${
  withStyles
    ? `
<style>
	.${templateHelpers.kebabCase(name)} {
		/* Component styles */
	}
</style>
`
    : ""
}`;

const typesTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" })}

import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export interface ${name}Props extends HTMLAttributes<HTMLDivElement> {
	/** Content to render inside the component */
	children?: Snippet;
}
`;

const indexTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" })}

export { default as ${name} } from "./${name}.svelte";
export type { ${name}Props } from "./types";
`;

const testTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" })}

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ${name} from "./${name}.svelte";

describe("${name}", () => {
	it("renders", () => {
		render(${name});
		// Add assertions based on your component
	});

	it("applies custom class", () => {
		render(${name}, { props: { class: "custom-class" } });
		const element = document.querySelector(".${templateHelpers.kebabCase(name)}");
		expect(element).toHaveClass("custom-class");
	});
});
`;

const ssrTestTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" })}

import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import ${name} from "./${name}.svelte";

describe("${name} SSR", () => {
	it("renders on server without errors", () => {
		const { body } = render(${name});
		expect(body).toContain("${templateHelpers.kebabCase(name)}");
	});
});
`;

const storiesSvelteTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" }).replace("//", "<!--").replace("$", " -->")}

<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import ${name} from "./${name}.svelte";

	const { Story } = defineMeta({
		title: "Components/${name}",
		component: ${name},
		tags: ["autodocs"],
	});
</script>

<Story name="Default">
	<${name}>Hello, ${name}!</${name}>
</Story>

<Story name="WithCustomClass">
	<${name} class="custom-class">Custom styled</${name}>
</Story>
`;

const storiesTsTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-svelte", { version: "0.1.0" })}

import type { Meta, StoryObj } from "@storybook/svelte";
import ${name} from "./${name}.svelte";

const meta: Meta<typeof ${name}> = {
	title: "Components/${name}",
	component: ${name},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {};

export const WithCustomClass: Story = {
	args: {
		class: "custom-class",
	},
};
`;

// =============================================================================
// File Operations
// =============================================================================

const appendExportToParentIndex = (
  parentDir: string,
  componentName: string,
): Task<void> => {
  const indexPath = path.join(parentDir, "index.ts");
  const exportLine = `export * from "./${componentName}";\n`;

  return ifElseM(
    exists(indexPath),
    // If exists, append
    flatMap(readFile(indexPath), (content) => {
      if (content.includes(`"./${componentName}"`)) {
        return pure(undefined); // Already exported
      }
      return writeFile(indexPath, content + exportLine);
    }),
    // If not exists, create
    writeFile(indexPath, exportLine),
  );
};

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<ComponentAnswers> = {
  meta: {
    name: "component/svelte",
    description:
      "Generate a Svelte 5 component with TypeScript, tests, and stories",
    version: "0.1.0",
    help: `Generate a Svelte 5 component with TypeScript, tests, and stories.

FEATURES:
  - Svelte 5 with runes ($props)
  - TypeScript types and props interface
  - Unit tests with @testing-library/svelte
  - Storybook integration (Svelte CSF or TypeScript)
  - Optional scoped styles
  - SSR tests (optional)
  - Auto-export from parent index.ts

The component name is extracted from the path and must be PascalCase.
For example, 'src/lib/components/Button' creates a 'Button' component.`,
    examples: [
      "summon component svelte --component-path=src/lib/components/Button",
      "summon component svelte --component-path=src/lib/components/Card --with-styles --with-stories",
      "summon component svelte --component-path=src/lib/components/Modal --with-stories --use-ts-stories",
      "summon component svelte --component-path=src/lib/components/Button --dry-run",
    ],
  },

  prompts: [
    {
      name: "componentPath",
      type: "text",
      message: "Component path (e.g., src/lib/components/Button):",
      default: "src/lib/components/MyComponent",
      validate: (value) => {
        if (!value || typeof value !== "string") {
          return "Component path is required";
        }
        const name = path.basename(value as string);
        if (!isPascalCase(name)) {
          return "Component name must be in PascalCase (e.g., MyComponent)";
        }
        return true;
      },
      group: "Component",
    },
    {
      name: "withStyles",
      type: "confirm",
      message: "Include <style> block?",
      default: true,
      group: "Options",
    },
    {
      name: "withStories",
      type: "confirm",
      message: "Include Storybook stories?",
      default: true,
      group: "Options",
    },
    {
      name: "useTsStories",
      type: "confirm",
      message: "Use TypeScript stories format? (otherwise Svelte CSF)",
      default: false,
      when: (answers) => answers.withStories === true,
      group: "Options",
    },
    {
      name: "withSsrTests",
      type: "confirm",
      message: "Include SSR tests?",
      default: true,
      group: "Options",
    },
  ],

  generate: (answers) => {
    const componentName = path.basename(answers.componentPath);
    const componentDir = answers.componentPath;
    const parentDir = path.dirname(componentDir);

    return sequence_([
      info(`Generating Svelte component: ${componentName}`),

      // Create directory
      mkdir(componentDir),

      // Create main component file
      writeFile(
        path.join(componentDir, `${componentName}.svelte`),
        componentTemplate(componentName, answers.withStyles),
      ),

      // Create types file
      writeFile(
        path.join(componentDir, "types.ts"),
        typesTemplate(componentName),
      ),

      // Create index file
      writeFile(
        path.join(componentDir, "index.ts"),
        indexTemplate(componentName),
      ),

      // Create test file
      writeFile(
        path.join(componentDir, `${componentName}.svelte.test.ts`),
        testTemplate(componentName),
      ),

      // Create SSR test file (conditional)
      when(
        answers.withSsrTests,
        writeFile(
          path.join(componentDir, `${componentName}.ssr.test.ts`),
          ssrTestTemplate(componentName),
        ),
      ),

      // Create stories file (conditional)
      when(
        answers.withStories && !answers.useTsStories,
        writeFile(
          path.join(componentDir, `${componentName}.stories.svelte`),
          storiesSvelteTemplate(componentName),
        ),
      ),
      when(
        answers.withStories && answers.useTsStories,
        writeFile(
          path.join(componentDir, `${componentName}.stories.ts`),
          storiesTsTemplate(componentName),
        ),
      ),

      // Append export to parent index
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
};

export default generator;
