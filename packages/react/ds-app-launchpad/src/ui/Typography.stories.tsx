// FIXME
// This doesn't really fit in the ds-react-core package,
// but it's a simple way to show examples in existing Storybook.
// TODO:
// - do we need a separate Storybook/examples for styles package?
// - should he have a separate Storybook package, that would group all stories from different sources?

const meta = {
  title: "Styles / Typography",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Headings = {
  decorators: [
    () => (
      <>
        <h1>This is a sample of the &lt;h1&gt; heading</h1>
        <h2>This is a sample of the &lt;h2&gt; heading</h2>
        <h3>This is a sample of the &lt;h3&gt; heading</h3>
        <h4>This is a sample of the &lt;h4&gt; heading</h4>
        <h5>This is a sample of the &lt;h5&gt; heading</h5>
        <h6>This is a sample of the &lt;h6&gt; heading</h6>
      </>
    ),
  ],
};

export const HeadingsClasses = {
  decorators: [
    () => (
      <>
        <p className="heading-1">Learn DevOps best practices</p>
        <p className="heading-2">Companies involved in OpenStack</p>
        <p className="heading-3">Latest news from our blog</p>
        <p className="heading-4">Further reading</p>
        <p className="heading-5">Kubernetes</p>
        <p className="heading-6">
          Ubuntu is an open source software operating system
        </p>
      </>
    ),
  ],
};

export const HeadingsMixedClasses = {
  decorators: [
    () => (
      <>
        <h6 className="heading-1">
          Ubuntu is an open source software operating system
        </h6>
        <h5 className="heading-2">Kubernetes</h5>
        <h4 className="heading-3">Further reading</h4>
        <h3 className="heading-4">Latest news from our blog</h3>
        <h2 className="heading-5">Companies involved in OpenStack</h2>
        <h1 className="heading-6">Learn DevOps best practices</h1>
      </>
    ),
  ],
};

export const Subheadings = {
  decorators: [
    () => (
      <>
        <h1>Title</h1>
        <p className="heading-3">Sub-heading</p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipiscing elit praesent justo.
        </p>
        <h2>Title</h2>
        <p className="heading-4">Sub-heading</p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipiscing elit praesent justo.
        </p>
      </>
    ),
  ],
};
