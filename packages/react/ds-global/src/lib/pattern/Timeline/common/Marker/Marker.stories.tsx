import type { Meta, StoryFn } from "@storybook/react-vite";
import { AD, JD } from "../../../../../storybook/timeline/fixtures.js";
import { Icon } from "../../../../component/Icon/index.js";
import Component from "./Marker.js";

const meta = {
  title: "patterns/Timeline/Marker",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "`Timeline.Marker` is the graphical element on the timeline: large carries an image or initials, medium an icon or initials, small is the bare outlined square.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * The size progression: large carries initials, medium an icon or initials,
 * small holds no graphic. Markers from the merge-proposal fixtures.
 */
export const SizeProgression: StoryFn<typeof Component> = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
    <Component {...AD} size="large" />
    <Component initials="NA" size="medium" />
    <Component size="small" />
  </div>
);

/**
 * Monogram markers: one per actor, as the merge-proposal example uses them.
 */
export const Initials: StoryFn<typeof Component> = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
    <Component {...AD} size="large" />
    <Component {...JD} size="large" />
  </div>
);

/**
 * Icon markers on the medium size — e.g. an event-type icon.
 */
export const IconMarker: StoryFn<typeof Component> = () => (
  <Component icon={<Icon icon="user" />} size="medium" />
);

/**
 * Image markers: a profile picture on the large size, as the merge-proposal
 * Figma uses them. `alt` is required — without it the marker falls back to
 * the generic user icon (and warns outside production).
 */
export const Image: StoryFn<typeof Component> = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
    <Component
      size="large"
      imageUrl="https://res.cloudinary.com/canonical/image/fetch/f_auto,q_auto,fl_sanitize,w_1832/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fd2b1b018-1.png"
      alt="Alvarez Daniella"
    />
    <Component
      size="medium"
      imageUrl="https://res.cloudinary.com/canonical/image/fetch/f_auto,q_auto,fl_sanitize,w_1832/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fd2b1b018-1.png"
      alt="Alvarez Daniella"
    />
  </div>
);

/**
 * A linked marker wraps its graphic — the actor's profile URL.
 */
export const Linked: StoryFn<typeof Component> = () => (
  <Component {...AD} size="large" href="#alvarez" label="Alvarez Daniella" />
);

/**
 * Omitting every graphic option falls back to the generic user icon.
 */
export const DefaultGraphic: StoryFn<typeof Component> = () => (
  <Component size="large" />
);
