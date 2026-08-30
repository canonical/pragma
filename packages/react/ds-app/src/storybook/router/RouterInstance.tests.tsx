import { useRouter } from "@canonical/router-react";
import { withHashRouter } from "@canonical/storybook-addon-utils";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

/**
 * Headless twin of `RouterInstance.stories.tsx`.
 *
 * The story is the human-readable proof, but ds-app's Chromatic workflow only
 * runs on changes under `packages/react/ds-app/**` — it would not fire for a
 * change to `@canonical/storybook-addon-utils` itself, which is exactly where
 * the dual-instance regression would come from (a stale optional peer range, a
 * resolution change). This runs in the default `bun run test` gate on every PR
 * instead, asserting the same thing: the `RouterProvider` rendered inside
 * addon-utils and the `useRouter()` called here must close over one
 * `@canonical/router-react` module instance, or the context reads empty and the
 * hook throws "RouterProvider is required to use router-react hooks."
 */
const RouterProbe = (): ReactNode => {
  const router = useRouter();
  return <p data-testid="router-probe">{typeof router.navigate}</p>;
};

describe("withHashRouter (addon-utils)", () => {
  it("resolves the same router-react instance as its consumer", () => {
    render(withHashRouter()(() => <RouterProbe />));

    expect(screen.getByTestId("router-probe")).toHaveTextContent("function");
  });
});
