import type { Meta, StoryObj } from "@storybook/react-vite";

const ThemeTest = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      padding: "2rem",
    }}
  >
    <h2>Theme token test</h2>

    <div
      style={{
        padding: "1rem",
        background: "var(--color-background)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border)",
        borderRadius: "4px",
      }}
    >
      <strong>--color-background / --color-text / --color-border</strong>
      <p>
        This text should be dark-on-light in light theme, light-on-dark in dark
        theme.
      </p>
    </div>

    <div
      style={{
        padding: "1rem",
        background: "var(--color-foreground-input)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border)",
        borderRadius: "4px",
      }}
    >
      <strong>--color-foreground-input</strong>
      <p>Input background token.</p>
    </div>

    <div
      style={{
        padding: "1rem",
        background: "var(--color-background-container)",
        color: "var(--color-text-muted)",
        borderRadius: "4px",
      }}
    >
      <strong>--color-background-container / --color-text-muted</strong>
      <p>Container background with muted text.</p>
    </div>

    <div style={{ display: "flex", gap: "0.5rem" }}>
      <div
        style={{
          width: "3rem",
          height: "3rem",
          background: "var(--color-brand-primary)",
          borderRadius: "4px",
        }}
        title="--color-brand-primary"
      />
      <div
        style={{
          width: "3rem",
          height: "3rem",
          background: "var(--color-focusRing)",
          borderRadius: "4px",
        }}
        title="--color-focusRing"
      />
      <div
        style={{
          width: "3rem",
          height: "3rem",
          background: "var(--color-border-error)",
          borderRadius: "4px",
        }}
        title="--color-border-error"
      />
    </div>

    <pre
      style={{
        padding: "1rem",
        background: "var(--color-background-layer2)",
        color: "var(--color-text)",
        borderRadius: "4px",
        fontSize: "0.75rem",
      }}
    >
      {`color-scheme (computed on this element): check DevTools
Storybook theme addon adds .light/.dark to the story wrapper.
Design tokens use light-dark() which resolves from color-scheme.
If your OS is dark and you select "light" in the toolbar,
this should still appear light.`}
    </pre>
  </div>
);

const meta = {
  title: "Debug/Theme Test",
  component: ThemeTest,
} satisfies Meta<typeof ThemeTest>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
