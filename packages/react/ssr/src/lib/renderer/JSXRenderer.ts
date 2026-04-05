import { createElement } from "react";
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream as reactRenderToPipeableStream,
  renderToReadableStream as reactRenderToReadableStream,
  renderToString as reactRenderToString,
} from "react-dom/server";
import { INITIAL_DATA_KEY } from "./constants.js";
import Extractor from "./Extractor.js";
import type {
  PipeableStreamResult,
  RendererOptions,
  ServerEntrypoint,
  ServerEntrypointProps,
} from "./types.js";

/**
 * Server-side renderer for a React component.
 *
 * Accepts a React `ServerEntrypoint` component, optional initial data for
 * hydration, and an optional HTML shell string (from a Vite build) whose
 * `<head>` tags are extracted and injected into the rendered output.
 *
 * Three rendering strategies are available:
 *
 * - **ReadableStream** (`renderToReadableStream`) — returns a web `ReadableStream`.
 *   Works natively with Bun, Deno, Cloudflare Workers, and any runtime that
 *   supports the Web Streams API. Supports Suspense and progressive rendering.
 *
 * - **PipeableStream** (`renderToPipeableStream`) — returns a Node.js pipeable stream.
 *   Works with Express, Fastify, and Node's built-in `http` module. Supports Suspense
 *   and progressive rendering.
 *
 * - **String** (`renderToString`) — returns the full HTML as a string. All Suspense
 *   boundaries resolve synchronously. The output is cacheable and works with Vite
 *   HMR in dev mode.
 *
 * All strategies inject `<script>` and `<link>` tags from the HTML shell via
 * React's `bootstrapScripts` / `bootstrapModules` mechanism, and embed
 * `initialData` as a global `window.__INITIAL_DATA__` variable for client
 * hydration.
 *
 * The renderer is transport-agnostic — it never writes to a response object.
 * HTTP status codes and metadata are exposed via `statusCode` and `statusReady`
 * for the consumer to use when constructing the response.
 *
 * @typeParam TComponent - The server entrypoint component type.
 * @typeParam InitialData - Shape of the data embedded for client hydration.
 */
export default class JSXRenderer<
  TComponent extends ServerEntrypoint<InitialData>,
  InitialData extends Record<string, unknown>,
