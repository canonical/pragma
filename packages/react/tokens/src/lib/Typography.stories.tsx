import "./Typography.css";

const meta = {
  title: "Foundation/Typography",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Typography samples rendered inside the same token-aware shell as the design-token explorer, so text color tracks theme, modifier, and surface context correctly.",
      },
    },
  },
};

export default meta;

export const Overview = {
  parameters: {
    docs: {
      description: {
        story:
          "Typography scale preview and modifier/surface wiring demonstration. Heading elements and utility classes inherit semantic color through the token cascade.",
      },
    },
  },
  render: () => (
    <div className="typography-page">
      <section className="typography-hero">
        <p className="eyebrow">Typography in token context</p>
        <h2>Text should inherit semantic color automatically</h2>
        <p>
          These samples use the same semantic and modifier-aware color chain as
          components, so changing the Storybook theme no longer leaves
          typography preview text on the wrong surface.
        </p>
      </section>

      <section className="typography-panel">
        <p className="eyebrow">Scale preview</p>
        <div className="typography-grid">
          <article className="typography-sample">
            <span className="eyebrow">Native headings</span>
            <div className="stack">
              <h1>This is the h1 heading</h1>
              <h2>This is the h2 heading</h2>
              <h3>This is the h3 heading</h3>
              <h4>This is the h4 heading</h4>
            </div>
          </article>
          <article className="typography-sample">
            <span className="eyebrow">Utility classes</span>
            <div className="stack">
              <p className="heading-1">Learn DevOps best practices</p>
              <p className="heading-2">Companies involved in OpenStack</p>
              <p className="heading-3">Latest news from our blog</p>
              <p className="heading-4">Further reading</p>
            </div>
          </article>
        </div>
      </section>

      <section className="typography-panel">
        <p className="eyebrow">Modifier and surface wiring</p>
        <div className="typography-context-grid">
          <article className="typography-context-card">
            <h3 className="title">Default</h3>
            <p className="body">
              Text inherits <code>--color-text</code>.
            </p>
            <span className="meta">Semantic fallback only</span>
          </article>
          <article className="typography-context-card error">
            <h3 className="title">Error modifier</h3>
            <p className="body">
              Text inherits <code>--modifier-color-text</code> before the
              semantic fallback.
            </p>
            <span className="meta">Modifier channel wins</span>
          </article>
          <article className="typography-context-card surface">
            <h3 className="title">Surface layer</h3>
            <p className="body">
              Nested surfaces keep copy readable on elevated backgrounds.
            </p>
            <span className="meta">Surface background, semantic text</span>
          </article>
        </div>
      </section>
    </div>
  ),
};
