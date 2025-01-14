import type { IncomingMessage, ServerResponse } from "node:http";
import type * as React from "react";
import { type ReactElement, createElement } from "react";
import { type PipeableStream, renderToPipeableStream } from "react-dom/server";
import Extractor from "./Extractor.js";

export interface RendererOptions {
  defaultLocale?: string;
  loadMessages?: (locale: string) => string;
  /** The HTML string to extract the script and link tags from */
  htmlString?: string;
  /** The modules to bootstrap the app with */
  bootstrapModules?: string[];
  /** The content of the bootstrap script */
  bootstrapScriptContent?: string;
  /** The scripts to bootstrap the app with */
  bootstrapScripts?: string[];
  /** A callback to run when the stream is fully processed */
  onAllReady?: () => void;
  /** The size of the progressive chunks */
  progressiveChunkSize?: number;
  /** The nonce to use for the script tags */
  nonce?: string;
  /** The prefix for the identifiers */
  identifierPrefix?: string;
}

/** The props that the server entrypoint component will receive */
export interface RendererServerEntrypointProps {
  /** The language of the page */
  lang?: string;
  /** The script tags to include in the page */
  scriptTags?: string;
  /** The link tags to include in the page */
  linkTags?: string;
}

// Expose the types for the rendering function for better type-safety in server code and caller code
/** The result of rendering a React component */
export type RenderResult = PipeableStream;
/** A function that renders a React component */
export type RenderHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => RenderResult;

export type ReactServerEntrypointComponent<
  TComponentProps extends RendererServerEntrypointProps,
> = React.ComponentType<TComponentProps>;

// This class is responsible for rendering a React component to a readable stream.
export default class Renderer<
  TComponent extends ReactServerEntrypointComponent<TComponentProps>,
  TComponentProps extends
    RendererServerEntrypointProps = RendererServerEntrypointProps,
> {
  private locale: string | undefined;
  // private messages: any;
  private extractor: Extractor | undefined;

  constructor(
    private readonly Component: TComponent,
    private readonly options: RendererOptions = {},
  ) {
    // this.prepareLocale = this.prepareLocale.bind(this);
    this.render = this.render.bind(this);
    this.extractor = this.options.htmlString
      ? new Extractor(this.options.htmlString)
      : undefined;
  }

  //async prepareLocale(header: string | undefined) {
  //  if (this.options.loadMessages) {
  //    this.locale = header
  //      ? header.slice(0, 2)
  //      : this.options.defaultLocale || "en";
  //    //this.messages = await this.options.loadMessages(this.locale);
  //  }
  //}

  /**
   * Gets the props needed to render the component
   * @return The props needed to render the component
   * @private
   */
  private getComponentProps(): TComponentProps {
    return {
      lang: this.locale,
      scriptTags: this.extractor?.getScriptTags(),
      linkTags: this.extractor?.getLinkTags(),
      // todo implement message passing
      // messages: this.messages,
    } as TComponentProps;
  }

  /**
   * Renders this renderer's JSX component as a transmittable stream and sends it to the client
   * TODO add a render function for ReadableStream, and rename this to be focused on PipeableStream
   * @param req Client's request
   * @param res Response object that will be sent to the client
   * @return {RenderResult} The stream that was sent to the client
   */
  render: RenderHandler = (
    req: IncomingMessage,
    res: ServerResponse,
  ): RenderResult => {
    // await this.prepareLocale(req.headers.get("accept-language") || undefined);
    const jsx = createElement(this.Component, this.getComponentProps());

    let renderingError: Error;

    const jsxStream = renderToPipeableStream(jsx, {
      // Early error, before the shell is prepared
      onShellError() {
        res
          .writeHead(500, { "Content-Type": "text/html; charset=utf-8" })
          .end("<h1>Something went wrong</h1>");

        throw new Error("An error occurred while constructing the SSR shell");
      },
      onShellReady() {
        res.writeHead(renderingError ? 500 : 200, {
          "Content-Type": "text/html; charset=utf-8",
        });

        jsxStream.pipe(res);

        res.on("finish", () => {
          res.end();
        });
      },
      // Error occurred during rendering, after the shell & headers were sent - store the error for usage after stream is sent
      onError(error) {
        renderingError = error as Error;
      },
      bootstrapModules: this.options.bootstrapModules,
      bootstrapScripts: this.options.bootstrapScripts,
      bootstrapScriptContent: this.options.bootstrapScriptContent,
      onAllReady: this.options.onAllReady,
      progressiveChunkSize: this.options.progressiveChunkSize,
      nonce: this.options.nonce,
      identifierPrefix: this.options.identifierPrefix,
    });
    return jsxStream;
  };
}
