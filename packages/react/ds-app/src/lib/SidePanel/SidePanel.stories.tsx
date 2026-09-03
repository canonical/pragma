import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryFn } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import SidePanel from "./SidePanel.js";

const meta: Meta<typeof SidePanel> = {
  title: "Components/SidePanel",
  component: SidePanel,
};

export default meta;

/**
 * Every story drives the panel the way a consumer must: `open` is state owned
 * by the caller, and the panel only ever asks to be closed.
 */
const Example = ({
  initialOpen = false,
  body,
  footer = true,
  header = true,
  closeOnOutsideClick,
}: {
  initialOpen?: boolean;
  body?: ReactNode;
  footer?: boolean;
  header?: boolean;
  closeOnOutsideClick?: boolean;
}) => {
  const [open, setOpen] = useState(initialOpen);

  return (
    <>
      <Button onClick={() => setOpen((current) => !current)}>
        {open ? "Close" : "Open"} side panel
      </Button>

      <SidePanel
        open={open}
        onOpenChange={setOpen}
        closeOnOutsideClick={closeOnOutsideClick}
        // Only needed for the header-less story; harmless elsewhere.
        aria-label={header ? undefined : "Panel without a header"}
      >
        {header && <SidePanel.Header>Panel title</SidePanel.Header>}
        <SidePanel.Content>
          {body ?? <p>The application behind this panel is still usable.</p>}
        </SidePanel.Content>
        {footer && (
          <SidePanel.Footer>
            {/*
              Footer content is passed in by the consumer — the panel only lays
              it out. Only the confirming action is `constructive`: the modifier
              means "this creates or confirms", so a green Cancel would misread.
            */}
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              importance="primary"
              anticipation="constructive"
              onClick={() => setOpen(false)}
            >
              Save
            </Button>
          </SidePanel.Footer>
        )}
      </SidePanel>
    </>
  );
};

/** Closed by default, opened from a trigger. */
export const Default: StoryFn<typeof SidePanel> = () => <Example />;

// A closed panel is not worth a visual snapshot.
Default.parameters = { chromatic: { disable: true } };

/** The open panel — the visual baseline. */
export const Open: StoryFn<typeof SidePanel> = () => (
  <Example initialOpen={true} />
);

/**
 * The claim this component makes about layout: however tall the content, the
 * header and footer stay visible and only the middle scrolls.
 */
export const OverflowingContent: StoryFn<typeof SidePanel> = () => (
  <Example
    initialOpen={true}
    body={
      <>
        <p>Scroll this pane. The header and footer must not move.</p>
        {Array.from({ length: 40 }, (_, index) => `paragraph-${index + 1}`).map(
          (key, index) => (
            <p key={key}>
              Paragraph {index + 1} of filler content, here to make the content
              pane overflow.
            </p>
          ),
        )}
        <p>End of the content.</p>
      </>
    }
  />
);

/**
 * The claim this component makes about being non-modal: the page behind is not
 * inert, so these controls stay clickable and tabbable while the panel is open.
 * Compare with a modal dialog, where all of this would be unreachable.
 */
export const InteractiveBackground: StoryFn<typeof SidePanel> = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "40rem" }}>
      <p>
        Pressed <strong>{count}</strong> times — try it with the panel open, and
        try tabbing to it.
      </p>
      <Button onClick={() => setCount((current) => current + 1)}>
        Count up
      </Button>
      <label>
        Type here while the panel is open:{" "}
        <input type="text" placeholder="still editable" />
      </label>
      <Example initialOpen={true} />
    </div>
  );
};

/** Opt-in light dismissal, off by default for a non-modal panel. */
export const CloseOnOutsideClick: StoryFn<typeof SidePanel> = () => (
  <Example initialOpen={true} closeOnOutsideClick={true} />
);

/** Both parts are optional; the layout must not collapse without them. */
export const WithoutHeaderOrFooter: StoryFn<typeof SidePanel> = () => (
  <Example initialOpen={true} header={false} footer={false} />
);
