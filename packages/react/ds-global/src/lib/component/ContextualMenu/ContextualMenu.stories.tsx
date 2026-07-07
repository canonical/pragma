import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./ContextualMenu.js";
import type { MenuItem } from "./types.js";

const meta = {
  title: "_work_in_progress/component/ContextualMenu",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    // Centre the menu in the story canvas so the (portalled) open menu is framed.
    layout: "centered",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicGroups: MenuItem[] = [
  {
    key: "edit",
    label: "Edit",
    items: [
      { key: "cut", label: "Cut", url: "#cut" },
      { key: "copy", label: "Copy", url: "#copy" },
      { key: "paste", label: "Paste", url: "#paste" },
    ],
  },
  {
    key: "view",
    label: "View",
    items: [
      { key: "zoom-in", label: "Zoom in", url: "#zoom-in" },
      { key: "zoom-out", label: "Zoom out", url: "#zoom-out" },
    ],
  },
];

export const Default: Story = {
  args: {
    trigger: "Actions",
    label: "Actions",
    open: true,
    groups: basicGroups,
  },
};

export const WithDisabledItem: Story = {
  args: {
    trigger: "Actions",
    label: "Actions",
    open: true,
    groups: [
      {
        key: "file",
        items: [
          { key: "new", label: "New", url: "#new" },
          { key: "open", label: "Open", url: "#open" },
          { key: "save", label: "Save", url: "#save", disabled: true },
        ],
      },
    ],
  },
};

/**
 * NOT PART OF THE CORE API.
 *
 * The right-hand `slot` (for a badge or keyboard shortcut) is an extension of
 * the menu item, not part of the Figma core component. This story demonstrates
 * the capability; do not treat the slot as a stable part of the documented API.
 */
export const WithSlots_NotCoreApi: Story = {
  args: {
    trigger: "File",
    label: "File",
    open: true,
    groups: [
      {
        key: "file",
        items: [
          { key: "new", label: "New", url: "#new", slot: "⌘N" },
          { key: "save", label: "Save", url: "#save", slot: "⌘S" },
          { key: "print", label: "Print", url: "#print", slot: "⌘P" },
        ],
      },
    ],
  },
};

/**
 * NOT PART OF THE CORE API.
 *
 * A custom item renderer (`displayItemsType: "custom"` + `Component`) is an
 * escape hatch, not part of the Figma core component. Shown here to demonstrate
 * the capability.
 */
export const CustomItems_NotCoreApi: Story = {
  args: {
    trigger: "More",
    label: "More",
    open: true,
    groups: [
      {
        key: "custom",
        items: [
          {
            key: "profile",
            label: "Profile",
            displayItemsType: "custom",
            Component: ({ item }) => (
              <span style={{ display: "flex", flexDirection: "column" }}>
                <strong>{item.label}</strong>
                <small>View and edit your profile</small>
              </span>
            ),
          },
        ],
      },
    ],
  },
};
