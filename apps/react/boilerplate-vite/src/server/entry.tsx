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
import { RelayEnvironmentProvider } from "react-relay";
import { catalogs, i18nConfig } from "#i18n/index.js";
import { createEnvironment } from "#relay/environment.js";
import {
  appRoutes,
  getAuthRedirectHref,
  middleware,
  notFoundRoute,
} from "../routes.js";
import "#styles/app.css";

interface InitialData extends Record<string, unknown> {
  readonly url?: string;
  /** Colour-scheme preference resolved from the request cookie, if any. */
  readonly theme?: "light" | "dark";
  /** Locale negotiated from the request cookie / Accept-Language, if any. */
  readonly locale?: string;
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
  const authRedirect = getAuthRedirectHref(url);

  if (authRedirect) {
    return { kind: "redirect", status: 302, location: authRedirect };
  }

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

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const initialData = props.initialData ?? {};
  const url = initialData.url ?? "/";
  const router = createRouter(appRoutes, {
    middleware: [...middleware],
    notFound: notFoundRoute,
    adapter: createServerAdapter(url),
  });
  const serverMatch = router.match(url);

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
  // between requests. Nothing fetches through it yet: components that issue
  // queries are wrapped in `ClientOnly` (see CatalogPage) until the follow-up
  // SSR PR adds data serialization/hydration; the provider is here so any
  // component touching Relay context renders without branching on runtime.
  const relayEnvironment = createEnvironment();

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
  return (
    <html lang={lang} dir={dir} className={initialData.theme}>
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
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
