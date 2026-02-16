import type { IncomingMessage, ServerResponse } from "node:http";
import type * as React from "react";
import type {
  PipeableStream,
  RenderToPipeableStreamOptions,
} from "react-dom/server";

export interface RendererOptions {
  defaultLocale?: string;
  /** An HTML string to extract the head tags from */
  htmlString?: string;
  /**
   * Options to pass to `react-dom/server.renderToPipeableStream`
   * We specifically exclude `onShellReady()`, `onError()`, `onShellError()` and `onAllReady()` as they are
   * implemented by `JSXRenderer.renderToString()` and `JSXRenderer.renderToStream()`.
   * See https://react.dev/reference/react-dom/server/renderToPipeableStream#parameters
   */
  renderToPipeableStreamOptions?: Omit<
    RenderToPipeableStreamOptions,
    "onShellReady" | "onError" | "onShellError" | "onAllReady"
  >;
}

/** The props that the server entrypoint component will receive */
export interface ServerEntrypointProps<InitialData> {
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

export type ServerEntrypoint<InitialData> = React.ComponentType<
  ServerEntrypointProps<InitialData>
>;

// Expose the types for the rendering function for better type-safety in server code and caller code

/** The result of rendering a React component */
export type RenderResult = PipeableStream;
/** A function that renders a React component */
export type RenderHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => RenderResult;
