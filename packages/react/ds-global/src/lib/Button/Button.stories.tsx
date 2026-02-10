import { MODIFIER_AXES, ModifierMatrix } from "@canonical/storybook-helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import Component from "./Button.js";

const meta = {
  title: "Beta/Button",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    importance: {
      control: "select",
      options: [undefined, "primary", "secondary", "tertiary"],
    },
    anticipation: {
      control: "select",
      options: [undefined, "constructive", "caution", "destructive"],
    },
    variant: {
      control: "select",
      options: [undefined, "link"],
    },
    iconPosition: {
      control: "select",
      options: ["start", "end"],
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ==========================================================================
   Basic Examples
   ========================================================================== */

/**
 * Default button with no modifiers - uses base token styling.
 */
export const Default: Story = {
  args: {
    children: "Button",
  },
};

/**
 * Button with only a label and no icon.
 */
export const LabelOnly: Story = {
  args: {
    children: "Click me",
  },
};

/* ==========================================================================
   Importance Modifier
   Visual hierarchy: primary > secondary > tertiary
   ========================================================================== */

/**
 * Primary buttons are high prominence and used for main call-to-actions.
 */
export const Primary: Story = {
  args: {
    children: "Primary Action",
    importance: "primary",
  },
};

/**
 * Secondary buttons are medium prominence for supporting actions.
 */
export const Secondary: Story = {
  args: {
    children: "Secondary Action",
    importance: "secondary",
  },
};

/**
 * Tertiary buttons are low prominence for less important actions.
 */
export const Tertiary: Story = {
  args: {
    children: "Tertiary Action",
    importance: "tertiary",
  },
};

/* ==========================================================================
   Anticipation Modifier
   Expected outcome: constructive, caution, destructive
   ========================================================================== */

/**
 * Constructive buttons indicate positive outcomes (save, create, confirm).
 */
export const Constructive: Story = {
  args: {
    children: "Save Changes",
    anticipation: "constructive",
  },
};

/**
 * Caution buttons indicate potentially risky actions requiring attention.
 */
export const Caution: Story = {
  args: {
    children: "Proceed with Caution",
    anticipation: "caution",
  },
};

/**
 * Destructive buttons indicate negative/irreversible outcomes (delete, remove).
 */
export const Destructive: Story = {
  args: {
    children: "Delete Item",
    anticipation: "destructive",
  },
};

/* ==========================================================================
   Orthogonal Modifier Combinations
   Importance x Anticipation
   ========================================================================== */

/**
 * Primary destructive button - prominent delete action.
 */
export const PrimaryDestructive: Story = {
  args: {
    children: "Delete Account",
    importance: "primary",
    anticipation: "destructive",
  },
};

/**
 * Secondary constructive button - supporting save action.
 */
export const SecondaryConstructive: Story = {
  args: {
    children: "Save Draft",
    importance: "secondary",
    anticipation: "constructive",
  },
};

/**
 * Tertiary caution button - subtle warning action.
 */
export const TertiaryCaution: Story = {
  args: {
    children: "Reset Form",
    importance: "tertiary",
    anticipation: "caution",
  },
};

/* ==========================================================================
   Icon Examples
   ========================================================================== */

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 10h6l1-10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M1 8h12M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

/**
 * Button with icon at the start (default position).
 */
export const WithIconStart: Story = {
  args: {
    children: "Add Item",
    icon: <PlusIcon />,
    importance: "primary",
  },
};

/**
 * Button with icon at the end.
 */
export const WithIconEnd: Story = {
  args: {
    children: "Continue",
    icon: <ArrowIcon />,
    iconPosition: "end",
    importance: "primary",
  },
};

/**
 * Icon-only button (requires aria-label for accessibility).
 */
export const IconOnly: Story = {
  args: {
    icon: <TrashIcon />,
    "aria-label": "Delete item",
    anticipation: "destructive",
  },
};

/**
 * Destructive button with icon.
 */
export const DestructiveWithIcon: Story = {
  args: {
    children: "Delete",
    icon: <TrashIcon />,
    anticipation: "destructive",
  },
};

/* ==========================================================================
   Link Variant
   ========================================================================== */

/**
 * Link variant button - styled as a text link.
 */
export const LinkVariant: Story = {
  args: {
    children: "Learn more",
    variant: "link",
  },
};

/**
 * Link variant with icon.
 */
export const LinkWithIcon: Story = {
  args: {
    children: "View details",
    variant: "link",
    icon: <ArrowIcon />,
    iconPosition: "end",
  },
};

/* ==========================================================================
   States
   ========================================================================== */

/**
 * Disabled button.
 */
export const Disabled: Story = {
  args: {
    children: "Disabled",
    importance: "primary",
    disabled: true,
  },
};

/**
 * Disabled destructive button.
 */
export const DisabledDestructive: Story = {
  args: {
    children: "Cannot Delete",
    anticipation: "destructive",
    disabled: true,
  },
};

/* ==========================================================================
   Custom Styling
   ========================================================================== */

/**
 * Custom styled button using CSS variables.
 */
export const CustomStyled: Story = {
  args: {
    children: "Custom Button",
    "aria-label": "Custom styled button",
    style: {
      "--button-color-background": "lightblue",
      "--button-color-text": "midnightblue",
      "--button-color-border": "midnightblue",
      "--button-color-background-hover": "lightskyblue",
      "--button-color-background-active": "skyblue",
    } as React.CSSProperties,
  },
};

/* ==========================================================================
   Modifier Inheritance
   ========================================================================== */

/**
 * Demonstrates how anticipation modifiers can be inherited from parent context.
 * The modifier CSS variables cascade down, affecting child buttons.
 */
export const ModifierInheritance: Story = {
  decorators: [
    (_Story) => (
      <div
        className="constructive"
        style={{
          border: "2px solid var(--modifier-color)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <p>
          Parent has <code>constructive</code> class applied.
        </p>
        <Component>Inherits constructive</Component>
        <Component anticipation="destructive">Explicit destructive</Component>
        <Component importance="primary">
          Primary (inherits constructive)
        </Component>
      </div>
    ),
  ],
  args: {
    children: "Not rendered",
  },
};

/* ==========================================================================
   Complete Matrix
   ========================================================================== */

/**
 * Shows all combinations of importance and anticipation using the ModifierMatrix helper.
 * This helper automatically generates the grid from the design system ontology.
 */
export const Matrix: Story = {
  render: () => (
    <ModifierMatrix
      component={Component}
      rowAxis={MODIFIER_AXES.importance}
      columnAxis={MODIFIER_AXES.anticipation}
      baseProps={{ children: "Button" }}
      title="Importance x Anticipation Matrix"
    />
  ),
  args: {
    children: "Not rendered",
  },
};
