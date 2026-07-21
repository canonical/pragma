import {
  createMemoryRouter,
  type RouteMap,
  route,
} from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LensBreadcrumbs from "./LensBreadcrumbs.js";

const bareRoutes: RouteMap = {
  home: route({ url: "/", component: () => null }),
  components: route({ url: "/components", component: () => null }),
  definitions: route({ url: "/definitions", component: () => null }),
  standards: route({ url: "/standards", component: () => null }),
  journeys: route({ url: "/journeys", component: () => null }),
} as const;

const renderAt = (url: string, node: ReactElement): string =>
  renderToString(
    <RouterProvider router={createMemoryRouter(bareRoutes, url)}>
      {node}
    </RouterProvider>,
  );

describe("LensBreadcrumbs SSR", () => {
  it("server-renders the index trail as a single current crumb", () => {
    // The trail is URL-derived, so it renders on the server identically to
    // the client — no empty-then-populated hydration mismatch in the frame.
    const html = renderAt(
      "/components",
      <LensBreadcrumbs lensLabel="Components" lensRouteName="components" />,
    );
    expect(html).toContain("ds breadcrumbs");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("Components");
    expect(html).toContain('aria-current="page"');
    // No back-link on the index: the lens crumb IS the current page.
    expect(html).not.toContain("<a");
  });

  it("server-renders the entity trail with a router back-link", () => {
    const html = renderAt(
      "/components/ds%3Aglobal.component.button",
      <LensBreadcrumbs
        current="ds:global.component.button"
        lensLabel="Components"
        lensRouteName="components"
      />,
    );
    // The lens crumb is a real anchor to the index (SPA-routed on click).
    expect(html).toContain('href="/components"');
    // The entity crumb is the current page.
    expect(html).toContain("ds:global.component.button");
    expect(html).toContain('aria-current="page"');
  });
});