> {
  protected extractor: Extractor | undefined;

  /**
   * HTTP status code determined during rendering.
   *
   * Starts at 200 and is set to 500 if a shell error occurs during streaming.
   * For `renderToString`, it is always 200 (errors throw instead).
   *
   * Read this after the render method returns (for `renderToReadableStream` and
   * `renderToString`) or after awaiting `statusReady` (for `renderToPipeableStream`).
   */
  public statusCode = 200;

  /**
   * Resolves when `statusCode` is determined.
   *
   * For `renderToReadableStream` and `renderToString`, this is already resolved
   * by the time the method returns. For `renderToPipeableStream`, it resolves
   * asynchronously when the shell is ready or errors.
   */
  public statusReady: Promise<void> = Promise.resolve();

  /**
   * Create a renderer bound to a specific component and initial data.
   *
   * If `options.htmlString` is provided, the HTML is parsed once to extract
   * `<head>` elements. These elements are then available as React elements
   * via `getComponentProps()` for injection during rendering.
   *
   * @param Component - The React server entrypoint component.
   * @param initialData - Data to embed in `window.__INITIAL_DATA__` for client hydration.
   * @param options - Renderer configuration: locale, HTML shell, and stream options.
   */
  constructor(
    protected readonly Component: TComponent,
    protected readonly initialData: InitialData = {} as InitialData,
    protected readonly options: RendererOptions = {},
  ) {
    this.extractor = this.options.htmlString
      ? new Extractor(this.options.htmlString)
      : undefined;
  }

  /**
   * Return the locale for the rendered page.
   *
   * Defaults to `"en"` when no `defaultLocale` was provided in options.
   * The locale is passed as the `lang` prop to the server entrypoint component,
   * which typically sets it as the `<html lang>` attribute.
   */
  public getLocale(): string {
    return this.options.defaultLocale || "en";
  }

  /**
   * Assemble the props passed to the server entrypoint component.
   *
   * Combines the locale, initial data, and (when an HTML shell was provided)
   * the extracted script, link, and other head elements into a single props
   * object conforming to `ServerEntrypointProps`.
   */
  protected getComponentProps(): ServerEntrypointProps<InitialData> {
    return {
      lang: this.getLocale(),
      scriptElements: this.extractor?.getScriptElements(),
      linkElements: this.extractor?.getLinkElements(),
      otherHeadElements: this.extractor?.getOtherHeadElements(),
      initialData: this.initialData,
    } as ServerEntrypointProps<InitialData>;
  }

  /**
   * Extract `src` URLs from script elements that match a given loading strategy.
   *
   * Filters the provided React `<script>` elements by their `type` attribute:
   * `"module"` selects ES module scripts, `"classic"` selects everything else.
   * Returns only the `src` values, discarding inline scripts that have no `src`.
   *
   * @param scripts - React elements representing `<script>` tags.
   * @param type - `"module"` for ES modules, `"classic"` for traditional scripts.
   * @returns An array of script source URLs.
   */
  protected getScriptSourcesByType(
    scripts: React.ReactElement[],
    type: "module" | "classic",
  ): string[] {
    return scripts
      .map(
        (script) =>
          script as React.ReactElement<
            React.ComponentProps<"script">,
            "script"
          >,
      )
      .filter((script) => {
        if (type === "module") {
          return script.props.type === "module";
        }
        return script.props.type !== "module";
      })
      .map((script) => script.props.src)
      .filter((src) => typeof src === "string");
  }

  /**
   * Merge renderer-managed options into the user-provided stream options.
   *
   * Populates three React streaming options unless the caller already supplied them:
   *
   * - `bootstrapScriptContent` — a `<script>` body that assigns `initialData` to
   *   `window.__INITIAL_DATA__`. The JSON is escaped to prevent `</script>` injection.
   * - `bootstrapScripts` — `src` URLs for classic (non-module) scripts extracted from
   *   the HTML shell. React strips `<script>` tags during streaming, so these must
   *   be re-injected through this mechanism.
   * - `bootstrapModules` — same as above, for ES module scripts.
   *
   * @param props - The assembled component props (used to read `initialData` and `scriptElements`).
   * @returns A merged options object safe to pass to either streaming API.
   */
  protected enrichRendererOptions(
    props: ServerEntrypointProps<InitialData>,
  ): RenderToPipeableStreamOptions {
    const enrichedOptions = {
      ...this.options.renderToPipeableStreamOptions,
    };

    if (!enrichedOptions.bootstrapScriptContent) {
      if (props.initialData) {
        enrichedOptions.bootstrapScriptContent = `window.${INITIAL_DATA_KEY} = ${JSON.stringify(props.initialData).replace(/</g, "\\u003c")}`;
      }
    }
    if (!enrichedOptions.bootstrapScripts) {
      if (props.scriptElements) {
        enrichedOptions.bootstrapScripts = this.getScriptSourcesByType(
          props.scriptElements,
          "classic",
        );
      }
    }
    if (!enrichedOptions.bootstrapModules) {
      if (props.scriptElements) {
        enrichedOptions.bootstrapModules = this.getScriptSourcesByType(
          props.scriptElements,
          "module",
        );
      }
    }

    return enrichedOptions;
  }

  /**
   * Render the component to a web `ReadableStream`.
   *
   * Uses `react-dom/server.renderToReadableStream` for environments that support
   * the Web Streams API (Bun, Deno, Cloudflare Workers, browsers). Supports
   * Suspense and progressive rendering.
   *
   * On shell error, `statusCode` is set to 500 and a fallback HTML stream is
   * returned. On success, `statusCode` is 200.
   *
   * @note This method is impure — it mutates `statusCode` and `statusReady`.
   *
   * @param signal - Optional `AbortSignal` for request cancellation.
   * @returns A `ReadableStream` of the rendered HTML.
   */
  renderToReadableStream = async (
    signal?: AbortSignal,
  ): Promise<ReadableStream> => {
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);
    const {
      onError: onErrorCallback,
      // Strip pipeable-only callbacks — they don't exist on RenderToReadableStreamOptions
      onShellReady: _onShellReady,
      onShellError: _onShellError,
      onAllReady: _onAllReady,
      ...options
    } = this.enrichRendererOptions(props);

    try {
      const stream = await reactRenderToReadableStream(jsx, {
        ...options,
        ...(this.options.renderToReadableStreamOptions ?? {}),
        signal,
        onError: (error, errorInfo) => {
          onErrorCallback?.(error, errorInfo);
          console.error(error);
        },
      });

      this.statusCode = 200;
      this.statusReady = Promise.resolve();
      return stream;
    } catch (error) {
      console.error(error);
      this.statusCode = 500;
      this.statusReady = Promise.resolve();
      return new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode("<h1>Something went wrong</h1>"),
          );
          controller.close();
        },
      });
    }
  };

  /**
   * Render the component to a Node.js pipeable stream.
   *
   * Uses `react-dom/server.renderToPipeableStream` for Node.js environments
   * (Express, Fastify, plain `http.createServer`). Supports Suspense and
   * progressive rendering.
   *
   * Returns `{ pipe, abort }` synchronously. The `statusCode` is set
   * asynchronously when the shell is ready or errors — await `statusReady`
   * before reading it.
   *
   * @note This method is impure — it mutates `statusCode` and `statusReady`.
   *
   * @returns The pipe/abort handles for the rendered stream.
   */
  renderToPipeableStream = (): PipeableStreamResult => {
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);
    const {
      onShellError: onShellErrorCallback,
      onShellReady: onShellReadyCallback,
      onAllReady: onAllReadyCallback,
      onError: onErrorCallback,
      ...options
    } = this.enrichRendererOptions(props);

    const errorRef: { current: Error | undefined } = { current: undefined };
    let resolveStatus: () => void;
    this.statusReady = new Promise<void>((resolve) => {
      resolveStatus = resolve;
    });

    const jsxStream = reactRenderToPipeableStream(jsx, {
      ...options,
      onError(error, errorInfo) {
        onErrorCallback?.(error, errorInfo);
        errorRef.current = error as Error;
        console.error(error);
      },
      onShellError: (error) => {
        onShellErrorCallback?.(error);
        this.statusCode = 500;
        resolveStatus();
        console.error(error);
      },
      onShellReady: () => {
        onShellReadyCallback?.();
        /* v8 ignore next -- errorRef.current is set by onError which fires before onShellReady in edge cases */
        this.statusCode = errorRef.current ? 500 : 200;
        resolveStatus();
      },
      onAllReady() {
        onAllReadyCallback?.();
      },
    });

    return { pipe: jsxStream.pipe, abort: jsxStream.abort };
  };

  /**
   * Render the component to a complete HTML string.
   *
   * Uses `react-dom/server.renderToString` to produce the full HTML
   * synchronously. All Suspense boundaries resolve before the method returns.
   * The output is cacheable and compatible with Vite's HMR in dev mode.
   *
   * Sets `statusCode` to 200 on success. On error, throws (consumer catches).
   *
   * @note This method is impure — it mutates `statusCode`.
   *
   * @returns The complete HTML string.
   */
  renderToString = (): string => {
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);
    const html = reactRenderToString(jsx);
    this.statusCode = 200;
    this.statusReady = Promise.resolve();
    return html;
  };
}
