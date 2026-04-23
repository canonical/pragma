import { createRouter, route } from "@canonical/router-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useRouter from "../hooks/useRouter.js";
import Provider from "./Provider.js";

const routes = {
  home: route({ url: "/", content: () => "home" }),
};

function Probe(): null {
  useRouter();

  return null;
}

describe("RouterProvider", () => {
  it("provides the router to descendants via context", () => {
    const router = createRouter(routes);

    expect(() => {
      render(
        <Provider router={router}>
          <Probe />
        </Provider>,
      );
    }).not.toThrow();
  });

  it("renders children", () => {
    const router = createRouter(routes);

    render(
      <Provider router={router}>
        <span data-testid="child">content</span>
      </Provider>,
    );

    expect(screen.getByTestId("child").textContent).toBe("content");
  });
});
