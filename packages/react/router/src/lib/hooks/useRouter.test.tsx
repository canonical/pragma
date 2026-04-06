import { createRouter, route } from "@canonical/router-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouterProvider from "../RouterProvider/Provider.js";
import useRouter from "./useRouter.js";

const routes = {
  home: route({
    url: "/",
    content: () => "home",
  }),
};

function Probe() {
  const router = useRouter<typeof routes>();

  return <span>{router.buildPath("home")}</span>;
}

describe("useRouter", () => {
  it("reads the router from RouterProvider", () => {
    const router = createRouter(routes);

    render(
      <RouterProvider router={router}>
        <Probe />
      </RouterProvider>,
    );

    expect(screen.getByText("/")).toBeTruthy();
  });

  it("throws when no RouterProvider is present", () => {
    expect(() => {
      render(<Probe />);
    }).toThrow("RouterProvider is required to use router-react hooks.");
  });
});
