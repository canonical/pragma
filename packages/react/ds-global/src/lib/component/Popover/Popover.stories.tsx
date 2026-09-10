import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import Component from "./Popover.js";

/**
 * The popover content is `position: fixed`, so it does not contribute to the
 * story's flow height. Reserve a tall, centred stage — matching the Tooltip and
 * ContextualMenu stories — so the open popover has room. The `.surface` class
 * defines the `--surface-color-*` channels and the div paints itself with them
 * (surfaces consume themselves), framing the popover on a real surface.
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
  title: "components/Popover",
  component: Component,
  decorators: [stage],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click the trigger to open the popover. It renders closed in the docs canvas
 * so the stories do not overlap.
 */
export const Default: Story = {
  args: {
    trigger: "What's this?",
    label: "About Ubuntu Pro",
    children:
      "Ubuntu Pro gives you security patching for the full open-source stack across your estate.",
  },
  parameters: {
    // Closed by default — nothing to snapshot until it is opened.
    chromatic: { disableSnapshot: true },
  },
};

const statuses = ["Running", "Stopped", "Error"];

const SearchableValuesExample = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Running");
  return (
    <Component trigger={`Status: ${selected}`} label="Filter by status">
      <input
        type="search"
        aria-label="Search statuses"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <fieldset>
        <legend>Status</legend>
        {statuses
          .filter((status) =>
            status.toLowerCase().includes(search.toLowerCase()),
          )
          .map((status) => (
            <label key={status} style={{ display: "block" }}>
              <input
                type="radio"
                name="status"
                checked={selected === status}
                onChange={() => setSelected(status)}
              />
              {status}
            </label>
          ))}
      </fieldset>
    </Component>
  );
};

/** A search field filters selectable values inside a non-modal dialog. */
export const SearchableValues: Story = {
  args: { trigger: "Status", children: null },
  render: () => <SearchableValuesExample />,
};

const tags = ["web", "database", "production", "staging"];

const CheckboxFilterExample = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(["web"]);
  const visible = tags.filter((tag) => tag.includes(search.toLowerCase()));
  return (
    <Component
      trigger={`Tags (${selected.length})`}
      triggerProps={{ importance: "secondary", icon: "filter" }}
      label="Filter by tags"
    >
      <input
        type="search"
        aria-label="Search tags"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <fieldset>
        <legend>Tags</legend>
        {visible.map((tag) => (
          <label key={tag} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={selected.includes(tag)}
              onChange={() =>
                setSelected((current) =>
                  current.includes(tag)
                    ? current.filter((value) => value !== tag)
                    : [...current, tag],
                )
              }
            />
            {tag}
          </label>
        ))}
      </fieldset>
      <button type="button" onClick={() => setSelected(visible)}>
        Select all
      </button>
      <button type="button" onClick={() => setSelected([])}>
        Clear
      </button>
    </Component>
  );
};

/** A styled trigger opens search, checkboxes, and actions. */
export const CheckboxFilter: Story = {
  args: { trigger: "Tags", children: null },
  render: () => <CheckboxFilterExample />,
};

/**
 * The popover shown open, on its contrasted surface so it stands out from the
 * page behind it.
 */
export const Open: Story = {
  args: {
    trigger: "Release notes",
    label: "Release notes",
    open: true,
    children: "Ubuntu 24.04.2 LTS is now available.",
  },
};
