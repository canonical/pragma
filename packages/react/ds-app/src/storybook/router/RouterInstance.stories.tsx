import { useRouter } from "@canonical/router-react";
import { withHashRouter } from "@canonical/storybook-addon-utils";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect } from "storybook/test";

/**
 * Single-instance smoke probe for the shared router decorator.
 *
 * `withHashRouter` lives in `@canonical/storybook-addon-utils` and renders
 * `RouterProvider`; this story's component calls `useRouter()` from
 * `@canonical/router-react` as a *consumer* package would. Provider and
 * consumer therefore have to resolve the SAME `@canonical/router-react` module
 * instance — if the addon and the story ever close over two copies (a stale
 * peer range that makes a strict package manager install a second router, or a
 * workspace symlink Vite fails to dedupe), they get two distinct React context
 * objects, the context reads empty and `useRouter()` throws
 * "RouterProvider is required to use router-react hooks."
 *
 * So the story rendering at all IS the proof; the play function only turns that
 * into an explicit assertion for Chromatic/test runs.
 */
const RouterProbe = (): ReactNode => {
  const router = useRouter();
  return (
    <p data-testid="router-probe">
      Router resolved from a single module instance:{" "}
      {typeof router.navigate === "function" ? "yes" : "no"}
    </p>
  );
};

const meta = {
  title: "Storybook/Router instance probe",
  component: RouterProbe,
  decorators: [withHashRouter()],
  // Left snapshotted on purpose: Chromatic rendering (and playing) the story is
  // what turns this into a CI gate rather than a comment. It has no design
  // surface to regress — one line of text — so the baseline is stable.
  tags: ["!autodocs"],
} satisfies Meta<typeof RouterProbe>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Throws before rendering if provider and consumer are different instances. */
export const SingleInstance: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("router-probe")).toHaveTextContent(
      "Router resolved from a single module instance: yes",
    );
  },
};
