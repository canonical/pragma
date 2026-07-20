import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./Announcement.js";

const meta = {
  title: "_work_in_progress/component/Announcement",
  component: Component,
  argTypes: {
    criticality: {
      options: [undefined, ...MODIFIER_FAMILIES.criticality],
      control: { type: "radio" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    criticality: "information",
    heading: "System Maintenance",
    children:
      "Maintenance is scheduled for tonight, Nov 12, from 11 PM - 2 AM PST. Some services may be unavailable.",
  },
};

/**
 * The heading is optional — an announcement may be content-only.
 */
export const WithoutHeading: Story = {
  args: {
    criticality: "information",
    children:
      "Maintenance is scheduled for tonight, Nov 12, from 11 PM - 2 AM PST.",
  },
};

/**
 * Criticality reflects the type of announcement, driving the icon, side-bar
 * colour, background, and text.
 */
export const Criticality: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {MODIFIER_FAMILIES.criticality.map((value) => (
        <Component key={value} {...args} criticality={value} heading={value}>
          Maintenance is scheduled for tonight, Nov 12, from 11 PM - 2 AM PST.
        </Component>
      ))}
    </div>
  ),
  args: { children: "Not rendered" },
};

/**
 * A longer body wraps across multiple lines; the icon stays top-aligned and the
 * text column flows beneath the heading.
 */
export const LongMessage: Story = {
  args: {
    criticality: "information",
    heading: "Scheduled maintenance and service migration",
    children:
      "Over the coming weekend we will migrate several backend services to a new region to improve latency and resilience. During the migration window — Saturday 22:00 through Sunday 06:00 UTC — dashboards may load slowly, exports may be delayed, and some automated jobs will be queued rather than run immediately. No data will be lost, and any queued work will complete once the migration finishes. We recommend avoiding large bulk operations during this window. If you notice anything unexpected after the migration completes, please contact support with the details.",
  },
};

/**
 * Right-to-left layout (Arabic). Logical properties flip the side bar to the
 * trailing (right) edge and the icon leads on the right.
 */
export const RightToLeft: Story = {
  decorators: [decorators.rtl()],
  args: {
    criticality: "information",
    heading: "صيانة النظام",
    children:
      "من المقرر إجراء صيانة الليلة، 12 نوفمبر، من الساعة 11 مساءً حتى 2 صباحًا بتوقيت المحيط الهادئ. قد تكون بعض الخدمات غير متوفرة.",
  },
};
