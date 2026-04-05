import { Readable } from "node:stream";
import type {
  PipeableStreamResult,
  SitemapConfig,
  SitemapGetter,
  SitemapItem,
} from "./types.js";

/**
 * Renders an XML sitemap from a set of async data sources.
 *
 * Unlike `JSXRenderer`, this renderer produces XML (not HTML) and does not use
 * React. The render pipeline is functional: each stage returns data rather than
 * mutating instance state, so calling render methods multiple times produces
 * identical results for the same underlying data.
 *
 * Implements the same three render methods as `JSXRenderer` — `renderToReadableStream`,
 * `renderToPipeableStream`, and `renderToString` — with the same `statusCode` /
 * `statusReady` metadata contract. This allows consumers to use either renderer
 * interchangeably.
 *
 * @example
 * ```ts
 * const renderer = new SitemapRenderer(
 *   [() => fetchPages(), () => fetchPosts()],
 *   { baseUrl: "https://example.com", defaultChangefreq: "weekly" },
 * );
 *
 * const stream = await renderer.renderToReadableStream();
 * return new Response(stream, {
 *   status: renderer.statusCode,
 *   headers: { "Content-Type": "application/xml; charset=utf-8" },
 * });
 * ```
 */
export default class SitemapRenderer {
  /**
   * HTTP status code determined during rendering.
   *
   * Set to 200 on successful render. Errors from getters propagate as
   * thrown exceptions rather than setting this to 500 — the consumer's
   * error handler decides the status code for unexpected failures.
   */
  public statusCode = 200;

  /**
   * Resolves when `statusCode` is determined.
   *
   * For all three render methods on `SitemapRenderer`, this resolves by
   * the time the method's returned Promise settles (or synchronously for
   * the portions that are sync).
   */
  public statusReady: Promise<void> = Promise.resolve();

  /**
   * Create a sitemap renderer.
   *
   * @param getters - Async functions that each return a batch of sitemap items.
   *   Called concurrently via `Promise.all` during rendering.
   * @param config - Base URL and optional defaults for changefreq / priority.
   */
  constructor(
    protected readonly getters: readonly SitemapGetter[],
    protected readonly config: SitemapConfig,
  ) {}

  /**
   * Load sitemap items from all configured getters.
   *
   * Calls every getter concurrently and flattens the results into a single
   * array. This is the only async step in the pipeline.
   *
   * @note This method is impure — it calls external async data sources.
   * @returns A flat array of raw sitemap items from all getters.
   */
  protected async loadItems(): Promise<SitemapItem[]> {
    const results = await Promise.all(this.getters.map((getter) => getter()));
    return results.flat();
  }

  /**
   * Resolve URLs and apply defaults to raw sitemap items.
   *
   * For each item:
   * - Relative `loc` values are resolved against `config.baseUrl`. An empty
   *   `loc` resolves to the base URL itself.
   * - `lastmod` dates are formatted to `YYYY-MM-DD` (ISO 8601 date-only).
   * - Missing `changefreq` and `priority` are filled from `config` defaults.
   *
   * @param items - Raw items as returned by `loadItems`.
   * @returns A new array of items with resolved URLs and applied defaults.
   */
  protected formatItems(items: readonly SitemapItem[]): SitemapItem[] {
    return items.map((item) => ({
      loc: item.loc.length
        ? new URL(item.loc, this.config.baseUrl).href
        : this.config.baseUrl,
      lastmod:
        item.lastmod != null
          ? SitemapRenderer.formatDate(item.lastmod)
          : undefined,
      changefreq: item.changefreq ?? this.config.defaultChangefreq,
      priority: item.priority ?? this.config.defaultPriority,
    }));
  }

