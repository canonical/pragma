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

// This class is responsible for rendering a React JSX component.
export default class JSXRenderer<
  TComponent extends ServerEntrypoint<InitialData>,
  InitialData extends Record<string, unknown>,
> {
  protected extractor: Extractor | undefined;

  constructor(
    protected readonly Component: TComponent,
    protected readonly initialData: InitialData = {} as InitialData,
    protected readonly options: RendererOptions = {},
  ) {
    this.extractor = this.options.htmlString
      ? new Extractor(this.options.htmlString)
      : undefined;
  }

  public getLocale(): string {
    return this.options.defaultLocale || "en";
  }

  /**
   * Gets the props needed to render the component
   * @return The props needed to render the component
   * @protected
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

  private getScriptsByType(
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
        enrichedOptions.bootstrapScripts = this.getScriptsByType(
          props.scriptElements,
          "classic",
        );
      }
    }
    if (!enrichedOptions.bootstrapModules) {
      if (props.scriptElements) {
        enrichedOptions.bootstrapModules = this.getScriptsByType(
          props.scriptElements,
          "module",
        );
      }
    }

    return enrichedOptions;
  }

  protected prepareRender(
    errorRef: { current: Error | undefined },
    renderOptions: RenderToPipeableStreamOptions,
  ): RenderResult {
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);

    const jsxStream = renderToPipeableStream(jsx, {
      ...this.enrichRendererOptions(props),
      ...renderOptions,
      // Error occurred during rendering, after the shell & headers were sent - store the error for usage after stream is sent
      onError(error) {
        errorRef.current = error as Error;
        console.error(error);
      },
    });
    return jsxStream;
  }

  /**
   * This function is responsible for rendering a React component to a pipeable stream.
   * See the README to understand the difference between rendering options.
   *
   * The streaming might improve the time taken for the page to be rendered and interactive
   * (at least in part), using React's Suspense/lazy API and pipeable streams.
   *
   * CAUTION: The resulting HTML rendered this way is not cacheable.
   *
   * @param _req Client's request
   * @param res Response object that will be sent to the client
   * @return {RenderResult} The stream that was sent to the client
   */
  renderToStream: RenderHandler = (
    _req: IncomingMessage,
    res: ServerResponse,
  ): void => {
    const errorRef: { current: Error | undefined } = { current: undefined };
    const props = this.getComponentProps();
    const jsx = createElement(this.Component, props);

    const jsxStream: RenderResult = renderToPipeableStream(jsx, {
      ...this.enrichRendererOptions(props),
      // Error occurred during rendering, after the shell & headers were sent - store the error for usage after stream is sent
      onError(error) {
        errorRef.current = error as Error;
        console.error(error);
      },
      // Early error, before the shell is prepared
      onShellError(error) {
        if (!res.headersSent) {
          res
            .writeHead(500, { "Content-Type": "text/html; charset=utf-8" })
            .end("<h1>Something went wrong</h1>");
        }
        console.error(error);
      },
      onShellReady() {
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
    });
  };

  /**
   * Renders this renderer's JSX component as a string.
   * This means all <Suspense> components are loaded synchronously.
   *
   * See the README to understand the difference between rendering options.
   *
   * renderToString is useful in Vite Dev mode, as the HMR doesn't work well with Suspense
   * and the Pipeable Stream rendering. Also if the resulting document needs to be cached.
   *
   * @param _req Client's request
   * @param res Response object that will be sent to the client
   * @return {string} The string to send to the client
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
