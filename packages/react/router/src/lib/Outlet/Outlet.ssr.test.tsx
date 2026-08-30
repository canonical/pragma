import { createStaticRouter, route } from "@canonical/router-core";
import type { ReactElement } from "react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import Outlet from "./Outlet.js";

function ProfilePage({
  params,
}: {
  readonly params: { readonly id: string };
}): ReactElement {
  return (
    <main>
      <h1>profile-{params.id}</h1>
    </main>
  );
}

describe("Outlet SSR parity (AV-340)", () => {
  it("emits identical markup for bare-component and arrow content wirings", () => {
    const bareRouter = createStaticRouter(
      {
        profile: route({ url: "/profiles/:id", content: ProfilePage }),
      },
      "/profiles/7",
    );
    const arrowRouter = createStaticRouter(
      {
        profile: route({
          url: "/profiles/:id",
          content: (props) =>
            createElement(ProfilePage, { params: props.params }),
        }),
      },
      "/profiles/7",
    );

    const bareHtml = renderToString(
      <RouterProvider router={bareRouter}>
        <Outlet />
      </RouterProvider>,
    );
    const arrowHtml = renderToString(
      <RouterProvider router={arrowRouter}>
        <Outlet />
      </RouterProvider>,
    );

    // renderToString separates adjacent text nodes with `<!-- -->` markers.
    expect(bareHtml).toMatch(/profile-<!-- -->7/);
    expect(arrowHtml).toBe(bareHtml);
  });
});
