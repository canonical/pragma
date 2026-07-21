import {
  createMemoryRouter,
  type RouteMap,
  route,
} from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import LensBreadcrumbs from "./LensBreadcrumbs.js";

/** A name-complete bare route map so every `to={lensRouteName}` resolves
 * and the router can build the crumb's href. */
const bareRoutes: RouteMap = {
  home: route({ url: "/", component: () => null }),
  components: route({ url: "/components", component: () => null }),
  definitions: route({ url: "/definitions", component: () => null }),
  standards: route({ url: "/standards", component: () => null }),
  journeys: route({ url: "/journeys", component: () => null }),
} as const;

const at = (url: string, node: ReactElement): ReactElement => (
  <RouterProvider router={createMemoryRouter(bareRoutes, url)}>
    {node}
  </RouterProvider>
);

describe("LensBreadcrumbs", () => {
  it("renders a single current crumb on a lens index (no back-link)", () => {
    render(
      at(
        "/definitions",
        <LensBreadcrumbs lensLabel="Definitions" lensRouteName="definitions" />,
      ),
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    // The lone crumb is the current page — text, not a link.
    expect(within(nav).queryByRole("link")).toBeNull();
    const current = within(nav).getByText("Definitions");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders a linked lens crumb plus a current entity crumb", () => {
    render(
      at(
        "/components/ds%3Aglobal.component.button",
        <LensBreadcrumbs
          current="ds:global.component.button"
          lensLabel="Components"
          lensRouteName="components"
        />,
      ),
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(2);

    // The lens crumb is a REAL router anchor pointing at the index, so a
    // click is an SPA navigation rather than a full page load.
    const back = within(nav).getByRole("link", { name: "Components" });
    expect(back).toHaveAttribute("href", "/components");

    // The entity crumb is the current page — text with aria-current, no link.
    const current = within(nav).getByText("ds:global.component.button");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).not.toBe("A");
  });

  it("applies the component class alongside the DS breadcrumbs class", () => {
    render(
      at(
        "/standards",
        <LensBreadcrumbs lensLabel="Standards" lensRouteName="standards" />,
      ),
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav.className).toContain("ds breadcrumbs");
    expect(nav.className).toContain("lens-breadcrumbs");
  });
});
