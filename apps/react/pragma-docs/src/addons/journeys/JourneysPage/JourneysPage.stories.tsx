import type { Meta } from "@storybook/react-vite";
import JourneysPage from "./JourneysPage.js";

/**
 * The page is a route root: it owns a Relay query, a Suspense boundary and
 * an error boundary, so it is documented here rather than exercised as an
 * isolated story — the composed lens lives at `/journeys` in the app, and
 * its parts have their own stories (JourneyRail, JourneyWell,
 * JourneyInspector).
 */
const meta: Meta<typeof JourneysPage> = {
  title: "Journeys/JourneysPage",
  component: JourneysPage,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false } } },
};

export default meta;
