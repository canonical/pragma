/**
 * React Component Generator
 *
 * Generates a React component with TypeScript, tests, stories, and styles.
 * This replaces the yo @canonical/ds:component generator.
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
): string => `${generatorComment("@canonical/summon:component-react", { version: "0.1.0" })}

import type { ${name}Props } from "./types";
${withStyles ? `import "./styles.css";\n` : ""}
/**
 * ${name} component
 */
export const ${name} = ({
	className,
	children,
	...props
}: ${name}Props): JSX.Element => {
	return (
		<div
			className={\`${templateHelpers.kebabCase(name)}\${className ? \` \${className}\` : ""}\`}
			{...props}
		>
			{children}
		</div>
	);
};
`;

const typesTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-react", { version: "0.1.0" })}

import type { HTMLAttributes, ReactNode } from "react";

export interface ${name}Props extends HTMLAttributes<HTMLDivElement> {
	/** Content to render inside the component */
	children?: ReactNode;
}
`;

const indexTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-react", { version: "0.1.0" })}

export { ${name} } from "./${name}";
export type { ${name}Props } from "./types";
`;

const testTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-react", { version: "0.1.0" })}

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ${name} } from "./${name}";

describe("${name}", () => {
	it("renders children", () => {
		render(<${name}>Test content</${name}>);
		expect(screen.getByText("Test content")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<${name} className="custom-class">Content</${name}>);
		const element = screen.getByText("Content");
		expect(element).toHaveClass("${templateHelpers.kebabCase(name)}");
		expect(element).toHaveClass("custom-class");
	});

	it("passes through additional props", () => {
		render(<${name} data-testid="test-component">Content</${name}>);
		expect(screen.getByTestId("test-component")).toBeInTheDocument();
	});
});
`;

const ssrTestTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-react", { version: "0.1.0" })}

import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ${name} } from "./${name}";

describe("${name} SSR", () => {
	it("renders without hydration errors", () => {
		const html = renderToString(<${name}>Test content</${name}>);
		expect(html).toContain("Test content");
		expect(html).toContain("${templateHelpers.kebabCase(name)}");
	});
});
`;

const storiesTemplate = (
  name: string,
): string => `${generatorComment("@canonical/summon:component-react", { version: "0.1.0" })}

import type { Meta, StoryObj } from "@storybook/react";
import { ${name} } from "./${name}";

const meta: Meta<typeof ${name}> = {
	title: "Components/${name}",
	component: ${name},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {
	args: {
		children: "Hello, ${name}!",
	},
};

export const WithCustomClass: Story = {
	args: {
		children: "Custom styled",
		className: "custom-class",
	},
};
`;

const stylesTemplate = (
  name: string,
): string => `/* ${generatorComment("@canonical/summon:component-react", { version: "0.1.0" }).slice(3)} */

.${templateHelpers.kebabCase(name)} {
	/* Component styles */
}
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
    name: "component/react",
    description:
      "Generate a React component with TypeScript, tests, stories, and styles",
    version: "0.1.0",
    help: `Generate a React component with TypeScript, tests, stories, and styles.

FEATURES:
  - TypeScript types and props interface
  - Unit tests with @testing-library/react
  - Storybook integration (optional)
  - CSS styles (optional)
  - SSR tests (optional)
  - Auto-export from parent index.ts

The component name is extracted from the path and must be PascalCase.
For example, 'src/components/Button' creates a 'Button' component.`,
    examples: [
      // Zero-config is not possible - componentPath is required
      "summon component react --component-path=src/components/Button",
      "summon component react --component-path=src/components/Card --with-styles --with-stories",
      "summon component react --component-path=src/components/Modal --no-with-ssr-tests",
      "summon component react --component-path=src/components/Button --dry-run",
    ],
  },

  prompts: [
    {
      name: "componentPath",
      type: "text",
      message: "Component path (e.g., src/components/Button):",
      default: "src/components/MyComponent",
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
      message: "Include styles.css?",
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
      info(`Generating React component: ${componentName}`),

      // Create directory
      mkdir(componentDir),

      // Create main component file
      writeFile(
        path.join(componentDir, `${componentName}.tsx`),
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
        path.join(componentDir, `${componentName}.test.tsx`),
        testTemplate(componentName),
      ),

      // Create SSR test file (conditional)
      when(
        answers.withSsrTests,
        writeFile(
          path.join(componentDir, `${componentName}.ssr.test.tsx`),
          ssrTestTemplate(componentName),
        ),
      ),

      // Create stories file (conditional)
      when(
        answers.withStories,
        writeFile(
          path.join(componentDir, `${componentName}.stories.tsx`),
          storiesTemplate(componentName),
        ),
      ),

      // Create styles file (conditional)
      when(
        answers.withStyles,
        writeFile(
          path.join(componentDir, "styles.css"),
          stylesTemplate(componentName),
        ),
      ),

      // Append export to parent index
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
};

export default generator;
