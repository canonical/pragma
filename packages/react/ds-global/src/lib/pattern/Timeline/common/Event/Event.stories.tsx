import type { Meta, StoryFn } from "@storybook/react-vite";
import {
  AD,
  ago,
  CommentThread,
  EntityList,
} from "../../../../../storybook/timeline/fixtures.js";
import Component from "./Event.js";
import type { EventDateTimeProps } from "./types.js";

const meta = {
  title: "patterns/Timeline/Event",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "`Timeline.Event` is a single event in the timeline, derived from a `TimelineItem` record: actor, datetime, marker, description, and custom content.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

const absolute = (iso: string): string =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(Date.parse(iso));

const relative = (iso: string): string =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    Date.parse(iso),
  );

/** Shared format state, as the Timeline passes it to every event. */
const eventDateTime: EventDateTimeProps = {
  format: (iso) => ({ display: relative(iso), alternate: absolute(iso) }),
  toggleable: true,
  tooltip: true,
  pressed: false,
  onToggle: () => {},
};

const item = {
  id: "story",
  dateTime: ago(5),
  actorId: "alvarez",
  actorName: "Alvarez Daniella",
  description: "added 1 commit",
  marker: { ...AD, size: "large" as const },
};

/** The default row: marker, actor, description, trailing DateTime. */
export const Default: StoryFn<typeof Component> = () => (
  <Component item={item} dateTime={eventDateTime} />
);

/** With `actorLink`, the name and the marker both become links. */
export const LinkedActor: StoryFn<typeof Component> = () => (
  <Component
    item={{
      ...item,
      actorLink: "#alvarez",
      description: "commented on the proposal",
    }}
    dateTime={eventDateTime}
  />
);

/** The leading layout: DateTime in its own column, left of the marker. */
export const LeadingDatetime: StoryFn<typeof Component> = () => (
  <Component
    item={{
      ...item,
      dateTime: ago(20),
      actorName: "John Santa Pietro di Doe",
      description: "edited the description",
      marker: { initials: "JD", size: "large" as const },
    }}
    dateTime={eventDateTime}
    datetimePosition="leading"
  />
);

/** Custom content renders below the default row. */
export const WithCustomContent: StoryFn<typeof Component> = () => (
  <Component
    item={{
      ...item,
      description: "added 2 commits",
      customContent: (
        <EntityList
          entries={[
            { label: "Fixed some small bugs.", hash: "98a0c9a" },
            {
              label:
                "Implementation of a new feature for Launchpad bug templates.",
              hash: "48acd6c",
            },
          ]}
        />
      ),
    }}
    dateTime={eventDateTime}
  />
);

/** `fullyCustom` hides the default block entirely. */
export const FullyCustom: StoryFn<typeof Component> = () => (
  <Component
    item={{
      ...item,
      fullyCustom: true,
      description: undefined,
      customContent: (
        <CommentThread
          author="Alvarez Daniella"
          action="Added a description on ...folder/FileName 7 days ago"
          body="Main updates New field 'content_templates', dict to contain all launchpad templates."
        />
      ),
    }}
  />
);

/** The criticality modifier tints the connector line and the marker border. */
export const Criticality: StoryFn<typeof Component> = () => (
  <Component
    item={{
      ...item,
      dateTime: ago(0, 4),
      description: "failed to deploy",
      criticality: "error" as const,
    }}
    dateTime={eventDateTime}
  />
);
