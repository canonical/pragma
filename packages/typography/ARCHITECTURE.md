# Architectural Considerations and Design of `@canonical/typography`

This document outlines the architectural considerations and design decisions for the `@canonical/typography` package. This package aims to provide utilities and styles for achieving precise baseline grid alignment in web typography, specifically tailored for the Canonical design system.

## 1. Goals

*   **Precise Baseline Alignment:** Provide a mechanism to align text elements (headings, paragraphs, etc.) to a defined baseline grid. This enhances visual consistency and readability.
*   **Font Metric Extraction:** Offer a tool to extract relevant font metrics (ascender, descender, unitsPerEm) from font files (specifically, `.ttf` files are mentioned in error messages). This is crucial for calculating the necessary adjustments for baseline alignment.
*   **CSS-Based Alignment:** Achieve baseline alignment primarily through CSS, leveraging custom properties and calculations.  This avoids the need for JavaScript-based adjustments in most cases, improving performance.
*   **Configurability:** Allow developers to configure the baseline height and line height multipliers, making the system adaptable to different design requirements.
*   **Framework Agnostic:** The core logic and CSS should be usable in any web project, regardless of the JavaScript framework (or lack thereof).
* **Maintainability:** The codebase is small, well-defined and easy to maintain.

## 2. Core Components and Design

*   **`src/extractFontData.ts`:**  A Bun script (executable via `bun run extractFontData`) that uses the `opentype.js` library to parse a font file (provided as a command-line argument) and extract the following font metrics:
  *   `ascender`
  *   `descender`
  *   `unitsPerEm`

    The script outputs these metrics as CSS custom properties, which can then be copied into a project's CSS.  It also, optionally (with the `--all` flag), calculates and displays additional metrics, including:
  *   `naturalLineHeight`: The sum of the absolute values of the ascender and descender.
  *   `lineHeightScale`:  The `naturalLineHeight` divided by `unitsPerEm`.
  *   `ascenderScale`: The `ascender` divided by `unitsPerEm`.
  *   `baselinePos`: The calculated position of the baseline within a line box, given a `cssLineHeight`.
  *   `topNudge`: The amount of padding needed to align the text to the baseline grid.

    This script is *not* intended to be imported and used as a library; it's a command-line utility.

*   **`src/index.css`:** This is the main CSS file that implements the baseline alignment logic. It defines:
  *   **Agnostic CSS Variables:**  `--natural-line-height`, `--line-height-scale`, and `--ascender-scale`. These are calculated based on the font metrics extracted by `extractFontData.ts`.
  *   **Resets:** Sets `margin: 0` on headings and paragraphs to provide a clean starting point for baseline alignment.
  *   **Baseline Alignment Logic:**  Applies to `h1`-`h6` and `p` elements (configurable). It uses CSS custom properties and calculations to achieve baseline alignment:
    *   `--computed-line-height`:  Calculates the line height based on a configurable `--baseline-height` and a `--line-height-multiplier`.
    *   `--line-height-scale`: Calculates the font's natural line-height relative to the font size.
    *   `--ascender-scale`:  Calculates the font's ascender height relative to the font size.
    *   `--baseline-position`: Calculates where the baseline sits within the `computed-line-height`.
    *   `--top-nudge`: Calculates the `padding-top` needed to align the text to the baseline grid. This is the key to the alignment.  It uses the `mod()` function to find the remainder after dividing the baseline position by the baseline height, and then subtracts that from the baseline height.
    *   `--bottom-nudge`: Calculates the required bottom margin to ensure the next element is correctly positioned on the baseline.
    *   `padding-top`:  Set to `--top-nudge`.
    *   `margin-bottom`:  Set to `--bottom-nudge` plus any desired space after the element (`--space-after`).
    * `--space-after` is configurable per element type.

*  **`example/index.html`:** A simple HTML file demonstrating the baseline alignment in action. It includes:
  *   Inline CSS importing the font ("Lato" in this example) and defining `--baseline-height`.
  *   Inline CSS defining the font metrics (`--ascender`, `--descender`, `--units-per-em`) and setting custom properties for the `font-size` and `line-height-multiplier` of `p`, `h1`, `h2`, `h3` and `h4` elements.
  *   Inline CSS providing basic styling and a visual representation of the baseline grid (red lines).
  *   A `<control-slider>` custom element (defined in inline JavaScript) that allows users to interactively adjust the `font-size`, `line-height-multiplier`, and `baseline-height` and see the effects on the alignment.
  *   Sample text elements (`p`, `h1`, `h2`, `h3`, `h4`) to demonstrate the alignment.
  * The JavaScript implementation of `ControlSlider`.

