import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Accordion.js";

const meta: Meta<typeof Component> = {
  title: "components/Accordion",
  component: Component,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  render: () => (
    <Component>
      <Component.Item heading="What is an Accordion?" expanded>
        <p className="p">
          An accordion is a vertically stacked set of interactive headings that
          each reveal a section of content. When used correctly, accordions help
          users browse related content more efficiently.
        </p>
      </Component.Item>
      <Component.Item heading="When to use">
        <p className="p">
          Use accordions when you have multiple sections of content that users
          might want to compare, or when space is limited and you want to reduce
          scrolling.
        </p>
      </Component.Item>
      <Component.Item heading="When not to use">
        <p className="p">
          Avoid accordions when users need to read all of the content, since
          they hide information.
        </p>
      </Component.Item>
    </Component>
  ),
};

export const SingleItem: Story = {
  render: () => (
    <Component>
      <Component.Item heading="Click to expand">
        <p className="p">
          Native <code className="code">&lt;details&gt;</code> owns the open
          state, so no JavaScript is required to toggle this item.
        </p>
      </Component.Item>
    </Component>
  ),
};

/**
 * The `heading` prop takes a node, so the consumer owns heading semantics and
 * chooses the level appropriate for the page's document outline.
 */
export const HeadingLevels: Story = {
  render: () => (
    <Component>
      <Component.Item heading={<h1>Level 1 heading</h1>}>
        <p className="p">This item's heading is an h1.</p>
      </Component.Item>
      <Component.Item heading={<h2>Level 2 heading</h2>}>
        <p className="p">This item's heading is an h2.</p>
      </Component.Item>
      <Component.Item heading={<h3>Level 3 heading</h3>}>
        <p className="p">This item's heading is an h3.</p>
      </Component.Item>
      <Component.Item heading={<h4>Level 4 heading</h4>}>
        <p className="p">This item's heading is an h4.</p>
      </Component.Item>
      <Component.Item heading={<h5>Level 5 heading</h5>}>
        <p className="p">This item's heading is an h5.</p>
      </Component.Item>
      <Component.Item heading={<h6>Level 6 heading</h6>}>
        <p className="p">
          This item's heading is an h6. Each level renders at its own heading
          tier in the type scale; the chevron aligns to the first text line so
          it stays put across sizes.
        </p>
      </Component.Item>
    </Component>
  ),
};

/**
 * The accordion adapts to nested `.surface` contexts: its header background
 * uses the ghost surface channel, which steps to layer 2 and layer 3 as the
 * component is nested inside successive `.surface` containers.
 */
export const OnSurfaces: Story = {
  render: () => (
    // `.surface` re-channels the foreground tokens but does not set its own
    // background, so each wrapper's background is hard-coded here from the
    // matching layer token to make the levels visible.
    <div style={{ display: "grid", gap: "var(--dimension-300)" }}>
      <div
        className="surface"
        style={{
          padding: "var(--dimension-200)",
          background: "var(--color-background)",
        }}
      >
        <Component>
          <Component.Item heading="On a surface" expanded>
            <p className="p">Header background at the base surface level.</p>
          </Component.Item>
          <Component.Item heading="Second item">
            <p className="p">Content.</p>
          </Component.Item>
        </Component>

        <div
          className="surface"
          style={{
            marginBlockStart: "var(--dimension-200)",
            padding: "var(--dimension-200)",
            background: "var(--color-background-layer2)",
          }}
        >
          <Component>
            <Component.Item heading="On surface layer 2" expanded>
              <p className="p">Header background steps to layer 2.</p>
            </Component.Item>
            <Component.Item heading="Second item">
              <p className="p">Content.</p>
            </Component.Item>
          </Component>

          <div
            className="surface"
            style={{
              marginBlockStart: "var(--dimension-200)",
              padding: "var(--dimension-200)",
              background: "var(--color-background-layer3)",
            }}
          >
            <Component>
              <Component.Item heading="On surface layer 3" expanded>
                <p className="p">Header background steps to layer 3.</p>
              </Component.Item>
              <Component.Item heading="Second item">
                <p className="p">Content.</p>
              </Component.Item>
            </Component>
          </div>
        </div>
      </div>
    </div>
  ),
};
