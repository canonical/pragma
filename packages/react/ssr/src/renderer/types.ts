import type { IncomingMessage, ServerResponse } from "node:http";
import type * as React from "react";
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from "react-dom/server";

export interface RenderToStreamCallbacks {
  onShellReady?: (req: IncomingMessage, res: ServerResponse) => void;
  onShellError?: (
    error: unknown,
    req: IncomingMessage,
    res: ServerResponse,
  ) => void;
  onAllReady?: (req: IncomingMessage, res: ServerResponse) => void;
  onError?: (error: unknown, req: IncomingMessage, res: ServerResponse) => void;
}

export type RenderToStreamOptions = Omit<
  RenderToPipeableStreamOptions,
  keyof RenderToStreamCallbacks
> &
  RenderToStreamCallbacks;
export interface RendererOptions {
  defaultLocale?: string;
  /** An HTML string to extract the head tags from */
  htmlString?: string;
  /**
   * Options to pass to `react-dom/server.renderToPipeableStream`.
   * See https://react.dev/reference/react-dom/server/renderToPipeableStream#parameters.
   * We substitute the default optional callback types for our own to allow passing the request
   * and response objects as a parameters.
   */
  renderToPipeableStreamOptions?: RenderToStreamOptions;
  /**
   * There are the following default callbacks used at JSXRenderer.renderToStream method:
   * - onError
   * - onShellError
   * - onShellReady
   * If this option is falsy (default) then the pre-defined callbacks will call first any user provided
   * callback and then execute their default behavior.
   * If the option is instead set to `true`, then the default callbacks will call the user
   * provided callback and return immediately after, avoiding execution of the default behavior.
   */
  overwriteDefaultStreamCallbacks?: boolean;
}

/** The props that the server entrypoint component will receive */
export interface ServerEntrypointProps<
  InitialData extends Record<string, unknown>,
> {
  /** The language of the page. This is typically read from the request headers. */
  lang?: string;
  /** The script tags to include in the page */
  scriptElements?: React.ReactElement[];
  /** The link tags to include in the page */
  linkElements?: React.ReactElement[];
  /** Other head elements: title, base, style & meta */
  otherHeadElements?: React.ReactElement[];
  /**
   * Initial data used in the server to render the React application, which needs to be
   * embedded in the resulting HTML so that the hydration in the client matches that of the server.
   */
  initialData?: InitialData;
}

export type ServerEntrypoint<InitialData extends Record<string, unknown>> =
  React.ComponentType<ServerEntrypointProps<InitialData>>;

// Expose the types for the rendering function for better type-safety in server code and caller code

/** The result of rendering a React component */
export type RenderResult = PipeableStream;
/** A function that renders a React component */
export type RenderHandler = (req: IncomingMessage, res: ServerResponse) => void;
