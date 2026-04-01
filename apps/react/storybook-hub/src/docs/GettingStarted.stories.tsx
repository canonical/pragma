import { Badge, Button, Card } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Docs/Getting Started/Examples",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const QuickStart: Story = {
  render: () => <Button anticipation="constructive">Save changes</Button>,
};

export const FirstComponents: Story = {
  render: () => (
    <div className="grid responsive">
      <Card style={{ gridColumn: "1 / -1" }}>
        <Card.Header>
          <h2>Deployments</h2>
          <Badge value={3} criticality="success" />
        </Card.Header>
        <Card.Content>
          <p>All services running normally.</p>
          <Button>View details</Button>
        </Card.Content>
      </Card>
    </div>
  ),
};

export const ThemeForcing: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <div
        className="light surface"
        style={{
          padding: "var(--space-200)",
          background:
            "var(--surface-color-background, var(--color-background))",
        }}
      >
        <Button>Light theme</Button>
      </div>
      <div
        className="dark surface"
        style={{
          padding: "var(--space-200)",
          background:
            "var(--surface-color-background, var(--color-background))",
        }}
      >
        <Button>Dark theme</Button>
      </div>
    </div>
  ),
};
