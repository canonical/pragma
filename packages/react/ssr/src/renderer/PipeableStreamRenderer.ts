import type { IncomingMessage, ServerResponse } from "node:http";
import BaseRenderer from "./BaseRenderer.js";
import type { RenderHandler, RenderResult, ServerEntrypoint } from "./types.js";

/**
 * This class is responsible for rendering a React component to a pipeable stream.
 * See the README to understand the difference between rendering options.
 *
 * The PipeableStreamRenderer might improve the time taken for the page to be rendered and interactive
 * (at least in part), using React's Suspense/lazy API and pipeable streams.
 *
 * CAUTION: The resulting HTML rendered this way is not cacheable.
 */
export default class PipeableStreamRenderer<
  TComponent extends ServerEntrypoint<InitialData>,
  InitialData,
> extends BaseRenderer<TComponent, InitialData> {
  /**
   * Renders this renderer's JSX component as a transmittable stream and sends it to the client
   * @param _req Client's request
   * @param res Response object that will be sent to the client
   * @return {RenderResult} The stream that was sent to the client
   */
  render: RenderHandler = (
    _req: IncomingMessage,
    res: ServerResponse,
  ): RenderResult => {
    const errorRef: { current: Error | undefined } = { current: undefined };
    let jsxStream: RenderResult;

    jsxStream = this.prepareRender(errorRef, {
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

    return jsxStream;
  };
}
