# Architectural Considerations and Design of `@canonical/react-ds-core`

This document describes the architecture and design decisions for the `@canonical/react-ds-core` package. This package appears to be a core library of React components built using Vite, TypeScript, and Storybook, conforming to the Canonical design system.

## 1. Goals

*   **Reusable Components:** Provide a set of well-defined, reusable React components that adhere to Canonical's design system.
*   **Consistency:** Ensure a consistent look and feel across applications using these components.
*   **Accessibility:**  Build components with accessibility in mind.
*   **Testability:**  Provide a robust testing setup for components, using Vitest and Testing Library.
*   **Documentation:**  Utilize Storybook for interactive documentation and development of components in isolation.
*   **Modern Tooling:** Leverage modern tools like Vite for fast builds and HMR (Hot Module Replacement), and TypeScript for type safety.
* **Maintainability**: Easy to maintain project with up-to-date tooling, clear separation and convention over configuration.

## 2. Core Components and Design

*   **`src/ui/`:** This directory contains the core React components (e.g., `Button`, `Chip`).  Each component typically has:
  *   `ComponentName.tsx`: The React component implementation.
  *   `ComponentName.stories.tsx`: Storybook stories for documentation and development.
  *   `ComponentName.tests.tsx`: Unit tests using Vitest and `@testing-library/react`.
  *   `index.ts`: Exports the component and its types.
  *   `styles.css`:  Component-specific CSS, using the `.ds` namespace to avoid style collisions.
  *   `types.ts`: TypeScript types for the component's props.

*   **`src/index.ts`:** The main entry point for the package, exporting all components from the `src/ui/` directory.  This allows consumers to import components from a single location (e.g., `import { Button } from '@canonical/react-ds-core';`).

*   **`index.html`:** A basic HTML file used by Vite during development.  It includes the root element (`<div id="root"></div>`) where the React application will be mounted.

*   **`.storybook/`:** Contains configuration files for Storybook.
  *   `main.ts`:  Configures Storybook, including addons, and specifies where to find stories.  It leverages `@canonical/storybook-config` for a shared configuration.
  *   `preview.ts`: Configures the Storybook preview environment, including global decorators (e.g., for theming). It includes a decorator for light/dark/paper themes.

*   **`tsconfig.json` and `tsconfig.build.json`:** TypeScript configuration files.
  *   `tsconfig.json`:  Used for development and type checking.  It extends `@canonical/typescript-config-react` for shared settings. It includes Storybook and test files.  `skipLibCheck` is enabled to avoid issues with Storybook's dependencies.
  *   `tsconfig.build.json`: Used for building the production-ready package.  It excludes Storybook and test files, enabling `declaration` and `sourceMap` for generating type definitions and source maps.  `skipLibCheck` is set to `false` for production builds.

*   **`vite.config.ts`:**  Configuration file for Vite, including plugins for React (`@vitejs/plugin-react`) and handling TypeScript configuration paths (`vite-tsconfig-paths`).

*   **`vitest.config.ts` and `vitest.setup.ts`:** Configuration files for Vitest.
  * `vitest.config.ts`: Configuration that merges in the vite configuration, configures vitest, pointing at the setup file, defining globals, includes, and specifying `jsdom` as the environment.
  *   `vitest.setup.ts`: Sets up the testing environment, extending Vitest's matchers with Jest DOM matchers and cleaning up the DOM after each test.

*   **`package.json`:**  Defines package metadata, dependencies, and scripts.
  *   `dependencies`: Lists core runtime dependencies, like `react`, `react-dom`, `@canonical/styles`, and `@canonical/storybook-config`.
  *   `devDependencies`:  Lists development dependencies, including build tools (Vite, TypeScript), testing libraries (Vitest, Testing Library), Storybook, and related packages.
  *   `scripts`: Defines various build, test, and development commands.  Notice the distinction between `build:package:tsc` (for type definitions) and the implied use of Vite for bundling the JavaScript code.  `copyfiles` is used to copy CSS files to the output directory.

*   **`src/assets`**: Contains static assets used by stories, such as SVGs and images.
* **`src/index.css`**: Global styles that import from "@canonical/styles".
*   **`.gitignore`:** Specifies intentionally untracked files that Git should ignore.

## 3. Workflow

1.  **Development:**
  *   Developers write components and stories in the `src/ui/` directory.
  *   `bun run storybook` starts the Storybook development server, providing a live-reloading environment for component development.
  *   `bun run test:watch` runs Vitest in watch mode, automatically re-running tests when files change.

2.  **Testing:**
  *   `bun run test` executes all tests using Vitest.
  *   Tests are written using `@testing-library/react` for simulating user interactions and asserting on the rendered output.
  *   `vitest.setup.ts` configures the testing environment, including DOM cleanup after each test and extending matchers.

3.  **Building:**
  *   `bun run build` triggers the build process.
  *   `bun run build:package:tsc` uses the TypeScript compiler (`tsc`) with the `tsconfig.build.json` configuration to generate type definitions (`.d.ts` files) and source maps.
  *  `bun run build:package:copycss` copies CSS files from the `src/ui/` directory to the output directory (`dist/esm/`).
  * It is implied that Vite is used to bundle the javascript code into `dist/esm/index.js`

4.  **Linting and Formatting:**
  *   `bun run check` runs Biome for linting and formatting, and TypeScript for type checking.
  *   `bun run check:fix` automatically fixes linting and formatting issues.

## 4. Key Design Decisions

*   **Vite:** Vite is chosen for its fast development server and build times, providing a modern and efficient development experience.

*   **Storybook:** Storybook is used for component documentation, development, and visual testing.  It allows developers to work on components in isolation and provides a living style guide.

*   **Vitest and Testing Library:** Vitest is a fast and modern test runner, and Testing Library encourages writing tests that resemble how users interact with the components, leading to more robust and maintainable tests.

*   **TypeScript:** TypeScript provides type safety, improving code quality and reducing errors.

*   **CSS Modules (implied):** The use of separate `styles.css` files for each component, combined with class names like `ds button`, suggests a CSS Modules approach (or a similar namespacing strategy) to prevent style collisions.

*   **Separation of Concerns:**  Components are organized into separate directories, each containing all related files (implementation, stories, tests, styles, types).

*  **`@canonical/styles`:** The `@canonical/styles` package is used as a dependency, likely providing a base set of CSS styles and variables that adhere to the Canonical design system.

* **`@canonical/storybook-config`**: Reusing a common storybook configuration, encouraging consistency across projects.

## 5. Potential Improvements and Future Considerations

*   **Component Variants:** Explore ways to handle component variants (e.g., different sizes, states) in a structured and maintainable way, perhaps using a dedicated system for managing design tokens.
*   **More Comprehensive Tests:**  Add more comprehensive tests, including integration tests and visual regression tests.
*   **Automated Versioning and Publishing:**  Set up automated versioning and publishing using tools like Semantic Release or Changesets.
*   **Accessibility Auditing:**  Integrate automated accessibility checks (e.g., using axe-core) into the development and testing workflow.
*   **RTL Support:** If needed, add support for right-to-left (RTL) languages.
* **Explicit Vite bundling configuration**: Explicitly include the configuration for Vite to bundle the package javascript, rather than relying on implicit behaviour.

## 6. Conclusion

The `@canonical/react-ds-core` package provides a solid foundation for building React components that adhere to Canonical's design system. It leverages modern tooling and best practices for development, testing, and documentation. The architecture is designed to be maintainable, extensible, and consistent, ensuring a high-quality user experience across applications that use these components.