/**
 * Shared type contracts for the SSR renderer domain.
 *
 * These types define the interface between renderers (which produce HTML or XML
 * content and record metadata like status codes) and server adapters (which
 * deliver that content over HTTP). Renderers are transport-agnostic — they
 * never write to a response object.
 */

import type * as React from "react";
import type {
  RenderToPipeableStreamOptions,
  RenderToReadableStreamOptions,
} from "react-dom/server";

// ─── Renderer result types ───────────────────────────────────────────────────

/**
 * The pipe/abort handles returned by `renderToPipeableStream`.
 *
 * Mirrors the shape of React's `PipeableStream` but decoupled from the
 * `react-dom/server` import so consumers don't need to depend on it directly.
 */
export interface PipeableStreamResult {
  /** Pipe the rendered HTML to a Node.js writable stream (e.g. `ServerResponse`). */
  pipe: <W extends NodeJS.WritableStream>(destination: W) => W;
  /** Abort the in-progress render. */
  abort: (reason?: unknown) => void;
}

// ─── Renderer options ────────────────────────────────────────────────────────

/**
 * Configuration for a `JSXRenderer` instance.
 *
 * Controls locale, HTML shell extraction, and options forwarded to
 * React's streaming APIs.
 */
export interface RendererOptions {
  /**
   * Locale for the rendered page, passed as the `lang` prop to the server
   * entrypoint component. Defaults to `"en"` when omitted.
   */
  defaultLocale?: string;

  /**
   * A full HTML string (typically from a Vite build) whose `<head>` tags
   * are extracted and injected into the rendered output. When omitted,
   * the renderer produces output without extracted head elements.
   */
  htmlString?: string;

  /**
   * Options forwarded to `react-dom/server.renderToPipeableStream`.
   *
   * The renderer merges its own `bootstrapScriptContent`, `bootstrapScripts`,
   * and `bootstrapModules` into these options, but user-provided values take
   * priority and are never overwritten.
   */
  renderToPipeableStreamOptions?: RenderToPipeableStreamOptions;

  /**
   * Options forwarded to `react-dom/server.renderToReadableStream`.
   *
   * Same merge semantics as `renderToPipeableStreamOptions`. When omitted,
   * the shared bootstrap options from `renderToPipeableStreamOptions` are
   * used as a fallback (the bootstrap fields are structurally identical
   * between the two option types).
   */
  renderToReadableStreamOptions?: RenderToReadableStreamOptions;
}

// ─── Server entrypoint ───────────────────────────────────────────────────────

/**
 * Props received by the server entrypoint component during SSR.
 *
 * The renderer assembles these from the locale, the extracted HTML head elements
 * (when an HTML shell is provided), and the initial data for hydration.
 *
 * @typeParam InitialData - Shape of the hydration data embedded in the page.
 */
export interface ServerEntrypointProps<
  InitialData extends Record<string, unknown>,
> {
  /** BCP 47 language tag for the page (e.g. `"en"`, `"fr-CA"`). */
  lang?: string;

  /**
   * `<script>` elements extracted from the HTML shell, as React elements.
   * Undefined when no HTML shell was provided.
   */
  scriptElements?: React.ReactElement[];

  /**
   * `<link>` elements extracted from the HTML shell, as React elements.
   * Undefined when no HTML shell was provided.
   */
  linkElements?: React.ReactElement[];

  /**
   * `<title>`, `<meta>`, `<style>`, and `<base>` elements from the HTML shell,
   * as React elements. Undefined when no HTML shell was provided.
   */
  otherHeadElements?: React.ReactElement[];

  /**
   * Data to embed in `window.__INITIAL_DATA__` for client hydration.
   *
   * The renderer serialises this object as JSON in a `<script>` tag so that the
   * client can read it during hydration without a second network request. The
   * JSON is escaped to prevent `</script>` injection.
   */
  initialData?: InitialData;
}

/**
 * A React component used as the server-side rendering entry point.
 *
 * Receives `ServerEntrypointProps` and is expected to render the full `<html>`
 * document, including the extracted head elements and initial data.
 *
 * @typeParam InitialData - Shape of the hydration data embedded in the page.
 */
export type ServerEntrypoint<InitialData extends Record<string, unknown>> =
  React.ComponentType<ServerEntrypointProps<InitialData>>;

// ─── Sitemap types ───────────────────────────────────────────────────────────

/**
 * A single URL entry in an XML sitemap.
 *
 * Follows the Sitemaps XML protocol: https://www.sitemaps.org/protocol.html.
 * All fields except `loc` are optional — the renderer applies defaults from
 * `SitemapConfig` for `changefreq` and `priority`.
 */
export interface SitemapItem {
  /**
   * URL of the page. Can be absolute (`https://example.com/about`) or relative
   * (`/about`). Relative URLs are resolved against `SitemapConfig.baseUrl`.
   * An empty string resolves to the base URL itself.
   */
  loc: string;

  /**
   * Date of last modification. Accepts a `Date` object or an ISO 8601 string.
   * Formatted to `YYYY-MM-DD` in the output XML.
   */
  lastmod?: Date | string;

  /** How frequently the page is likely to change. */
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";

  /**
   * Priority of this URL relative to other URLs on the site.
   * Valid range is `0.0` to `1.0`. Default is `0.5` per the protocol.
   */
  priority?: number;
}

/**
 * An async function that produces a batch of sitemap items.
 *
 * The `SitemapRenderer` accepts an array of getters, calls them concurrently
 * via `Promise.all`, and flattens the results into a single item list.
 */
export type SitemapGetter = () => Promise<SitemapItem[]>;

/**
 * Configuration for the `SitemapRenderer`.
 *
 * Defines the canonical base URL used to resolve relative `loc` values,
 * and optional defaults applied to items that omit `changefreq` or `priority`.
 */
export interface SitemapConfig {
  /**
   * The canonical base URL for the site (e.g. `"https://example.com"`).
   * Used to resolve relative `loc` values in sitemap items.
   */
  baseUrl: string;

  /** Default `changefreq` applied to items that do not specify one. */
  defaultChangefreq?: SitemapItem["changefreq"];

  /** Default `priority` applied to items that do not specify one (0.0 to 1.0). */
  defaultPriority?: number;
}

// ─── Text types ──────────────────────────────────────────────────────────────

/**
 * An async function that produces a string of text content.
 *
 * The `TextRenderer` accepts an array of getters, calls them sequentially
 * (order matters for document structure), and concatenates the results.
 */
export type TextGetter = () => Promise<string>;
