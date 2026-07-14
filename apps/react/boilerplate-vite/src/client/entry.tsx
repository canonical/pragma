import { isSupportedLocale, negotiateLocale } from "@canonical/i18n-core";
import { I18nProvider } from "@canonical/i18n-react";
import { HeadProvider } from "@canonical/react-head";
import { createBrowserRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";
import { RelayEnvironmentProvider } from "react-relay";
import { catalogs, i18nConfig } from "#i18n/index.js";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/index.css";

const router = createBrowserRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

// One Relay environment (network + normalized store) for the whole browser
// session — module scope, so client-side navigations share the cache.
const relayEnvironment = createEnvironment();

/**
 * Resolve the locale for the first client render.
 *
 * When the page was server-rendered, `window.__INITIAL_DATA__.locale` carries
 * the server's negotiated value — reusing it guarantees the first client
 * render matches the server markup, so hydration stays mismatch-free. In the
 * SPA cells (`dev` / `preview`, no SSR) there is no embedded data, so the
 * same pure negotiation runs here: the cookie wins, then the browser's
 * language list (the client-side stand-in for the Accept-Language header).
 */
function resolveInitialLocale(): string {
  const embedded = (window as { __INITIAL_DATA__?: { locale?: string } })
    .__INITIAL_DATA__?.locale;
  if (isSupportedLocale(i18nConfig, embedded)) return embedded;

  return negotiateLocale(i18nConfig, {
    cookieHeader: document.cookie,
    acceptLanguage: navigator.languages?.join(",") ?? navigator.language,
  });
}

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element "#root" not found');
}

hydrateRoot(
  root,
  <I18nProvider
    config={i18nConfig}
    catalogs={catalogs}
    locale={resolveInitialLocale()}
  >
    <HeadProvider>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <RouterProvider router={router}>
          <Outlet fallback={<p>Loading…</p>} />
        </RouterProvider>
      </RelayEnvironmentProvider>
    </HeadProvider>
  </I18nProvider>,
);
