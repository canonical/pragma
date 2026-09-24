import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Timeline.js";
import Timeline from "./Timeline.js";

const meta = {
  title: "_work_in_progress/pattern/Timeline",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

const dateTime = {
  format: (iso: string) => ({ display: iso, alternate: iso }),
  toggleable: false,
  tooltip: false,
  pressed: false,
  onToggle: () => {},
};

/** Default timeline with multiple events showing actor, datetime, and description. */
export const Default: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e1",
            dateTime: "January 15, 2024",
            actorName: "John Doe",
            description: "Created the initial document draft",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e2",
            dateTime: "January 16, 2024",
            actorName: "Jane Smith",
            description: "Reviewed and added comments",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e3",
            dateTime: "January 17, 2024",
            actorName: "John Doe",
            description: "Addressed feedback and updated content",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e4",
            dateTime: "January 18, 2024",
            actorName: "Jane Smith",
            description: "Approved the final version",
          }}
        />
      </Timeline.Content>
    ),
  },
};

/** Timeline events with criticality levels for status indication. */
export const WithCriticality: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e1",
            dateTime: "10:00 AM",
            actorName: "System",
            description: "Deployment started",
            criticality: "information",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e2",
            dateTime: "10:05 AM",
            actorName: "System",
            description: "Build completed successfully",
            criticality: "success",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e3",
            dateTime: "10:10 AM",
            actorName: "System",
            description: "Performance degradation detected",
            criticality: "warning",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e4",
            dateTime: "10:15 AM",
            actorName: "System",
            description: "Service unavailable - rollback initiated",
            criticality: "error",
          }}
        />
      </Timeline.Content>
    ),
  },
};

/** Minimal timeline events without actor or datetime metadata. */
export const MinimalEvents: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event
          item={{
            id: "e1",
            dateTime: "2024-01-01",
            description: "First event happened",
          }}
        />
        <Timeline.Event
          item={{
            id: "e2",
            dateTime: "2024-01-02",
            description: "Second event occurred",
          }}
        />
        <Timeline.Event
          item={{
            id: "e3",
            dateTime: "2024-01-03",
            description: "Third event completed",
          }}
        />
      </Timeline.Content>
    ),
  },
};

/** Timeline events with datetime but no actor. */
export const WithDatetimeOnly: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e1",
            dateTime: "9:00 AM",
            description: "Morning standup",
          }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{ id: "e2", dateTime: "12:00 PM", description: "Lunch break" }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{ id: "e3", dateTime: "2:00 PM", description: "Code review" }}
        />
        <Timeline.Event
          dateTime={dateTime}
          item={{
            id: "e4",
            dateTime: "5:00 PM",
            description: "End of day wrap-up",
          }}
        />
      </Timeline.Content>
    ),
  },
};
