import type { IncomingMessage, ServerResponse } from "node:http";
import { createElement } from "react";
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream,
} from "react-dom/server";
import Extractor from "./Extractor.js";
import type {
  RendererOptions,
  RenderResult,
  ServerEntrypoint,
  ServerEntrypointProps,
} from "./types.js";

export const INITIAL_DATA_KEY = "__INITIAL_DATA__";

// This class is responsible for rendering a React component to a readable stream.
export default abstract class BaseRenderer<
  TComponent extends ServerEntrypoint<InitialData>,
  InitialData,
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
   * Renders this renderer's JSX component and sends it to the client.
   * @param _req Client's request
   * @param res Response object that will be sent to the client
   * @return {RenderResult} The stream that was sent to the client
   */
  abstract render(_req: IncomingMessage, res: ServerResponse): RenderResult;
}
