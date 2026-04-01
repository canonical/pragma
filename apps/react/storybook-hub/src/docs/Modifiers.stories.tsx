import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import { Badge, Button, Chip, Label } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Docs/Modifiers/Examples",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AnticipationOnButton: Story = {
  name: "Anticipation",
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <Button>Default</Button>
      {MODIFIER_FAMILIES.anticipation.map((value) => (
        <Button key={value} anticipation={value}>
          {value}
        </Button>
      ))}
    </div>
  ),
};

export const CriticalityOnBadge: Story = {
  name: "Criticality",
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Badge value={5} />
      {MODIFIER_FAMILIES.criticality.map((value) => (
        <Badge key={value} value={5} criticality={value} />
      ))}
    </div>
  ),
};

export const LifecycleOnLabel: Story = {
  name: "Lifecycle",
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {MODIFIER_FAMILIES.lifecycle.map((value) => (
        <Label key={value} lifecycle={value}>
          {value}
        </Label>
      ))}
    </div>
  ),
};

export const ReleaseOnChip: Story = {
  name: "Release",
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {MODIFIER_FAMILIES.release.map((value) => (
        <Chip key={value} lead="Status" value={value} release={value} />
      ))}
    </div>
  ),
};

export const NestingOverride: Story = {
  name: "Nesting override",
  render: () => (
    <div className="error" style={{ padding: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Label criticality="error">Error context</Label>
        <div className="success">
          <Badge value={1} criticality="success" />
        </div>
      </div>
    </div>
  ),
};
