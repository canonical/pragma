import type { IncomingMessage, ServerResponse } from "node:http";
import { createElement } from "react";
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream,
  renderToString,
} from "react-dom/server";
import { INITIAL_DATA_KEY } from "./constants.js";
import Extractor from "./Extractor.js";
import type {
  RendererOptions,
  RenderHandler,
  RenderResult,
  ServerEntrypoint,
  ServerEntrypointProps,
} from "./types.js";

/**
 * This class is responsible for rendering a React JSX component and sending it as response to a client.
 * It offers 2 ways of doing it:
 * - As string
 * - As stream
 * Each way has its advantages and inconveniences. You can read more about them in the package README.
 */
export default class JSXRenderer<
  TComponent extends ServerEntrypoint<InitialData>,
  InitialData extends Record<string, unknown>,
> {
  protected extractor: Extractor | undefined;

  /**
   * Creates a renderer instance which can be used to write Server Side Rendered HTML
   * into a {@link node:http#ServerResponse | ServerResponse}.
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
   * Gets the locale to be used for the rendered page.
   * Default if there was no locale passed as option is "en".
   */
  public getLocale(): string {
    return this.options.defaultLocale || "en";
  }

  /**
   * Gets the props needed to render the component.
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
   * Gets a list of all the "src" attributes of the given scripts that match the passed type.
   */
  protected getScriptSourcesByType(
    scripts: React.ReactElement[],
    type: "module" | "classic",
  ): string[] {
    return (
      scripts
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
          } else {
            return script.props.type !== "module";
          }
        })
        .map((script) => script.props.src)
        .filter((src) => typeof src === "string") || []
    );
  }

  /**
   * Adds some properties to the options that are passed to {@link react-dom#renderToPipeableStream | renderToPipeableStream}.
   *
   * @remark The options that are added are:
   * - bootstrapScriptContent: includes the initial data passed as prop to the component in a <script> so that it
   *  is available when rendering the page in the browser (to avoid hydration mismatches).
   * - bootstrapScripts: classic scripts which react strips out of the page. The only way to add them is to include them
   *  in this property.
   * - bootstrapModules: module scripts which react also strips out of the page and need to be added like this.
   */
  protected enrichRendererOptions(
    props: ServerEntrypointProps<InitialData>,
  ): RenderToPipeableStreamOptions {
    const enrichedOptions = { ...this.options.renderToPipeableStreamOptions };

    // options passed by the user always take priority
    if (!enrichedOptions.bootstrapScriptContent) {
      if (props.initialData) {
        enrichedOptions.bootstrapScriptContent = `window.${INITIAL_DATA_KEY} = ${JSON.stringify(props.initialData)}`;
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
   * This function is responsible for rendering a React component and sending it to the client through
   * a pipeable stream.
   *
   * @remark See the README to understand the difference between rendering options.
   *
   * The streaming might improve the time taken for the page to be rendered and interactive
   * (at least in part), using React's Suspense/lazy API and pipeable streams.
   *
   * CAUTION: The resulting HTML rendered this way is not cacheable.
   */
  renderToStream: RenderHandler = (
    _req: IncomingMessage,
    res: ServerResponse,
  ): void => {
    const errorRef: { current: Error | undefined } = { current: undefined };
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);
    const {
      onShellError: onShellErrorCallback,
      onShellReady: onShellReadyCallback,
      onAllReady: onAllReadyCallback,
      onError: onErrorCallback,
      ...options
    } = this.enrichRendererOptions(props);

    const jsxStream: RenderResult = renderToPipeableStream(jsx, {
      ...options,
      // Error occurred during rendering, after the shell & headers were sent - store the error for usage after stream is sent
      onError(error, errorInfo) {
        if (onErrorCallback) {
          onErrorCallback(error, errorInfo);
        }

        errorRef.current = error as Error;
        console.error(error);
      },
      // Early error, before the shell is prepared
      onShellError(error) {
        if (onShellErrorCallback) {
          onShellErrorCallback(error);
        }

        if (!res.headersSent) {
          res
            .writeHead(500, { "Content-Type": "text/html; charset=utf-8" })
            .end("<h1>Something went wrong</h1>");
        }
        console.error(error);
      },
      onShellReady() {
        if (onShellReadyCallback) {
          onShellReadyCallback();
        }

        if (!res.headersSent) {
          res.writeHead(errorRef.current ? 500 : 200, {
            "Content-Type": "text/html; charset=utf-8",
          });
        }

        jsxStream.pipe(res);
        res.on("finish", () => {
          res.end();
        });
      },
      onAllReady() {
        if (onAllReadyCallback) {
          onAllReadyCallback();
        }
      },
    });
  };

  /**
   * Renders this renderer's JSX component as a string and writes it to the given
   * {@link node:http#ServerResponse | ServerResponse}.
   *
   * @remark See the README to understand the difference between rendering options.
   *
   * Rendering to string means all <Suspense> components are loaded synchronously and the response
   * won't be sent to the client until all components have finished loading data and processing.
   *
   * renderToString is useful in Vite Dev mode, as the HMR doesn't work well with Suspense
   * and the Pipeable Stream rendering. Also if the resulting document needs to be cached.
   */
  renderToString: RenderHandler = (
    _req: IncomingMessage,
    res: ServerResponse,
  ): void => {
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);
    const html = renderToString(jsx);
    res
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .write(html);
    res.end();
  };
}
