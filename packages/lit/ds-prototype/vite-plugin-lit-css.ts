import type { Plugin as VitePlugin } from "vite";
import { createFilter } from "vite";

/**
 * Options for the litCss plugin
 */
export interface LitCssOptions {
  /**
   * File pattern(s) to include for transformation.
   * Defaults to all CSS files if not specified.
   *
   * @example
   * ```ts
   * include: /\/src\// // Only transform CSS files inside src/
   * ```
   */
  include?: string | RegExp | (string | RegExp)[];

  /**
   * File pattern(s) to exclude from transformation.
   * Useful for excluding global styles, themes, or index.css.
   *
   * @example
   * ```ts
   * exclude: './src/index.css'  // Exclude specific file
   * exclude: [/global\.css$/, './src/theme.css']  // Multiple exclusions
   * ```
   */
  exclude?: string | RegExp | (string | RegExp)[];

  /**
   * Enable verbose logging for debugging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Vite plugin to transform CSS imports into Lit CSSResult objects.
 *
 * @param options - Plugin configuration options
 *
 * @example
 * ```ts
 * // Basic usage
 * litCss()
 *
 * // Exclude global styles
 * litCss({
 *   exclude: ['./src/index.css', './src/global.css']
 * })
 * ```
 */
export function litCss(options: LitCssOptions = {}): VitePlugin {
  const { include, exclude, verbose = false } = options;

  // Create a filter function for .css files only, respecting include/exclude patterns
  const cssFileRE = /\.css$/;
  const filter = createFilter(include ?? cssFileRE, exclude);

  const log = (...args: unknown[]) => {
    if (verbose) {
      console.log("[vite-plugin-lit-css]", ...args);
    }
  };

  return {
    name: "vite-plugin-lit-css",
    enforce: "post",

    configResolved(config) {
      // Find Vite's built-in CSS post-processor plugin
      const cssPostPlugin = config.plugins.find(
        (plugin) => plugin.name === "vite:css-post",
      );

      if (!cssPostPlugin?.transform) {
        console.warn(
          "[vite-plugin-lit-css] Could not find vite:css-post plugin",
        );
        return;
      }

      // Get the original transform function
      const originalTransform =
        typeof cssPostPlugin.transform === "function"
          ? cssPostPlugin.transform
          : cssPostPlugin.transform.handler;

      // Create our wrapper transform function
      const wrappedTransform = async function (
        // biome-ignore lint/suspicious/noExplicitAny: Plugin context type is not exported by Vite
        this: any,
        code: string,
        id: string,
        options?: { moduleType: string; ssr?: boolean },
      ) {
        // Check if this is a CSS file we should transform
        const cleanId = id.split("?")[0];

        // Skip if not a CSS file or filtered out
        if (!cssFileRE.test(cleanId) || !filter(cleanId)) {
          return originalTransform.call(this, code, id, options);
        }

        // Skip special Vite CSS queries (direct, inline, url)
        if (
          id.includes("?direct") ||
          id.includes("?inline") ||
          id.includes("?url") ||
          id.includes("&inline")
        ) {
          return originalTransform.call(this, code, id, options);
        }

        log("Transforming CSS to Lit:", cleanId);

        // Add ?inline to get the CSS as a string export
        const inlineId = id.includes("?") ? `${id}&inline` : `${id}?inline`;

        // Call the original CSS transformer with inline query
        const result = await originalTransform.call(
          this,
          code,
          inlineId,
          options,
        );

        if (!result) return result;

        // Extract code from result, coercing to string for Vite 8 compat
        // (result.code may be a RolldownMagicString in Vite 8+)
        const cssCode = String(
          typeof result === "string" ? result : result.code,
        );

        if (!cssCode) {
          return;
        }

        log("Raw CSS result:", cssCode.substring(0, 200));

        // Vite's CSS plugin returns: export default "..."
        // Extract the string literal and parse it to unescape properly
        const match = cssCode.match(/^export default "(.*)"$/s);
        if (!match) {
          console.error(
            "[vite-plugin-lit-css] Unexpected CSS format:",
            cssCode.substring(0, 100),
          );
          return;
        }

        // Use JSON.parse to properly unescape the JavaScript string
        const unescapedCss = JSON.parse(`"${match[1]}"`);

        log("Unescaped CSS:", unescapedCss.substring(0, 200));

        // Now escape only backticks and ${} for the template literal
        const escapedCss = unescapedCss
          .replace(/`/g, "\\`")
          .replace(/\$/g, "\\$");

        log("Escaped for template literal:", escapedCss.substring(0, 200));

        // Generate the final code
        const transformedCode = [
          `import { css } from 'lit';`,
          `export default css\`${escapedCss}\`;`,
        ].join("\n");

        log("Transformed successfully");

        return {
          code: transformedCode,
          map: null,
          moduleSideEffects: false,
        };
      };

      // Replace the original transform with wrapped version
      if (typeof cssPostPlugin.transform === "function") {
        cssPostPlugin.transform = wrappedTransform;
      } else {
        cssPostPlugin.transform.handler = wrappedTransform;
      }
    },
  };
}
