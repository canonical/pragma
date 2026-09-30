import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * The heading component is used to signify the hierarchical structure of a page,
 * serving as titles for different segments — the whole page, a section or a
 * block. It breaks content into easily consumable parts, helping users scan the
 * interface and understand the relationship between blocks of information
 * through hierarchy.
 *
 * Headings are plain semantic elements (`<h1>`–`<h6>`): the typography engine in
 * `@canonical/styles` styles them at the matching tier — font, weight and a
 * baseline-snapped line height — so no wrapper component is needed. Choose the
 * level by the document outline (what the heading *means*), not by how large it
 * should look.
 *
 * @implements ds:global.component.heading
 */
const meta = {
  title: "components/Heading",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** All six heading levels, top to bottom. */
export const Levels: Story = {
  render: () => (
    <>
      <h1>Heading 1 — page title</h1>
      <h2>Heading 2 — section</h2>
      <h3>Heading 3 — subsection</h3>
      <h4>Heading 4</h4>
      <h5>Heading 5</h5>
      <h6>Heading 6</h6>
    </>
  ),
};

/**
 * Headings establish the document outline. Nest levels in order — a section
 * under the page title, a subsection under the section — so assistive
 * technology can navigate the structure. Do not skip levels for visual effect.
 */
export const InContext: Story = {
  render: () => (
    <article>
      <h1>Deploying at scale</h1>
      <p>
        An overview of the tools and practices for running production workloads.
      </p>
      <h2>Provisioning</h2>
      <p>How machines are brought up and configured.</p>
      <h3>Bare metal</h3>
      <p>Using MAAS to provision physical servers.</p>
      <h3>Virtual machines</h3>
      <p>Provisioning VMs across clouds.</p>
      <h2>Orchestration</h2>
      <p>Coordinating services once the machines are ready.</p>
    </article>
  ),
};
