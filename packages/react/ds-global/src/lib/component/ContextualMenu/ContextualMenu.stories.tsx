import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import Component from "./ContextualMenu.js";
import type { MenuItem } from "./types.js";

/**
 * The menu is `position: fixed`, so it does not contribute to the story's flow
 * height. Reserve a tall, centred stage — matching the Tooltip stories — so the
 * open menu has room and the docs canvas is not cramped. The `.surface` class
 * defines the `--surface-color-*` channels and the div paints itself with them
 * (surfaces consume themselves), framing the menu on a real surface.
 */
const stage: Decorator = (Story) => (
  <div
    className="surface"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      inlineSize: "100%",
      blockSize: "100%",
      minInlineSize: "min(88vw, 480px)",
      minBlockSize: "440px",
      background: "var(--surface-color-background)",
      color: "var(--surface-color-text)",
    }}
  >
    <Story />
  </div>
);

const meta = {
  title: "_work_in_progress/component/ContextualMenu",
  component: Component,
  decorators: [stage],
  tags: ["autodocs"],
  parameters: {
    // Centre the trigger in the story canvas so the (portalled) menu is framed.
    layout: "centered",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A row-actions menu — the kind attached to an entry in a Landscape instances
 * table or a MAAS machine list. Grouped, with a destructive action set apart.
 */
const rowActions: MenuItem[] = [
  {
    key: "manage",
    label: "Manage",
    items: [
      { key: "view", label: "View details", url: "#view" },
      { key: "edit", label: "Edit configuration", url: "#edit" },
      { key: "tags", label: "Edit tags", url: "#tags" },
    ],
  },
  {
    key: "power",
    label: "Power",
    items: [
      { key: "restart", label: "Restart", url: "#restart" },
      { key: "shutdown", label: "Shut down", url: "#shutdown" },
    ],
  },
  {
    key: "danger",
    items: [{ key: "delete", label: "Delete", url: "#delete" }],
  },
];

/**
 * A trigger opens the menu on click. In the docs canvas the menus render closed
 * (click a trigger to open one) so they do not stack on top of one another.
 */
export const Default: Story = {
  args: {
    trigger: "Actions",
    label: "Instance actions",
    groups: rowActions,
  },
};

/**
 * An account menu, as you might find in the top navigation of a Canonical site
 * or the Ubuntu Pro dashboard. The current, unavailable option is disabled.
 */
export const AccountMenu: Story = {
  args: {
    trigger: "abisola@canonical.com",
    label: "Account",
    groups: [
      {
        key: "account",
        items: [
          { key: "profile", label: "Your profile", url: "#profile" },
          { key: "subs", label: "Subscriptions", url: "#subscriptions" },
          { key: "billing", label: "Billing", url: "#billing", disabled: true },
        ],
      },
      {
        key: "session",
        items: [{ key: "signout", label: "Sign out", url: "#signout" }],
      },
    ],
  },
};

/**
 * NOT PART OF THE CORE API.
 *
 * The right-hand `slot` (a badge or keyboard shortcut) is an extension of the
 * menu item, not part of the Figma core component. Here it shows editor
 * shortcuts, as an app such as a Juju dashboard might.
 */
export const WithShortcuts_NotCoreApi: Story = {
  args: {
    trigger: "Edit",
    label: "Edit",
    groups: [
      {
        key: "edit",
        items: [
          { key: "undo", label: "Undo", url: "#undo", slot: "⌘Z" },
          { key: "redo", label: "Redo", url: "#redo", slot: "⇧⌘Z" },
        ],
      },
      {
        key: "clipboard",
        items: [
          { key: "cut", label: "Cut", url: "#cut", slot: "⌘X" },
          { key: "copy", label: "Copy", url: "#copy", slot: "⌘C" },
          { key: "paste", label: "Paste", url: "#paste", slot: "⌘V" },
        ],
      },
    ],
  },
};

/**
 * NOT PART OF THE CORE API.
 *
 * A custom item renderer (`displayItemsType: "custom"` + `Component`) is an
 * escape hatch, not part of the Figma core component — here a richer account
 * switcher row with a secondary line.
 */
export const CustomItems_NotCoreApi: Story = {
  args: {
    trigger: "Switch organisation",
    label: "Organisations",
    groups: [
      {
        key: "orgs",
        items: [
          {
            key: "canonical",
            label: "Canonical",
            displayItemsType: "custom",
            Component: ({ item }) => (
              <span style={{ display: "flex", flexDirection: "column" }}>
                <strong>{item.label}</strong>
                <small>Owner · 42 members</small>
              </span>
            ),
          },
          {
            key: "community",
            label: "Ubuntu Community",
            displayItemsType: "custom",
            Component: ({ item }) => (
              <span style={{ display: "flex", flexDirection: "column" }}>
                <strong>{item.label}</strong>
                <small>Member · 1,208 members</small>
              </span>
            ),
          },
        ],
      },
    ],
  },
};

/**
 * Nested submenus. A menu item that has its own `items` becomes a submenu
 * trigger (shown with a trailing caret); hovering it or pressing ArrowRight
 * opens the submenu to the leading edge, top-aligned to the parent. ArrowLeft
 * closes the submenu and returns to the parent. Submenus can nest arbitrarily.
 */
const nestedActions: MenuItem[] = [
  {
    key: "primary",
    items: [
      { key: "open", label: "Open", url: "#open" },
      {
        key: "share",
        label: "Share",
        // A submenu parent — its items open in a nested menu.
        items: [
          { key: "share-link", label: "Copy link", url: "#link" },
          { key: "share-email", label: "Email", url: "#email" },
          {
            key: "share-teams",
            label: "Send to team",
            // A deeper submenu, to show arbitrary nesting.
            items: [
              { key: "team-eng", label: "Engineering", url: "#eng" },
              { key: "team-design", label: "Design", url: "#design" },
              { key: "team-ops", label: "Operations", url: "#ops" },
            ],
          },
        ],
      },
      {
        key: "export",
        label: "Export as",
        items: [
          { key: "export-pdf", label: "PDF", url: "#pdf" },
          { key: "export-csv", label: "CSV", url: "#csv" },
          { key: "export-json", label: "JSON", url: "#json" },
        ],
      },
    ],
  },
  {
    key: "danger",
    items: [{ key: "delete", label: "Delete", url: "#delete" }],
  },
];

export const NestedSubmenus: Story = {
  args: {
    trigger: "Actions",
    label: "Item actions",
    groups: nestedActions,
  },
};

/**
 * Right-to-left. Direction is the document's single source of truth (`<html
 * dir>`) — the same signal the portalled menu and the caret CSS (`:root[dir=
 * "rtl"]`) read — so this sets `<html dir="rtl">`, but ONLY in the isolated story
 * view (never the autodocs page, where it would flip every sibling story), and
 * restores it on unmount.
 */
const rtl: Decorator = (Story, context) => {
  useEffect(() => {
    if (context.viewMode === "docs") return;
    const el = document.documentElement;
    const previous = el.dir;
    el.dir = "rtl";
    return () => {
      el.dir = previous;
    };
  }, [context.viewMode]);
  return <Story />;
};

/**
 * The contextual menu in a right-to-left language (Arabic). Everything mirrors:
 * the menu opens to the left of the trigger, submenus cascade leftward, and the
 * submenu caret points `‹`.
 */
const rtlActions: MenuItem[] = [
  {
    key: "primary",
    items: [
      { key: "open", label: "فتح", url: "#open" },
      {
        key: "share",
        label: "مشاركة",
        items: [
          { key: "share-link", label: "نسخ الرابط", url: "#link" },
          { key: "share-email", label: "بريد إلكتروني", url: "#email" },
          {
            key: "share-team",
            label: "إرسال إلى الفريق",
            items: [
              { key: "team-eng", label: "الهندسة", url: "#eng" },
              { key: "team-design", label: "التصميم", url: "#design" },
            ],
          },
        ],
      },
      { key: "rename", label: "إعادة تسمية", url: "#rename" },
    ],
  },
  {
    key: "danger",
    items: [{ key: "delete", label: "حذف", url: "#delete" }],
  },
];

export const RightToLeft: Story = {
  decorators: [rtl],
  args: {
    trigger: "الإجراءات",
    label: "إجراءات العنصر",
    groups: rtlActions,
  },
};
