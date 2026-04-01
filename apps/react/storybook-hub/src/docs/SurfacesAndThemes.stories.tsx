import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Docs/Surfaces/Examples",
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

export const SurfaceDepth: Story = {
  name: "Surface depth",
  render: () => (
    <div className="surface" style={surfaceStyle()}>
      <p style={{ margin: 0 }}>Layer 1 — root values</p>
      <div
        className="surface"
        style={surfaceStyle({ marginTop: "var(--space-200)" })}
      >
        <p style={{ margin: 0 }}>Layer 2 — tinted background</p>
        <div
          className="surface"
          style={surfaceStyle({ marginTop: "var(--space-200)" })}
        >
          <p style={{ margin: 0 }}>Layer 3 — returns toward root</p>
        </div>
      </div>
    </div>
  ),
};

export const SurfaceWithModifier: Story = {
  name: "Surface + modifier",
  render: () => (
    <div className="surface" style={surfaceStyle()}>
      <p style={{ margin: 0 }}>Layer 1 — default</p>
      <div
        className="surface error"
        style={surfaceStyle({ marginTop: "var(--space-200)" })}
      >
        <p style={{ margin: 0 }}>Layer 2 — error modifier + tinted surface</p>
        <Button>Action in error context</Button>
      </div>
      <div
        className="surface success"
        style={surfaceStyle({ marginTop: "var(--space-200)" })}
      >
        <p style={{ margin: 0 }}>Layer 2 — success modifier + tinted surface</p>
        <Button>Action in success context</Button>
      </div>
    </div>
  ),
};

export const PassthroughContainer: Story = {
  name: "Passthrough container",
  render: () => (
    <div className="surface" style={surfaceStyle()}>
      <p style={{ margin: 0 }}>Layer 1</p>
      <div
        style={{
          border: "1px dashed var(--color-border)",
          padding: "var(--space-200)",
          marginTop: "var(--space-200)",
        }}
      >
        <p style={{ margin: 0 }}>
          Layout wrapper (no .surface) — still layer 1
        </p>
        <div
          className="surface"
          style={surfaceStyle({ marginTop: "var(--space-200)" })}
        >
          <p style={{ margin: 0 }}>
            Layer 2 — depth advances past the passthrough
          </p>
        </div>
      </div>
    </div>
  ),
};
