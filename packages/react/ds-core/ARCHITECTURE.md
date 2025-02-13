## Canonical Design System - React Core - Architecture

A guide to understand the design principles, key components, and technologies used in the core React component library.

This document is primarily focused on providing a clear explanation of the architecture for users who
want to understand the 'why' and 'how' behind its structure and design.

## 1. Explanation: Architecture Overview

### 1.1 Core Goals and Design Principles

Our architecture is driven by several core goals and design principles:

* **Reusable Components:** The primary goal is to create a library of reusable React components. These components are
  designed to be building blocks for various applications, promoting consistency and efficiency in development.
* **Design System Consistency:**  All components are built to adhere to Canonical's visual identity by default. This
  ensures a unified and recognizable user interface across all applications that utilize this library.
* **Accessibility First:** Accessibility is not an afterthought but a fundamental principle. Components are designed and
  developed with accessibility best practices in mind, ensuring usability for everyone.
* **Modern Development Practices:**  The library embraces modern development tools and practices to enhance developer
  experience, maintainability, and performance.
* **Maintainability and Extensibility:** The architecture is structured to be easily maintainable and extensible. The
  styling layer can be customized or extended to accommodate different design requirements and visual variations beyond
  the Canonical design system.
* **Testability and Reliability:**  Robust testing is integral to the architecture, ensuring the reliability and
  stability of the components.

### 1.2 Tooling Choices

This package leverages a modern JavaScript toolchain to achieve its goals:

* **[React 19](https://react.dev):**: This library is built on React 19. This version of React provides the latest
  features, performance improvements, and compatibility with the broader React ecosystem.
* **[Vite](https://vite.dev):** Vite is used as the development server and build tool specifically for Storybook.
  * **Fast Storybook Development Server with HMR:** Vite provides a fast development server for Storybook, enabling
  features like Hot Module Replacement (HMR) for a smooth and efficient component development and preview experience
  within Storybook.
  * **Optimized Storybook Builds:** Vite is also used to build the Storybook documentation site itself, optimizing assets
  for deployment.

* **[Storybook](https://storybook.js.org/):** Storybook is employed as a development and documentation environment for
  components:
  * **Isolated Component Development:** Storybook allows developers to focus on individual components in isolation, making
  development and testing more focused and efficient.
  * **Living Style Guide and Documentation:** Storybook serves as an interactive style guide, showcasing components and
  their variations, and automatically generating documentation.
  * **Visual Regression Testing:** Storybook integrates well with visual regression testing tools, such
  as [Chromatic](https://www.chromatic.com/), enabling automated visual QA of components across different states and themes.
* **[Vitest](https://vitest.dev/)** & **[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)**
  for user-centric unit & integration testing
  * **Vitest:**  Vitest is selected as the test runner due to its speed, modern features, and tight integration with Vite,
  ensuring fast and efficient testing.
  * **React Testing Library (RTL):** RTL extends the testing environment with some of the API of `react-dom`.
  Tests are written to simulate user interactions (e.g., clicking, typing, looking for content by context), 
  making them more reflective of real-world usage and less likely to break due to internal implementation changes.
* See [TESTING.md](../../../guides/TESTING.md) for more information on testing practices and guidelines.

### 1.3 Component-Based Structure

This package is organized around a component-based architecture. The core components reside within the `src/ui/`
directory.
This offers several advantages:

* **Modularity and Reusability:** Components are self-contained and designed for reuse across different parts of an
  application or across multiple projects. This modularity reduces code duplication and promotes consistency.
* **Encapsulation and Maintainability:** Each component encapsulates its logic, styling, and tests, making it easier to
  maintain and update individual components without causing ripple effects across the entire library.
* **Composition and Flexibility:** Complex user interfaces can be constructed by composing simpler components. This
  compositional approach provides flexibility and allows developers to build a wide range of UIs using the provided
  building blocks.

### 1.4 Bun Build vs. Typescript Compiler

[Bun](https://bun.sh/) is being experimentally used as a package manager for this project.
Bun includes a [native JS bundler](https://bun.sh/docs/bundler) that can transpile Typescript.

We are not currently considering using `bun build` for production builds for
the following reasons:

* **Globstar inconsistencies**: Bun's [implementation of globstar](https://bun.sh/docs/api/glob) is non-standard. It is
  difficult to build arbitrarily deep filepaths, as Bun expects a globstar for each level of supported nesting. Most
  glob implementations treat a globstar as representing an arbitrary number of non-hidden directories. However, Bun
  currently treats ** as a single level of nesting.
* **Dist depth**: Generating `dist/` output that has the correct folder structure (i.e.,`dist/ui/Button/`) is
  non-trivial. `bun build` generates output with folder structure starting from matching the shallowest source file.
  This is not always desired. For example, if `ui/` is inside `src/`, one must `cd` into `src/` to build `ui/` into
  `dist/`. This adds unneeded complexity to the build process.
* **Type emitting**: `bun build` does not generate types, so it must be accompanied by the usage of some other tool that
  generates type declarations.

Ideally, we could use `bun build` for production builds, as it offers some advantages over the Typescript compiler.

* **Non-TS bundling**: `bun build` copies non-TS assets (such as images, stylesheets, etc) into `dist`. `tsc` must be
  followed up with a manual step that copies non-TS files (such as icons & css) into `dist/`. Currently, we are
  using [copyfiles](https://npmjs.org/package/copyfiles) for this purpose.
* **Speed**: Bun builds slightly faster than the Typescript compiler:

| Tool       | Command                                                      | Real Time | User Time | Sys Time |
|------------|--------------------------------------------------------------|-----------|-----------|----------|
| Bun        | `bun run build:package:bun && bun run build:package:types`   | 0m0.648s  | 0m1.498s  | 0m0.117s |
| Typescript | `bun run build:package:tsc && bun run build:package:copycss` | 0m0.707s  | 0m1.615s  | 0m0.094s |

Note that the bun build must also call `tsc` to generate type declarations, and
the tsc build must call the external `copyfiles` dependency to copy assets into
`dist/`.

For these reasons, we have chosen to use the Typescript compiler for builds, but we are open to revisiting this decision
in the future should Bun improve on the above points.

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

* **`vite.config.ts`**:  Configuration for Vite, the storybook build tool.
* **`tsconfig.json` and `tsconfig.build.json`**: TypeScript compiler configurations:
  * **Base Configuration (`tsconfig.json`):**  Extends `@canonical/typescript-config-react`, inheriting common React
    TypeScript settings.<br>Skips type-checking external library dependencies, as Storybook dependencies do not always
    pass type checks.
  * **Build Configuration (`tsconfig.build.json`):**  Specifically for creating production builds. It excludes
    non-component runtime files (such as tests & stories) from the build artifact. External dependencies are included in
    type-checking for increased strictness, as Storybook is excluded from this build.

* **`.storybook/main.ts` and `.storybook/preview.ts`**: Storybook setup files:
  * **`main.ts`**: Configures Storybook itself, including registering addons and specifying where Storybook should look
    for story files (`src/**/*.stories.tsx`).<br>Leverages [
    `@canonical/storybook-config`](../../../configs/storybook/README.md)
    to reuse and standardize Storybook configuration across Canonical projects.
  * **`preview.ts`**:  Customizes the Storybook preview environment. This includes using decorators to apply global
    styles or themes to all stories.

* **`vitest.config.ts` and `vitest.setup.ts`**: [Vitest](https://vitest.dev/) configuration for testing:
  * **`vitest.config.ts`**:  Merges the base Vite configuration with Vitest-specific settings.
  * **`vitest.setup.ts`**:  Sets up the testing environment before tests are run. 
