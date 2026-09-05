// Styles first, for the same reason as in the client entry: the order the
// bundler evaluates style imports in is the order the rules are emitted in.
// The server build only needs the application's own sheet — the design
// system's layers reach the browser through the client bundle's stylesheet,
// which the renderer links from the built HTML.
import "#styles/app.css";
import { documentAttrs, isSupportedLocale } from "@canonical/i18n-core";
import { I18nProvider } from "@canonical/i18n-react";
import { HeadProvider } from "@canonical/react-head";
import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import {
  createRouter,
  createServerAdapter,
  StatusResponse,
} from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { fetchQuery, RelayEnvironmentProvider } from "react-relay";
import { catalogs, i18nConfig } from "#i18n/index.js";
import { createEnvironment } from "#relay/environment.js";
import {
  appRoutes,
  getAuthRedirectForMatch,
  middleware,
  notFoundRoute,
  resolveRelayPayloads,
  type SerializedRelayPayload,
  serverQueries,
} from "../routes.js";

interface InitialData extends Record<string, unknown> {
  readonly url?: string;
  /** Colour-scheme preference resolved from the request cookie, if any. */
  readonly theme?: "light" | "dark";
  /**
   * Flat dehydrated router state (from resolveRouteDisposition), read back by
   * router-react's readDehydratedState() on the client. Absent in SPA cells.
   */
  readonly href?: string;
  readonly kind?: "route" | "not-found";
  readonly routeId?: string | null;
  readonly status?: number;
  /** Locale negotiated from the request cookie / Accept-Language, if any. */
  readonly locale?: string;
  /**
   * Server-captured GraphQL responses for the matched route (see
   * `prefetchRouteData`), replayed into the Relay store on both the server
   * render and the client. A dedicated nested key — the router state is
   * flat-spread into this same object, so nesting avoids any collision.
   */
  readonly relayPayloads?: readonly SerializedRelayPayload[];
}

/** How the server should answer a request for this URL. */
export type RouteDisposition =
  | {
      readonly kind: "render";
      readonly status: number;
      readonly dehydratedState: {
        readonly href: string;
        readonly kind: "route" | "not-found";
        readonly routeId: string | null;
        readonly status: number;
      } | null;
    }
  | {
      readonly kind: "redirect";
      readonly status: number;
      readonly location: string;
    };

// A module-scope adapterless router is a pure matcher: without an adapter,
// construction fires no load and no warm hooks, and match() runs no hooks at
// all. Never use a server-adapter router here — it warms at construction.
const dispositionMatcher = createRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

/**
 * Resolve a request URL to the HTTP answer the router implies: a redirect
 * (auth guard or a static redirect route) or a render with the matched
 * document's real status — a matched not-found page is a 404 response, not a
 * soft 200.
 */
export function resolveRouteDisposition(url: string): RouteDisposition {
  let matchResult: ReturnType<typeof dispositionMatcher.match>;

  try {
    matchResult = dispositionMatcher.match(url);
  } catch (error) {
    // A rejected search schema is a client error; render the shell with the
    // error status and let the client router re-derive the same state.
    return {
      kind: "render",
      status: error instanceof StatusResponse ? error.status : 500,
      dehydratedState: null,
    };
  }

  if (matchResult?.kind === "redirect") {
    return {
      kind: "redirect",
      status: matchResult.status,
      location: matchResult.redirectTo,
    };
  }

  // Auth is decided from the router's own match (pattern + validated search),
  // never from the raw URL — the two normalize differently.
  const authRedirect =
    matchResult?.kind === "route" ? getAuthRedirectForMatch(matchResult) : null;

  if (authRedirect) {
    return { kind: "redirect", status: 302, location: authRedirect };
  }

  const status = matchResult?.status ?? 404;

  return {
    kind: "render",
    status,
    dehydratedState: {
      href: url,
      kind: matchResult?.kind === "route" ? "route" : "not-found",
      routeId: matchResult?.kind === "route" ? String(matchResult.name) : null,
      status,
    },
  };
}

/**
 * Execute the matched route's declared server query (if any) and return the
 * captured responses in serializable form. Fetch-then-render: the payloads
 * exist before the renderer is constructed, so they ride the fixed
 * `__INITIAL_DATA__` bootstrap script. On any failure the request degrades to
 * today's behavior — render without payloads, the client fetches after
 * hydration — a data hiccup must never take the page down.
 */
const SSR_PREFETCH_TIMEOUT_MS = 5_000;

