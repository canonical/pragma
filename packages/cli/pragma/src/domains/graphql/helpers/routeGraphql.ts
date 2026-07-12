/**
 * Route an incoming request for the graphql dev server: `/graphql` to the
 * GraphQL + GraphiQL handler, `/` to a redirect there, and everything else
 * to 404. Mounting is intentionally the host's job, which keeps the handler
 * itself path-agnostic.
 *
 * @param request - The incoming fetch Request.
 * @param handler - The GraphQL fetch handler for `/graphql`.
 * @param port - The listen port, used to build the root redirect target.
 * @returns The response (or a promise of one) for the route.
 */

type GraphQLHandler = (request: Request) => Response | Promise<Response>;

export default function routeGraphql(
  request: Request,
  handler: GraphQLHandler,
  port: number,
): Response | Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/graphql") {
    return handler(request);
  }
  if (pathname === "/") {
    return Response.redirect(`http://localhost:${port}/graphql`, 302);
  }
  return new Response(null, { status: 404 });
}
