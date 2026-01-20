import { MODIFIER_AXES, ModifierMatrix } from "@canonical/storybook-helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Label.js";
import Label from "./Label.js";

const meta = {
  title: "Q-A/Label",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    anticipation: {
      control: "select",
      options: [undefined, "constructive", "caution", "destructive"],
    },
    importance: {
      control: "select",
      options: [undefined, "primary", "secondary", "tertiary"],
    },
    criticality: {
      control: "select",
      options: [undefined, "success", "error", "warning", "information"],
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ==========================================================================
   Basic Examples
   ========================================================================== */

/**
 * Default label without any modifiers.
 */
export const Default: Story = {
  args: {
    children: "Label",
  },
};

/* ==========================================================================
   Anticipation Modifier
   Expected outcome: constructive, caution, destructive
   ========================================================================== */

/**
 * Constructive label for positive outcomes.
 */
export const Constructive: Story = {
  args: {
    children: "Constructive",
    anticipation: "constructive",
  },
};

/**
 * Caution label for potentially risky states.
 */
export const Caution: Story = {
  args: {
    children: "Caution",
    anticipation: "caution",
  },
};

/**
 * Destructive label for negative/irreversible states.
 */
export const Destructive: Story = {
  args: {
    children: "Destructive",
    anticipation: "destructive",
  },
};

/* ==========================================================================
   Importance Modifier
   Visual hierarchy: primary > secondary > tertiary
   ========================================================================== */

/**
 * Primary label - high prominence.
 */
export const Primary: Story = {
  args: {
    children: "Primary",
    importance: "primary",
  },
};

/**
 * Secondary label - medium prominence.
 */
export const Secondary: Story = {
  args: {
    children: "Secondary",
    importance: "secondary",
  },
};

/**
 * Tertiary label - low prominence.
 */
export const Tertiary: Story = {
  args: {
    children: "Tertiary",
    importance: "tertiary",
  },
};

/* ==========================================================================
   Criticality Modifier
   Status indication: success, error, warning, information
   ========================================================================== */

/**
 * Success label for positive status.
 */
export const Success: Story = {
  args: {
    children: "Success",
    criticality: "success",
  },
};

/**
 * Error label for error status.
 */
export const Error: Story = {
  args: {
    children: "Error",
    criticality: "error",
  },
};

/**
 * Warning label for warning status.
 */
export const Warning: Story = {
  args: {
    children: "Warning",
    criticality: "warning",
  },
};

/**
 * Information label for informational status.
 */
export const Information: Story = {
  args: {
    children: "Information",
    criticality: "information",
  },
};

/* ==========================================================================
   All Variants
   ========================================================================== */

/**
 * All anticipation variants displayed together.
 */
export const AllAnticipation: Story = {
  decorators: [
    () => (
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Label>Default</Label>
        <Label anticipation="constructive">Constructive</Label>
        <Label anticipation="caution">Caution</Label>
        <Label anticipation="destructive">Destructive</Label>
      </div>
    ),
  ],
  args: {
    children: "Placeholder",
  },
};

/**
 * All importance variants displayed together.
 */
export const AllImportance: Story = {
  decorators: [
    () => (
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Label>Default</Label>
        <Label importance="primary">Primary</Label>
        <Label importance="secondary">Secondary</Label>
        <Label importance="tertiary">Tertiary</Label>
      </div>
    ),
  ],
  args: {
    children: "Placeholder",
  },
};

/**
 * All criticality variants displayed together.
 */
export const AllCriticality: Story = {
  decorators: [
    () => (
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Label>Default</Label>
        <Label criticality="success">Success</Label>
        <Label criticality="error">Error</Label>
        <Label criticality="warning">Warning</Label>
        <Label criticality="information">Information</Label>
      </div>
    ),
  ],
  args: {
    children: "Placeholder",
  },
};

/* ==========================================================================
   Modifier Matrices
   ========================================================================== */

/**
 * Shows all combinations of importance and anticipation.
 */
export const ImportanceAnticipationMatrix: Story = {
  render: () => (
    <ModifierMatrix
      component={Component}
      rowAxis={MODIFIER_AXES.importance}
      columnAxis={MODIFIER_AXES.anticipation}
      baseProps={{ children: "Label" }}
      title="Importance x Anticipation Matrix"
    />
  ),
  args: {
    children: "Not rendered",
  },
};

/**
 * Shows all combinations of importance and criticality.
 */
export const ImportanceCriticalityMatrix: Story = {
  render: () => (
    <ModifierMatrix
      component={Component}
      rowAxis={MODIFIER_AXES.importance}
      columnAxis={MODIFIER_AXES.criticality}
      baseProps={{ children: "Label" }}
      title="Importance x Criticality Matrix"
    />
  ),
  args: {
    children: "Not rendered",
  },
};
