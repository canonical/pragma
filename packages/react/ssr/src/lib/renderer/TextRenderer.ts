import { Readable } from "node:stream";
import type { PipeableStreamResult, TextGetter } from "./types.js";

/**
 * Renders a plain-text document from async data sources.
 *
 * Produces output suitable for `llms.txt`, `humans.txt`, `security.txt`, or
 * any text file that requires dynamic data (e.g. fetching page descriptions
 * from a CMS for an LLM context file).
 *
 * The renderer is intentionally minimal — it accepts an array of async getters,
 * each returning a string, and concatenates the results. No structure is imposed.
 * The consumer controls formatting entirely.
 *
 * Implements the same three render methods and `statusCode` / `statusReady`
 * contract as `JSXRenderer` and `SitemapRenderer`.
 *
 * @example
 * ```ts
 * const renderer = new TextRenderer([
 *   async () => "# My App\n\nContext for LLMs about this application.\n",
 *   async () => {
 *     const pages = await fetchPages();
 *     return pages.map(p => `- ${p.title}: ${p.url}`).join("\n");
 *   },
 * ]);
 *
 * const stream = await renderer.renderToReadableStream();
 * return new Response(stream, {
 *   status: renderer.statusCode,
 *   headers: { "Content-Type": "text/plain; charset=utf-8" },
 * });
 * ```
 */
export default class TextRenderer {
  /**
   * HTTP status code determined during rendering.
   *
   * Set to 200 on successful render. Errors from getters propagate as
   * thrown exceptions — the consumer's error handler decides the status code.
   */
  public statusCode = 200;

  /**
   * Resolves when `statusCode` is determined.
   */
  public statusReady: Promise<void> = Promise.resolve();

  /**
   * Create a text renderer.
   *
   * @param getters - Async functions that each return a string. Called
   *   sequentially (order matters) and concatenated into the final document.
   */
  constructor(protected readonly getters: readonly TextGetter[]) {}

  /**
   * Build the full text by calling all getters sequentially and concatenating.
   */
  protected async buildText(): Promise<string> {
    const parts: string[] = [];
    for (const getter of this.getters) {
      parts.push(await getter());
    }
    return parts.join("");
  }

  /**
   * Render to a web `ReadableStream`.
   *
   * @note This method is impure — it calls external data sources and mutates `statusCode`.
   *
   * @param _signal - Accepted for API compatibility. Not used.
   * @returns A `ReadableStream` of the plain-text document.
   */
  renderToReadableStream = async (
    _signal?: AbortSignal,
  ): Promise<ReadableStream> => {
    const text = await this.buildText();
    this.statusCode = 200;
    this.statusReady = Promise.resolve();

    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    });
  };

  /**
   * Render to a Node.js pipeable stream.
   *
   * Returns `{ pipe, abort }` synchronously. Data is pushed when ready.
   *
   * @note This method is impure — it calls external data sources and mutates `statusCode`.
   */
  renderToPipeableStream = (): PipeableStreamResult => {
    /* v8 ignore next -- read() is a required no-op for push-based Readable streams */
    const readable = new Readable({ read() {} });
    let aborted = false;

    this.statusReady = this.buildText().then((text) => {
      this.statusCode = 200;
      if (!aborted) {
        readable.push(text);
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
   * Render to a complete string.
   *
   * Async because the getters are async.
   *
   * @note This method is impure — it calls external data sources and mutates `statusCode`.
   */
  renderToString = async (): Promise<string> => {
    const text = await this.buildText();
    this.statusCode = 200;
    this.statusReady = Promise.resolve();
    return text;
  };
}
