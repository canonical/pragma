# Architectural Considerations and Design of `@canonical/generator-ds`

This document details the architectural considerations and design decisions for the `@canonical/generator-ds` package, a Yeoman generator for scaffolding components and other resources within the Canonical design system.

## 1. Goals

The primary goals of this generator are:

*   **Consistency:** Ensure that new components adhere to established coding standards, naming conventions, and file structure.
*   **Efficiency:** Reduce boilerplate and speed up the development process by automating the creation of common files and code snippets.
*   **Maintainability:** Provide a centralized and maintainable way to update component templates and best practices.
*   **Extensibility:** Allow for the addition of new generators for different types of resources (beyond just React components).
*   **User-Friendliness:** Offer a simple and intuitive command-line interface for developers.
*   **Typesafety:** Ensure generated code is typesafe through Typescript.

## 2. Core Components and Design

The package is built using [Yeoman](https://yeoman.io/), a popular scaffolding tool.  Here's a breakdown of the key components:

*   **`src/app/index.ts` (Main Generator):** This is the entry point for the generator. It handles top-level interactions, such as prompting the user to select a subgenerator (e.g., "component"). It then composes with the chosen subgenerator, delegating the actual file generation to it.

*   **`src/app/global-context.ts`:** This module defines global context variables that are used throughout the generator, such as the generator's name, version, and repository URL. This avoids hardcoding these values in multiple places.  It reads these values from the `package.json` file.

*   **Subgenerators (e.g., `src/component/index.ts`):** Each subgenerator is responsible for generating a specific type of resource.  The `component` subgenerator, for example, creates the files for a new React component.  Subgenerators define their own prompts, options, and file templates.

*   **Templates (e.g., `src/component/templates/`):** These are `.ejs` (Embedded JavaScript) template files that are used to generate the output files.  They contain placeholders that are replaced with values provided by the user or derived from the global context.

*   **`package.json`:** Besides standard package metadata, the `files` field specifies which files are included when the package is published. The `module` field points to the compiled entry point.  The `scripts` section defines build and linting commands.  Crucially, it also lists Yeoman as a dependency.

*   **`tsconfig.json`:** Configures the TypeScript compiler, specifying options like the output directory (`generators`), source directory (`src`), and included/excluded files.  It extends a base configuration (`@canonical/typescript-config-base`).

## 3. Workflow and Data Flow

1.  **Installation:** The user installs the generator globally using `npm install -g yo @canonical/generator-ds`. This also installs Yeoman (`yo`).

2.  **Invocation:** The user runs the generator using `yo @canonical/ds` (or a subgenerator directly, like `yo @canonical/ds:component`).

3.  **Main Generator (`src/app/index.ts`):**
  *   If no subgenerator is specified, the main generator prompts the user to select one.
  *   It then composes with the selected subgenerator, passing along any command-line arguments and options.

4.  **Subgenerator (e.g., `src/component/index.ts`):**
  *   The subgenerator defines command-line arguments (e.g., `componentPath`) and options (e.g., `--withStyles`, `--withStories`).
  *   It prompts the user for any required information that wasn't provided via command-line arguments.
  *   It gathers data from the user's answers, command-line options, and the global context.
  *   It uses `this.fs.copyTpl` to copy and process the template files, replacing placeholders with the gathered data.
  *   It writes the generated files to the specified destination.
  *   It handles appending to existing files (e.g., adding an export to a parent `index.ts` file).

5.  **Templates (`.ejs` files):**
  *   The template files use EJS syntax (`<%= ... %>`) to insert dynamic values.
  *   They leverage helper functions from `@canonical/utils` (e.g., `casing` for converting between different case styles).
  *   Conditional logic (`<% if (...) { %>`) is used to include or exclude parts of the template based on user options (e.g., generating a `styles.css` file only if `withStyles` is true).

## 4. Key Design Decisions

*   **Yeoman:** Yeoman provides a robust framework for building generators, handling command-line parsing, prompting, file system operations, and template processing.  It simplifies the development of the generator and provides a consistent user experience.

*   **Subgenerators:** Using subgenerators allows for a modular and extensible architecture.  New generators can be added easily without modifying the core generator logic.

*   **Global Context:** The `global-context.ts` module centralizes important, reusable information, improving maintainability.

*   **EJS Templates:** EJS is a simple and widely used templating language that integrates well with Yeoman.

*   **TypeScript:** Using TypeScript provides type safety, better code completion, and improved maintainability.

*   **`@canonical/utils`:** Leveraging a shared utility library (presumably containing functions like `casing.toPascalCase`) promotes code reuse and consistency across different Canonical projects.

*   **Argument and Option Handling:** The generator uses `this.argument` and `this.option` to define command-line arguments and options, providing a clear and documented interface for users.  Aliases (e.g., `-c` for `--withStyles`) are used for brevity.

* **Appending to `index.ts`:** The generator intelligently appends exports to the parent directory's `index.ts` file, avoiding the need for manual updates. It informs the user when a potential file conflict arises because of this.

* **Storybook and Testing:** The component generator includes options for generating Storybook stories (`withStories`) and Vitest test files, encouraging best practices for component development.

* **CSS Naming Convention:** The generated CSS class names use the `ds` namespace (defined in `global-context.ts`) and a kebab-case version of the component name, following a consistent naming convention.

## 5. Potential Improvements and Future Considerations

*   **More Generators:** Add subgenerators for other common resources, such as hooks, utilities, or entire features.
*   **Configurable Options:** Allow users to configure default values for options (e.g., always include styles) via a configuration file.
*   **Testing:** Add unit tests for the generator itself to ensure its functionality and prevent regressions.
*   **More Advanced Template Logic:** Explore more advanced EJS features, such as partials and helpers, to reduce template duplication.
*   **Interactive Prompts:** Consider using more interactive prompt types (e.g., checkboxes, autocomplete) to improve the user experience.
*   **Validation:** Implement more robust validation of user inputs to prevent errors.
* **Dry Run:** Implement a `--dry-run` option that shows what files would be created/modified without actually making changes.

## 6. Conclusion

The `@canonical/generator-ds` package provides a well-structured and efficient way to scaffold components and other resources within the Canonical design system.  Its use of Yeoman, subgenerators, EJS templates, and TypeScript results in a maintainable, extensible, and user-friendly tool.  The generator promotes consistency and best practices, ultimately speeding up development and improving code quality.