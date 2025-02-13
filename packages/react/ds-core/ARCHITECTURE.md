# Architecture of `@canonical/react-ds-core`

A guide to understand the design principles, key components, and technologies used in the core React component library.

This document is primarily focused on providing a clear explanation of the architecture for users who 
want to understand the 'why' and 'how' behind its structure and design.

## 1. Explanation: Architecture Overview

### 1.1 Core Goals and Design Principles

Our architecture is driven by several core goals and design principles:

*   **Reusable Components:** The primary goal is to create a library of reusable React components. These components are designed to be building blocks for various applications, promoting consistency and efficiency in development.
*   **Design System Consistency:**  All components are built to adhere to Canonical's visual identity by default. This ensures a unified and recognizable user interface across all applications that utilize this library.
*   **Accessibility First:** Accessibility is not an afterthought but a fundamental principle. Components are designed and developed with accessibility best practices in mind, ensuring usability for everyone.
*   **Modern Development Practices:**  The library embraces modern development tools and practices to enhance developer experience, maintainability, and performance.
*   **Maintainability and Extensibility:** The architecture is structured to be easily maintainable and extensible. The styling layer can be customized or extended to accommodate different design requirements and visual variations beyond the Canonical design system.
*   **Testability and Reliability:**  Robust testing is integral to the architecture, ensuring the reliability and stability of the components.

### 1.2 Tooling Choices

This package leverages a modern JavaScript toolchain to achieve its goals:

*   **[Vite](https://vite.dev):** Vite is used as the development server and build tool specifically for Storybook.
  *   **Fast Storybook Development Server with HMR:** Vite provides a fast development server for Storybook, enabling features like Hot Module Replacement (HMR) for a smooth and efficient component development and preview experience within Storybook.
  *   **Optimized Storybook Builds:** Vite is also used to build the Storybook documentation site itself, optimizing assets for deployment.
  *   **Storybook Plugin Ecosystem:** Vite's plugin system, particularly `@vitejs/plugin-react`, is essential for enabling React support within the Storybook environment.

*   **[Storybook](https://storybook.js.org/):** Storybook is employed as a development and documentation environment for components:
  *   **Isolated Component Development:** Storybook allows developers to focus on individual components in isolation, making development and testing more focused and efficient.
  *   **Living Style Guide and Documentation:** Storybook serves as an interactive style guide, showcasing components and their variations, and automatically generating documentation.
  *   **Visual Testing and QA:** Storybook integrates well with visual regression testing tools, such as [Chromatic](https://www.chromatic.com/), enabling automated visual QA of components across different states and themes.

*   **[Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/):**  For user-centric testing:
  *   **Vitest:**  Vitest is selected as the test runner due to its speed, modern features, and tight integration with Vite, ensuring fast and efficient testing.
  *   **React Testing Library (RTL):** RTL extends the testing environment with some of the API of `react-dom`. Tests are written to simulate user interactions (e.g., clicking, typing, looking for content by context), making them more reflective of real-world usage and less likely to break due to internal implementation changes.
  * See [TESTING.md](../../../guides/TESTING.md) for more information on testing practices and guidelines.

### 1.3 Component-Based Structure

This package is organized around a component-based architecture. The core components reside within the `src/ui/` directory. 
This offers several advantages:

*   **Modularity and Reusability:** Components are self-contained and designed for reuse across different parts of an application or across multiple projects. This modularity reduces code duplication and promotes consistency.
*   **Encapsulation and Maintainability:** Each component encapsulates its logic, styling, and tests, making it easier to maintain and update individual components without causing ripple effects across the entire library.
*   **Composition and Flexibility:** Complex user interfaces can be constructed by composing simpler components. This compositional approach provides flexibility and allows developers to build a wide range of UIs using the provided building blocks.

## 2. Reference: Project Structure and Configuration

### 2.1 Directory Structure Breakdown

The project directory structure is organized as follows:

```
react-ds-core/
├── .storybook/             # Storybook configuration directory
├── tsconfig.build.json  # Build-specific TypeScript configuration
├── tsconfig.json        # Base TypeScript configuration for type-checking
├── vite.config.ts       
├── vitest.config.ts     
├── vitest.setup.ts      
├── src/                   
│   ├── ui/                 # Root directory of all React components.
│   │   ├── GenericComponent/ # Example component. This structure can be generated with `@canonical/generator-ds`. 
│   │   │   ├── GenericComponent.stories.tsx # Storybook stories
│   │   │   ├── GenericComponent.tests.tsx   # Unit tests
│   │   │   ├── GenericComponent.tsx         # Component implementation
│   │   │   ├── index.ts           # Exports public API of the component
│   │   │   ├── styles.css         # Component-specific CSS styles
│   │   │   └── types.ts         # TypeScript types for the component
│   │   ├── AnotherComponent/  # Another Component directory (similar structure)
│   │   │   └── ...
│   │   └── index.ts        # Exports public API of components
│   ├── assets/             # Static assets
│   ├── index.css           # Global CSS styles import (from @canonical/styles)
│   └── index.ts            # Main entry point for the library, exporting components
├── index.html             # HTML template for Vite development server
```

### 2.2 Key Configuration Files

*   **`vite.config.ts`**:  Configuration for Vite, the build tool. Key settings include:
  *   **Plugins:**  Use of `@vitejs/plugin-react` to enable React support within Vite and `vite-tsconfig-paths` to resolve TypeScript paths correctly.
  *   **Build Options:**  Enables `sourcemap: true` to generate source maps, which helps with debugging production builds.

*   **`tsconfig.json` and `tsconfig.build.json`**: TypeScript compiler configurations:
  *   **Base Configuration (`tsconfig.json`):**  Extends `@canonical/typescript-config-react`, inheriting common React TypeScript settings. Skips type-checking external library dependencies, as Storybook dependencies do not always pass type checks.
  *   **Build Configuration (`tsconfig.build.json`):**  Specifically for creating production builds. It excludes non-component runtime files (such as tests & stories) from the build artifact. External dependencies are included in type-checking for increased strictness, as Storybook is excluded from this build. 

*   **`.storybook/main.ts` and `.storybook/preview.ts`**: Storybook setup files:
  *   **`main.ts`**: Configures Storybook itself, including registering addons and specifying where Storybook should look for story files (`src/**/*.stories.tsx`). It leverages `@canonical/storybook-config` to reuse and standardize Storybook configuration across Canonical projects.
  *   **`preview.ts`**:  Customizes the Storybook preview environment. This includes using decorators to apply global styles or themes to all stories.

*   **`vitest.config.ts` and `vitest.setup.ts`**: [Vitest](https://vitest.dev/) configuration for testing:
  *   **`vitest.config.ts`**:  Merges the base Vite configuration with Vitest-specific settings.  It configures the test environment to `jsdom` (a JavaScript implementation of DOM for running tests in Node.js), defines global test variables (`globals: true`), specifies the setup file (`vitest.setup.ts`), and includes the test file patterns (`src/**/*.tests.ts`, `src/**/*.tests.tsx`).
  *   **`vitest.setup.ts`**:  Sets up the testing environment before tests are run. It imports and applies `@testing-library/jest-dom/vitest`, extending Vitest's expect matchers with those from Jest DOM, which are useful for DOM element assertions. It also includes `afterEach(cleanup)` to clean up the DOM after each test, preventing side effects between tests.