  /**
   * Format a `Date` object or ISO string to a `YYYY-MM-DD` date string.
   *
   * The Sitemaps protocol specifies W3C Datetime format; the date-only
   * variant (`YYYY-MM-DD`) is the most common form used in practice.
   *
   * @param date - A `Date` instance or an ISO 8601 date/datetime string.
   * @returns The date formatted as `YYYY-MM-DD`.
   */
  protected static formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().slice(0, 10);
  }

  /**
   * Escape the five XML special characters in a string.
   *
   * Prevents malformed XML when interpolating user-supplied URLs that may
   * contain `&` (common in query strings), `<`, `>`, `"`, or `'`.
   *
   * @param value - The raw string to escape.
   * @returns The string with `&`, `<`, `>`, `"`, and `'` replaced by their XML entities.
   */
  protected static escapeXml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Serialise a list of formatted sitemap items into an XML sitemap string.
   *
   * Produces a complete `<?xml>` document with a `<urlset>` root element
   * conforming to the Sitemaps 0.9 schema. Only non-null optional fields
   * (`lastmod`, `changefreq`, `priority`) are included in the output.
   *
   * @param items - Formatted items (URLs resolved, dates formatted).
   * @returns The complete XML sitemap as a string.
   */
  protected toXml(items: readonly SitemapItem[]): string {
    const urlEntries = items
      .map((item) => {
        const parts: string[] = [
          `    <loc>${SitemapRenderer.escapeXml(String(item.loc))}</loc>`,
        ];
        if (item.lastmod != null) {
          parts.push(
            `    <lastmod>${SitemapRenderer.escapeXml(String(item.lastmod))}</lastmod>`,
          );
        }
        if (item.changefreq != null) {
          parts.push(`    <changefreq>${item.changefreq}</changefreq>`);
        }
        if (item.priority != null) {
          parts.push(`    <priority>${item.priority}</priority>`);
        }
        return `  <url>\n${parts.join("\n")}\n  </url>`;
      })
      .join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urlEntries,
      "</urlset>",
    ].join("\n");
  }

  /**
   * Build the full XML string by loading items, applying formatting, and
   * serialising to XML.
   */
  protected async buildXml(): Promise<string> {
    const rawItems = await this.loadItems();
    const items = this.formatItems(rawItems);
    return this.toXml(items);
  }

  /**
   * Render the sitemap to a web `ReadableStream`.
   *
   * Loads items from all getters, formats them, serialises to XML, and
   * wraps the result in a `ReadableStream`. Sets `statusCode` to 200.
   *
   * @note This method is impure — it calls external data sources and mutates `statusCode`.
   *
   * @param _signal - Accepted for API compatibility with `JSXRenderer`. Not used.
   * @returns A `ReadableStream` of the XML sitemap.
   */
  renderToReadableStream = async (
    _signal?: AbortSignal,
  ): Promise<ReadableStream> => {
    const xml = await this.buildXml();
    this.statusCode = 200;
    this.statusReady = Promise.resolve();

    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(xml));
        controller.close();
      },
    });
  };

  /**
   * Render the sitemap to a Node.js pipeable stream.
   *
   * Returns `{ pipe, abort }` synchronously. The actual XML generation is
   * async (getters are called), so data is pushed to the stream when ready.
   * `statusReady` resolves when the XML is built and `statusCode` is set.
   *
   * @note This method is impure — it calls external data sources and mutates `statusCode`.
   *
   * @returns The pipe/abort handles for the XML stream.
   */
  renderToPipeableStream = (): PipeableStreamResult => {
    /* v8 ignore next -- read() is a required no-op for push-based Readable streams */
    const readable = new Readable({ read() {} });
    let aborted = false;

    this.statusReady = this.buildXml().then((xml) => {
      this.statusCode = 200;
      if (!aborted) {
        readable.push(xml);
        readable.push(null);
      }
    });

    return {
      pipe: <W extends NodeJS.WritableStream>(destination: W) =>
        readable.pipe(destination),
      abort: () => {
        aborted = true;
        readable.destroy();
      },
    };
  };

  /**
   * Render the sitemap to a complete XML string.
   *
   * Loads items from all getters, formats them, and returns the serialised
   * XML. Sets `statusCode` to 200.
   *
   * Async because the getters are async.
   *
   * @note This method is impure — it calls external data sources and mutates `statusCode`.
   *
   * @returns The complete XML sitemap string.
   */
  renderToString = async (): Promise<string> => {
    const xml = await this.buildXml();
    this.statusCode = 200;
    this.statusReady = Promise.resolve();
    return xml;
  };
}