export async function prefetchRouteData(
  disposition: RouteDisposition,
): Promise<readonly SerializedRelayPayload[] | undefined> {
  if (disposition.kind !== "render") {
    return undefined;
  }

  const routeId = disposition.dehydratedState?.routeId;
  const serverQuery = routeId
    ? serverQueries[routeId as keyof typeof serverQueries]
    : undefined;

  if (!serverQuery) {
    return undefined;
  }

  const captured: SerializedRelayPayload[] = [];

  try {
    // A fresh, request-scoped environment: nothing leaks across requests,
    // and the capture tee records exactly the responses this route needs.
    const environment = createEnvironment({
      captureResponse: (entry) => {
        captured.push(entry);
      },
    });

    // Bound the prefetch: an endpoint that never settles must not hold the
    // whole SSR response hostage. On timeout the subscription is cancelled
    // and rendering proceeds without payloads.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        subscription.unsubscribe();
        reject(
          new Error(`SSR data prefetch exceeded ${SSR_PREFETCH_TIMEOUT_MS}ms`),
        );
      }, SSR_PREFETCH_TIMEOUT_MS);
      const subscription = fetchQuery(
        environment,
        serverQuery.query,
        serverQuery.variables,
        { fetchPolicy: "network-only" },
      ).subscribe({
        complete: () => {
          clearTimeout(timer);
          resolve();
        },
        error: (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.warn(
      "SSR data prefetch failed; rendering without payloads (the client will fetch).",
      error,
    );

    return undefined;
  }

  return captured.length > 0 ? captured : undefined;
}

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const initialData = props.initialData ?? {};
  const url = initialData.url ?? "/";
  const router = createRouter(appRoutes, {
    middleware: [...middleware],
    notFound: notFoundRoute,
    adapter: createServerAdapter(url),
  });
  // A rejected search schema throws from match(); resolveRouteDisposition
  // already turned that into the response status (400-class), so render the
  // shell unhydrated instead of letting the throw reach React — a shell
  // error would override the supplied status with 500. The client router
  // re-derives the same error state on load.
  let serverMatch: ReturnType<typeof router.match>;

  try {
    serverMatch = router.match(url);
  } catch {
    serverMatch = null;
  }

  // Hydrate the store synchronously so render() works without awaiting
  // load(). Redirects and unmatched URLs are the server's concern before
  // rendering, so only real matches hydrate.
  if (serverMatch?.kind === "route" || serverMatch?.kind === "not-found") {
    router.hydrate({
      href: url,
      kind: serverMatch.kind,
      routeId: serverMatch.kind === "route" ? serverMatch.name : null,
      status: serverMatch.status,
    });
  }

  // A fresh Relay environment per server render, so no store state leaks
  // between requests — seeded with the same serialized payloads the client
  // will replay, so server markup and first client render read identical
  // data. Without payloads (no server query, or the prefetch failed) a
  // querying component suspends and fetches through this request's own
  // environment instead.
  const relayEnvironment = createEnvironment({
    payloads: resolveRelayPayloads(initialData.relayPayloads),
  });

  // The servers negotiate the locale (cookie > Accept-Language > default,
  // via i18n-core's negotiateLocale) and pass it through initialData; the
  // same value reaches the client via `window.__INITIAL_DATA__`, so the
  // server markup and the first client render agree on the language.
  const locale = isSupportedLocale(i18nConfig, initialData.locale)
    ? initialData.locale
    : i18nConfig.defaultLocale;
  // `<html lang dir>` must be right on first paint for assistive technology
  // and RTL locales; after hydration the client's locale source keeps both
  // attributes in sync with every switch.
  const { lang, dir } = documentAttrs(i18nConfig, locale);

  // Paint the cookie-resolved theme on <html> for a flash-free first render —
  // the same element `usePreferredTheme` toggles on the client, and one React
  // does not hydrate (only `#root` is), so there is no mismatch to reconcile.
  // `ds` beside it marks the whole document as the design system's territory,
  // which its scoped element-level layers apply inside; index.html carries the
  // same class for the client-only build.
  return (
    <html
      lang={lang}
      dir={dir}
      className={["ds", initialData.theme].filter(Boolean).join(" ")}
    >
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      {/* Surface declaration: context (app) + density (comfortable) — roots the design system's --density-* channel */}
      <body className="app comfortable">
        <div id="root">
          <I18nProvider config={i18nConfig} catalogs={catalogs} locale={locale}>
            <HeadProvider>
              <RelayEnvironmentProvider environment={relayEnvironment}>
                <RouterProvider router={router}>
                  <Outlet fallback={<p>Loading…</p>} />
                </RouterProvider>
              </RelayEnvironmentProvider>
            </HeadProvider>
          </I18nProvider>
        </div>
      </body>
    </html>
  );
}

export type { InitialData };
