import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Docs/Themes/Examples",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const surfaceStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "var(--surface-color-background, var(--color-background))",
  color: "var(--modifier-color-text, var(--color-text))",
  padding: "var(--space-300)",
  ...extra,
});

export const ThemeForcing: Story = {
  name: "Theme forcing",
  render: () => (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
    >
      <div className="light surface" style={surfaceStyle()}>
        <h3 style={{ margin: 0 }}>Light</h3>
        <p>Forced light theme on this subtree.</p>
        <Button>Action</Button>
      </div>
      <div className="dark surface" style={surfaceStyle()}>
        <h3 style={{ margin: 0 }}>Dark</h3>
        <p>Forced dark theme on this subtree.</p>
        <Button>Action</Button>
      </div>
    </div>
  ),
};
