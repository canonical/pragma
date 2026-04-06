import type { ReadableStream } from "node:stream/web";
import { INITIAL_DATA_KEY } from "@canonical/react-ssr/renderer/constants";
import type { AnyRoute, RouteMap, Router } from "@canonical/router-core";
import { renderToReadableStream } from "react-dom/server";
import ServerRouter from "./ServerRouter/ServerRouter.js";
import type { RenderToStreamOptions, RenderToStreamResult } from "./types.js";

/**
 * Load a URL into a router and stream the matched React output.
 *
 * The router is loaded before rendering so the returned stream contains the
 * resolved route tree. The result also includes dehydrated router state and a
 * bootstrap script payload that clients can inject to hydrate without rerunning
 * the initial load.
 *
 * @param router - The router instance to load and render.
 * @param url - The absolute or relative request URL to resolve.
 * @param options - Optional outlet fallback content for suspended route output.
 */
export default async function renderToStream<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
>(
  router: Router<TRoutes, TNotFound>,
  url: string | URL,
  options: RenderToStreamOptions = {},
): Promise<RenderToStreamResult<TRoutes, TNotFound>> {
  const loadResult = await router.load(url);
  const initialData = router.dehydrate();
  const stream = (await renderToReadableStream(
    <ServerRouter fallback={options.fallback} router={router} />,
  )) as unknown as ReadableStream;

  return {
    bootstrapScriptContent: initialData
      ? `window.${INITIAL_DATA_KEY} = ${JSON.stringify(initialData)}`
      : null,
    initialData,
    loadResult,
    stream,
  };
}
