import type { Meta, StoryObj } from "@storybook/react-vite";
import FloatingAnchor from "./FloatingAnchor.js";

const meta = {
  title: "Experimental/FloatingAnchor",
  component: FloatingAnchor,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FloatingAnchor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HoverTrigger: Story = {
  args: {
    trigger: "hover",
    content: "I appear on hover",
    distance: "6px",
    children: <button type="button">Hover me</button>,
  },
};

export const ClickTrigger: Story = {
  args: {
    trigger: "click",
    content: "I appear on click — click outside or press Escape to close",
    distance: "6px",
    children: <button type="button">Click me</button>,
  },
};

export const PreferBottom: Story = {
  args: {
    trigger: "hover",
    preferredDirections: ["bottom"],
    content: "Positioned below",
    distance: "6px",
    children: <button type="button">Bottom tooltip</button>,
  },
};

export const WithRenderContent: Story = {
  args: {
    trigger: "click",
    distance: "6px",
    children: <button type="button">Click for custom content</button>,
    renderContent: ({ ref, id, isOpen, style, onPointerEnter, onFocus }) => (
      <div
        ref={ref}
        id={id}
        aria-hidden={!isOpen}
        onPointerEnter={onPointerEnter}
        onFocus={onFocus}
        style={{
          ...style,
          visibility: isOpen ? "visible" : "hidden",
          background: "var(--color-foreground-ghost, #333)",
          color: "var(--color-text, #fff)",
          padding: "8px 16px",
          borderRadius: "4px",
        }}
      >
        Custom rendered content
      </div>
    ),
  },
};

export const AriaControls: Story = {
  args: {
    trigger: "click",
    ariaRelationship: "controls",
    content: "Popover-style content with aria-controls",
    distance: "6px",
    children: <button type="button">Toggle popover</button>,
  },
};
