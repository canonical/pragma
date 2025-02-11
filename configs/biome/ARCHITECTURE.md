# Architectural Considerations and Design of `@canonical/biome-config`

This document outlines the architectural considerations and design of the `@canonical/biome-config` package, a shared configuration for [Biome](https://biomejs.dev/), a code formatter, linter, and more.

## 1. Goals

*   **Consistency:** Enforce consistent code style and formatting across Canonical projects using Biome.
*   **Simplicity:** Provide a single, reusable configuration that can be easily extended in individual projects.
*   **Maintainability:** Centralize Biome configuration to simplify updates and ensure consistency.
*   **Best Practices:** Enable Biome's recommended linting rules by default.
*   **Efficiency:** Optimize Biome's configuration for common workflows (e.g., ignoring `.gitignore`, no VCS integration needed).

## 2. Design and Structure

The package is intentionally very simple. It consists of:

*   **`biome.json`:** This is the core of the package. It contains the Biome configuration in JSON format.  This file is the `main` entry point of the package.

*   **`package.json`:**  Contains standard package metadata.  Importantly, it lists `@biomejs/biome` as both a `devDependency` and a `peerDependency`. This ensures that consuming projects also install Biome.  The `scripts` section defines convenient commands for checking and fixing code using Biome.

*   **`README.md`:** Provides instructions on how to install and use the configuration, as well as explanations of the configuration choices.

*   **`CHANGELOG.md`:**  Tracks changes to the configuration.

*   **`.gitignore`:** A standard `.gitignore` file, excluding common build artifacts, logs, and dependency directories.

## 3. Configuration Details (`biome.json`)

The `biome.json` file contains the following key configurations:

*   **`vcs.enabled: false`**: Disables Biome's integration with version control systems (VCS). This simplifies usage, as it doesn't require projects to be Git repositories or to have files staged.

*   **`vcs.useIgnoreFile: false`**:  Instructs Biome *not* to use `.gitignore` files. This ensures that Biome checks *all* files in the project, unless explicitly ignored in the Biome configuration itself. This is a deliberate choice to avoid accidentally skipping files due to overly broad `.gitignore` entries.

*   **`files.ignoreUnknown: false`**: Biome will report an error if it encounters a file type it doesn't recognize.  This helps catch misconfigurations or unexpected files.

*   **`files.ignore: []`**: An empty array, meaning no files are explicitly ignored *at the configuration level*.  Individual projects can add their own ignore patterns.

*   **`formatter.enabled: true`**: Enables Biome's code formatter.

*   **`formatter.indentStyle: "space"`**: Sets the indentation style to spaces.

*   **`formatter.indentWidth: 2`**: Sets the indentation width to 2 spaces.

*   **`organizeImports.enabled: true`**: Enables Biome's import organization feature, which sorts and groups imports.

*   **`linter.enabled: true`**: Enables Biome's linter.

*   **`linter.rules.recommended: true`**: Enables Biome's recommended set of linting rules. This provides a good baseline for code quality and consistency.

*   **`javascript.formatter.quoteStyle: "double"`**:  Sets the preferred quote style for JavaScript and TypeScript code to double quotes.

## 4. Usage and Workflow

1.  **Installation:**  The configuration is installed as a development dependency (`bun add -d @canonical/biome-config`).  Biome itself is also installed (`bun add -d @biomejs/biome`).

2.  **Extension:** Projects create a `biome.json` file in their root directory and extend the shared configuration:

    ```json
    {
      "$schema": "[https://biomejs.dev/schemas/1.9.4/schema.json](https://biomejs.dev/schemas/1.9.4/schema.json)",
      "extends": ["@canonical/biome-config"]
    }
    ```

3.  **Customization:** Projects can override or add to the base configuration in their own `biome.json` file. For example, they could add specific file ignore patterns, change the indentation width, or disable certain linting rules.

4.  **Execution:**  Developers run Biome commands (e.g., `biome check`, `biome format --write`) via `package.json` scripts or directly.

## 5. Key Design Decisions

*   **Shared Configuration:** Providing a shared configuration simplifies setup and ensures consistency across projects.

*   **No VCS Integration:** Disabling VCS integration simplifies the configuration and makes it more broadly applicable.

*   **Ignore `.gitignore`:** Ignoring `.gitignore` by default forces developers to be explicit about which files Biome should process. This prevents accidentally skipping important files.  This is often desirable in monorepos, where a top-level `.gitignore` might exclude files needed by a sub-package.

*   **Recommended Rules:** Enabling the recommended linting rules provides a good starting point for code quality.

*   **`peerDependency`:** Listing `@biomejs/biome` as a `peerDependency` ensures that consuming projects install the correct version of Biome, preventing compatibility issues.

*   **Schema:** Includes the `$schema` property for IDE auto-completion and validation.

## 6. Potential Improvements and Future Considerations

*   **More Granular Rules:** Explore adding more specific linting rules to the configuration, potentially categorizing them into groups (e.g., style, correctness, performance).
*   **Overrides for Specific File Types:**  Consider using Biome's `overrides` feature to apply different configurations to specific file types (e.g., different indentation for JSON files).
*   **Documentation of Rules:**  Provide more detailed documentation of the enabled linting rules and their rationale.
*   **Versioning:**  Use semantic versioning to clearly communicate changes to the configuration and their potential impact on consuming projects.

## 7. Conclusion

The `@canonical/biome-config` package provides a simple, reusable, and well-defined configuration for Biome. It promotes consistency, best practices, and efficient workflows across Canonical projects. The design prioritizes explicitness and maintainability, while allowing for customization at the project level.