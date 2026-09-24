import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryFn } from "@storybook/react-vite";
import Context from "../../Context.js";
// The stand-in below is a div, not a real <SidePanel>, so it does not pull
// the panel's own positioning — import its styles here to define the shared
// tokens and the panel's box.
import "../../styles.css";
import Footer from "../Footer/Footer.js";
import Header from "../Header/Header.js";
import Component from "./Content.js";

/* Real copy from ubuntu.com/about, cycled as filler in the tall story. */
const ubuntuFacts = [
  "Ubuntu is an ancient African word meaning 'humanity to others'. It is often described as reminding us that 'I am what I am because of who we all are'.",
  "Canonical is the publisher of Ubuntu. Members of the Canonical team lead aspects of Ubuntu such as the kernel, default desktop, foundations, security, OpenStack, and Kubernetes.",
  "Ubuntu was the first operating system to commit to scheduled releases on a predictable cadence, every six months, starting in October 2004.",
];

const meta = {
  title: "Components/SidePanel/Content",
  component: Component,
  decorators: [
    (Story) => (
      /*
        A plain div standing in for the open panel: the stack layout is
        scoped to `[open]`, and the panel's fixed positioning and closed
        transform are undone, so all of it is supplied inline here. A fixed
        height stands in for the viewport height the real panel spans, so
        scrolling and `fill` have something to work against.
      */
      <div
        className="ds side-panel"
        style={{
          position: "static",
          transform: "none",
          display: "flex",
          flexDirection: "column",
          blockSize: "24rem",
          // Docked to the inline-end edge like the real panel.
          marginInlineStart: "auto",
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      // The consumer composes the sections on a `SidePanel`, so serve the
      // consumer-facing snippet explicitly instead of the story's own source.
      source: { type: "code", language: "tsx" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/** The panel body: prose, forms, whatever the task needs. */
export const Default: StoryFn = () => (
  <Component>
    <p>
      We deliver the world&apos;s free software, freely, to everybody on the
      same terms. Whether you are a student in India or a global bank, you can
      download and use Ubuntu free of charge.
    </p>
  </Component>
);
Default.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Content>
  <p>
    We deliver the world's free software, freely, to everybody on the same
    terms. Whether you are a student in India or a global bank, you can
    download and use Ubuntu free of charge.
  </p>
</SidePanel.Content>`,
    },
  },
};

/**
 * Content taller than the panel scrolls the pane itself: the content is the
 * scroll container, and this region simply grows with its children.
 */
export const Tall: StoryFn = () => (
  <Component>
    {Array.from({ length: 10 }, (_, index) => index).map((index) => (
      <p key={index}>{ubuntuFacts[index % ubuntuFacts.length]}</p>
    ))}
  </Component>
);
Tall.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Content>
  {/* Taller than the panel: the pane scrolls, this region grows. */}
  {paragraphs}
</SidePanel.Content>`,
    },
  },
};

/**
 * Opt-in `fill`: the pane grows to take the space the header and footer
 * leave, so a short panel pushes its footer to the bottom edge. The default
 * is the opposite — the content keeps its natural height and the footer
 * follows it, so the actions sit next to the text they refer to rather than
 * at a distance.
 */
export const Fill: StoryFn = () => (
  <Context.Provider
    value={{ close: () => {}, titleId: "side-panel-fill-story-title" }}
  >
    <Header>Ubuntu Pro subscription</Header>
    <Component fill>
      <p>
        A short body — with `fill`, the pane still takes all the space the
        header and footer leave, and the footer sits on the bottom edge.
      </p>
    </Component>
    <Footer>
      <Button importance="primary">Subscribe</Button>
    </Footer>
  </Context.Provider>
);
Fill.parameters = {
  docs: {
    source: {
      code: `<SidePanel>
  <SidePanel.Header>Ubuntu Pro subscription</SidePanel.Header>
  {/* fill: the pane takes the space the header and footer leave,
      so the short panel still pushes its footer to the bottom edge. */}
  <SidePanel.Content fill>
    <p>A short body.</p>
  </SidePanel.Content>
  <SidePanel.Footer>
    <Button importance="primary">Subscribe</Button>
  </SidePanel.Footer>
</SidePanel>`,
    },
  },
};
