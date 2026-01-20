import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Timeline.js";
import Timeline from "./Timeline.js";

const meta = {
  title: "A/Timeline",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default timeline with multiple events showing actor, datetime, and description.
 */
export const Default: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event actor="John Doe" datetime="January 15, 2024">
          Created the initial document draft
        </Timeline.Event>
        <Timeline.Event actor="Jane Smith" datetime="January 16, 2024">
          Reviewed and added comments
        </Timeline.Event>
        <Timeline.Event actor="John Doe" datetime="January 17, 2024">
          Addressed feedback and updated content
        </Timeline.Event>
        <Timeline.Event actor="Jane Smith" datetime="January 18, 2024">
          Approved the final version
        </Timeline.Event>
      </Timeline.Content>
    ),
  },
};

/**
 * Timeline events with criticality levels for status indication.
 */
export const WithCriticality: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event actor="System" datetime="10:00 AM" criticality="info">
          Deployment started
        </Timeline.Event>
        <Timeline.Event
          actor="System"
          datetime="10:05 AM"
          criticality="success"
        >
          Build completed successfully
        </Timeline.Event>
        <Timeline.Event
          actor="System"
          datetime="10:10 AM"
          criticality="warning"
        >
          Performance degradation detected
        </Timeline.Event>
        <Timeline.Event
          actor="System"
          datetime="10:15 AM"
          criticality="critical"
        >
          Service unavailable - rollback initiated
        </Timeline.Event>
      </Timeline.Content>
    ),
  },
};

/**
 * Minimal timeline events without actor or datetime metadata.
 */
export const MinimalEvents: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event>First event happened</Timeline.Event>
        <Timeline.Event>Second event occurred</Timeline.Event>
        <Timeline.Event>Third event completed</Timeline.Event>
      </Timeline.Content>
    ),
  },
};

/**
 * Timeline events with datetime but no actor.
 */
export const WithDatetimeOnly: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event datetime="9:00 AM">Morning standup</Timeline.Event>
        <Timeline.Event datetime="12:00 PM">Lunch break</Timeline.Event>
        <Timeline.Event datetime="2:00 PM">Code review</Timeline.Event>
        <Timeline.Event datetime="5:00 PM">End of day wrap-up</Timeline.Event>
      </Timeline.Content>
    ),
  },
};

/**
 * Timeline with a single event.
 */
export const SingleEvent: Story = {
  args: {
    children: (
      <Timeline.Content>
        <Timeline.Event actor="Admin" datetime="Today">
          Account created
        </Timeline.Event>
      </Timeline.Content>
    ),
  },
};
