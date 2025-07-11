import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import Button from "ui/Button/Button.js";
import Panel from "ui/Panel/Panel.js";
import AppAside from "./AppAside.js";

const meta: Meta<typeof AppAside> = {
  component: AppAside,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: false,
    },
  },
};

export default meta;

type Story = StoryObj<typeof AppAside>;

/**
 * In most common cases an `AppAside` should contain a `<Panel>` to display the
 * content as intended in the application layout.
 *
 * `AppAside` should be a direct child of an `<Application>` or passed to the
 * application layout `<ApplicationLayout aside={<AppAside .../>}>`.
 */
export const Default: Story = {
  render: (args) => {
    const [pinned, setPinned] = useState(false);
    const [width, setWidth] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="l-application" role="presentation">
        <main className="l-main">
          <p>Scroll to the right to see the panel.</p>
          <Button onClick={() => setCollapsed(false)}>Open</Button>
          <Button onClick={() => setWidth("narrow")}>Narrow</Button>
          <Button onClick={() => setWidth(null)}>Default</Button>
          <Button onClick={() => setWidth("wide")}>Wide</Button>
        </main>
        <AppAside
          {...args}
          pinned={pinned}
          wide={width === "wide"}
          narrow={width === "narrow"}
          collapsed={collapsed}
        >
          <Panel
            controls={
              <>
                <Button
                  onClick={() => setPinned(!pinned)}
                  className="u-no-margin--bottom"
                >
                  Pin
                </Button>
                <Button
                  appearance="base"
                  className="u-no-margin--bottom"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  Close
                </Button>
              </>
            }
            title="App aside"
          >
            Here be dragons
          </Panel>
        </AppAside>
      </div>
    );
  },
};
