# Architectural Considerations and Design of `@canonical/styles`

This document describes the architecture and design of the `@canonical/styles` package. This package provides foundational CSS styles, including a reset (normalize.css), font-face declarations, CSS custom properties (variables) for colors, spacing, and typography, and basic typography styles, all adhering to Canonical's design system.  It is *not* a full component library, but rather a base layer of styling.

## 1. Goals

*   **Consistency:** Enforce a consistent visual style across Canonical web properties.
*   **Maintainability:** Centralize core styles and design tokens to simplify updates and ensure consistency.
*   **Themability (Partial):** Provide a foundation for theming through CSS custom properties, although true theming would require a more sophisticated approach.
*   **Accessibility:** Incorporate accessibility considerations into the base styles (e.g., font smoothing).
*   **Performance:** Use modern CSS features (e.g., variable fonts, `text-wrap: pretty`) for optimal performance and rendering.
*   **Framework Agnostic**: Do not depend on a specific framework.
*   **Minimal Dependency**: Keep dependencies to an absolute minimum.

## 2. Core Components and Design

The package consists of several CSS files:

*   **`src/index.css`:** The main entry point.  It imports all other CSS files in the correct order:
  1.  `font-faces.css`: Defines `@font-face` rules for the Ubuntu font family (variable fonts).
  2.  `normalize.css`: Includes the `normalize.css` library to reset browser inconsistencies.
  3.  `tokens.css`: Defines CSS custom properties (variables) for colors, spacing, and fonts.  These are the core design tokens.
  4. `typography.css`: Defines base typography styles for headings and paragraphs, utilizing the tokens defined in `tokens.css`.
  5. `intents.css`: Defines styles for different "intents" (positive, negative, information, caution, neutral), using CSS custom properties to allow for easy modification of colors and other properties.

*   **`src/font-faces.css`:**  Declares the Ubuntu and Ubuntu Mono variable fonts using `@font-face`. It uses `woff2-variations` for optimal performance.  The font URLs point to Canonical's asset server.

*   **`src/tokens.css`:**  Defines CSS custom properties for:
  *   **Color Palette:** Base colors (white, black, blue, yellow).
  *   **Background and Text Colors:** Default background and text colors, including hover and active states.
  *   **Neutral Colors:**  Neutral background colors with hover and active states.
  *   **Border Colors:** High-contrast border color.
  *   **Intent Colors:** Colors for positive, negative, information, and caution states, including default, tinted, hover, active, and text color variations.
  *   **Spacing:**  Spacing units (xsmall, small, medium, large) for horizontal and vertical spacing, input margins, and border widths.
  *   **Font Tokens:** Font sizes, font weights, and line heights.
  *   **Component-Specific Tokens:** Semantic tokens for `button` and `chip` components, referencing the base tokens. This provides a layer of abstraction and allows for easier component-level customization.

*   **`src/typography.css`:** Defines base styles for `html`, `p`, `h1`-`h6`. It sets:
  *   Font family (Ubuntu variable and Ubuntu Mono variable).
  *   Font smoothing.
  *   Font weight and size.
  *   Line height.
  *   `text-wrap: pretty` for improved text wrapping.
  *   `max-width` for text elements to improve readability.
  *   Custom properties for font-size, line-height, space-after, and font-weight for headings and paragraphs to facilitate baseline grid alignment.

* **`src/intents.css`:**  Provides classes (`.positive`, `.negative`, `.information`, `.caution`, `.neutral`) that define a set of CSS custom properties related to visual intent.  These properties (e.g., `--intent-color`, `--intent-color-text`, `--intent-color-border`) can be used by components to easily apply consistent styling for different states or meanings. This approach allows for semantic styling without tightly coupling components to specific color values.

*   **`package.json`:**  Defines package metadata, dependencies (only `normalize.css`), and scripts for linting/formatting with Biome. It relies on `@canonical/biome-config`

* **`biome.json`:** Configures Biome to extend `@canonical/biome-config`.

## 3. Workflow

1.  **Inclusion:**  Consumers include the styles by importing `@canonical/styles` into their project's CSS or JavaScript/TypeScript.  The exact method will depend on the project's build setup (e.g., using a CSS preprocessor, CSS Modules, or a CSS-in-JS solution).

2.  **Token Usage:** Components use the CSS custom properties defined in `tokens.css` to access design tokens.  For example, a button component might use `--button-color-background` and `--button-color-text`.

3.  **Intent Usage:** Components use the intent classes (e.g., `.positive`, `.negative`) to apply a set of pre-defined styles related to that intent.

4.  **Customization (Limited):**  Consumers can override the CSS custom properties at a higher level (e.g., in their application's root CSS) to customize the styles. However, this is a limited form of theming, and large-scale theming would require a more sophisticated approach.

## 4. Key Design Decisions

*   **CSS Custom Properties:**  Extensive use of CSS custom properties for design tokens and intent-based styling provides flexibility and maintainability.

*   **Variable Fonts:** Using variable fonts allows for a wide range of font weights and styles with a single font file, improving performance.

*   **`normalize.css`:**  Includes `normalize.css` for cross-browser consistency.

*   **Intent-Based Styling:** The `.positive`, `.negative`, etc., classes provide a semantic way to style components based on their meaning, rather than directly applying colors.

*   **Baseline Grid Alignment:** Using custom properties for heading and paragraph styles allows for consistent and easier maintenance and baseline grid alignment.

* **External Typography:**  Imports `@canonical/typography`, indicating a reliance on a separate package for some typography styles.  This suggests a potential for more granular control over typography in a separate package.

* **Biome:** Uses Biome for code formatting and linting, ensuring code style consistency.

## 5. Potential Improvements and Future Considerations

*   **Full Theming Support:** Implement a more robust theming solution, possibly using a CSS-in-JS library or a preprocessor like Sass. This would allow for easier creation and management of multiple themes.
*   **More Granular Tokens:**  Consider adding more granular design tokens (e.g., for different border radii, box shadows, etc.).
*   **Component-Specific Styles:** This package currently focuses on foundational styles.  Consider how component-specific styles (beyond basic tokens) will be handled.  Options include:
  *   Including component CSS in this package (less desirable, as it tightly couples styles to components).
  *   Providing separate packages for component styles.
  *   Recommending a CSS-in-JS approach for component styling within consuming projects.
*   **Documentation:**  Provide more comprehensive documentation, including examples of how to use the styles and tokens.
* **RTL Support:** Consider adding support for right-to-left languages.
* **Accessibility Considerations:** Perform a thorough accessibility audit and address any identified issues.
* **`@canonical/typography`:** Provide details about what is in `@canonical/typography` and why it is used, and ideally make it's source code/package available for review. Without knowing what it contains, it is difficult to review.

## 6. Conclusion

The `@canonical/styles` package provides a solid foundation for building web applications that adhere to Canonical's design system.  Its use of CSS custom properties, variable fonts, and intent-based styling promotes consistency, maintainability, and a degree of flexibility.  The package is framework-agnostic and can be used in any web project.  The design leaves room for future expansion and more sophisticated theming capabilities.