*   **`package.json`:**
  * `dependencies`: lists `opentype.js` as dependency.
  *   `devDependencies`: Lists `@biomejs/biome`, `@canonical/biome-config`, and `@types/bun`.
  *   `scripts`:  Defines scripts for extracting font data (`extractFontData`), linting and formatting (`check`, `check:fix`), and type checking (`check:ts`).
  * `bin`: Defines the command to run the `extractFontData` script.

*   **`biome.json`**: Configures Biome to extend `@canonical/biome-config`.

* **`tsconfig.json`**: Configures the TypeScript compiler.

## 3. Workflow

1.  **Font Metric Extraction:**  The developer runs `bun run extractFontData <path-to-font.ttf>` (optionally with `--all` and a line height) to get the font metrics.  The script outputs the necessary CSS custom properties.

2.  **CSS Integration:** The developer copies the outputted CSS custom properties into their project's CSS (e.g., into a `:root` block).

3.  **Component Styling:** The developer imports `index.css` from `@canonical/typography` into their project to apply the baseline alignment styles. They set `--font-size` and `--line-height-multiplier` (and optionally `--space-after`) on the relevant text elements (headings, paragraphs) to control their appearance.

4.  **Baseline Configuration:** The developer sets `--baseline-height` to the desired baseline grid height (e.g., `0.5rem`).

## 4. Key Design Decisions

*   **CSS-Based Alignment:** The core alignment logic is implemented in CSS, using custom properties and calculations. This avoids the performance overhead of JavaScript-based solutions and leverages the browser's native rendering capabilities.

*   **`opentype.js`:** This library is used for reliable font metric extraction.

*   **Bun Script:**  The font metric extraction is implemented as a Bun script for speed and simplicity.

*   **Custom Element for Demo:** The `example/index.html` uses a `<control-slider>` custom element for interactive demonstration. This is a good choice for a self-contained demo, but it's not part of the core library.

* **Explicit metric use:** The CSS variables are explicit about units (`1rem`) and what they mean, promoting clarity and maintainability.

* **No Framework Dependency:** The core CSS and the `extractFontData.ts` script are framework-agnostic.

* **Clear Instructions:**  The `extractFontData.ts` script outputs clear instructions (including the CSS to copy) to the user.

## 5. Potential Improvements and Future Considerations

*   **Automated Integration:** Explore ways to automate the integration of the font metrics into the CSS.  Instead of requiring manual copying, the script could potentially:
  *   Write the metrics to a separate CSS file that can be imported.
  *   Modify an existing CSS file directly (more complex, but potentially more convenient).
  *   Provide a function that returns the metrics as a JavaScript object, allowing for programmatic integration with build tools or CSS-in-JS solutions.
*   **CSS-in-JS Integration:** Provide guidance or helper functions for integrating the baseline alignment logic with popular CSS-in-JS libraries (e.g., Styled Components, Emotion).
*   **More Robust Error Handling:** The `extractFontData.ts` script could be made more robust by handling potential errors (e.g., invalid font file, missing arguments) more gracefully.
*   **Expanded Font Support:**  Test and potentially refine the logic to ensure it works correctly with a wider range of fonts.
*   **Simplified Configuration:**  Explore ways to simplify the configuration process, potentially by providing sensible default values for some of the custom properties.
* **Typescript definitions:** Consider exporting typescript definitions from the `extractFontData` script so that other projects can import it.
* **Package exports**: Consider exposing `src/index.css` through the package exports to facilitate usage.

## 6. Conclusion

The `@canonical/typography` package provides a well-defined and efficient solution for achieving precise baseline grid alignment in web typography.  Its reliance on CSS custom properties and calculations, combined with a font metric extraction tool, makes it a flexible and performant approach.  The architecture is simple, maintainable, and framework-agnostic, making it suitable for a wide range of projects within the Canonical ecosystem.