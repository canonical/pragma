import type { IncomingMessage, ServerResponse } from "node:http";
import BaseRenderer from "./BaseRenderer.js";
import type { RenderHandler, RenderResult, ServerEntrypoint } from "./types.js";

/**
 * This class is responsible for rendering a React component to a string.
 * See the README to understand the difference between rendering options.
 *
 * The StringRenderer is useful in Vite Dev mode, as the HMR doesn't work well with Suspense
 * and the Pipeable Stream rendering.
 */
export default class StringRenderer<
  TComponent extends ServerEntrypoint<InitialData>,
  InitialData,
> extends BaseRenderer<TComponent, InitialData> {
  /**
   * Renders this renderer's JSX component as a transmittable stream and sends it to the client
   * once it has been fully rendered. This means once all <Suspense> components have finished loadinig.
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
      // this makes the pipeable stream work the same as the classic renderToString function
      onAllReady() {
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
