import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Docs/Grid/Examples",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const cell = (label: string, span?: string): React.ReactElement => (
  <div
    style={{
      gridColumn: span,
      padding: "1rem",
      background: "var(--color-background-container)",
      border: "1px solid var(--color-border)",
      textAlign: "center",
    }}
  >
    {label}
  </div>
);

export const ResponsiveGrid: Story = {
  name: "Responsive grid",
  render: () => (
    <div className="grid responsive" style={{ padding: "var(--grid-margin)" }}>
      {cell("span 4", "span 4")}
      {cell("span 8", "span 8")}
      {cell("span 6", "span 6")}
      {cell("span 6", "span 6")}
      {cell("span 12", "1 / -1")}
    </div>
  ),
};

export const IntrinsicBasic: Story = {
  name: "Intrinsic — basic",
  render: () => (
    <div className="grid intrinsic" style={{ padding: "1rem" }}>
      {cell("1")}
      {cell("2")}
      {cell("3")}
      {cell("4")}
      {cell("5")}
      {cell("6")}
      {cell("7")}
      {cell("8")}
    </div>
  ),
};

export const IntrinsicCardGrid: Story = {
  name: "Intrinsic — card grid",
  render: () => (
    <div className="grid intrinsic" style={{ padding: "1rem" }}>
      {["Services", "Alerts", "Deploys", "Logs", "Metrics", "Config"].map(
        (title) => (
          <div
            key={title}
            style={{
              gridColumn: "span 2",
              border: "1px solid var(--color-border)",
              padding: "1rem",
            }}
          >
            <h3>{title}</h3>
            <p>Content for the {title.toLowerCase()} section.</p>
          </div>
        ),
      )}
    </div>
  ),
};

export const SubgridLayout: Story = {
  name: "Subgrid",
  render: () => (
    <div className="grid responsive" style={{ padding: "var(--grid-margin)" }}>
      <section style={{ gridColumn: "1 / -1" }} className="subgrid">
        <h2 style={{ gridColumn: "1 / 4" }}>Section title</h2>
        <div style={{ gridColumn: "4 / -1" }}>
          Content aligned to the same column tracks as the parent grid.
        </div>
      </section>
    </div>
  ),
};

export const SingleGridSubgridEverywhere: Story = {
  name: "Single grid, subgrid everywhere",
  render: () => (
    <div
      className="grid responsive surface"
      style={{ padding: "var(--grid-margin)" }}
    >
      <header style={{ gridColumn: "1 / -1" }} className="subgrid">
        <h1 style={{ gridColumn: "1 / -1", margin: 0 }}>Application</h1>
      </header>

      <nav
        style={{
          gridColumn: "1 / 4",
          display: "grid",
          gap: "var(--space-050)",
          alignContent: "start",
        }}
      >
        <Button importance="tertiary">Overview</Button>
        <Button importance="tertiary">Machines</Button>
        <Button importance="tertiary">Networks</Button>
      </nav>

      <main style={{ gridColumn: "4 / -1" }} className="subgrid">
        <section style={{ gridColumn: "1 / -1" }} className="subgrid">
          <h2 style={{ gridColumn: "1 / -1", margin: 0 }}>Machines</h2>
          <div
            className="surface"
            style={{ gridColumn: "1 / 5", padding: "var(--space-200)" }}
          >
            <p style={{ margin: 0 }}>Machine list</p>
          </div>
          <div
            className="surface"
            style={{ gridColumn: "5 / -1", padding: "var(--space-200)" }}
          >
            <p style={{ margin: 0 }}>Machine detail</p>
          </div>
        </section>
      </main>
    </div>
  ),
};
