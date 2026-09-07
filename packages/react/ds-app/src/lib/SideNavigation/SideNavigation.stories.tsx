import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  lxdContentRoot,
  lxdFooterRoot,
  maasContentRoot,
  maasFooterRoot,
  showcaseFooterRoot,
} from "../../storybook/navigation/fixtures.js";
import {
  CanonicalLogo,
  navDecorators,
  withNavigationRouterProps,
  withNavLayout,
} from "../../storybook/navigation/story-utils.js";
import type { ContextSwitcherItem } from "./common/ContextSwitcher/types.js";
import SideNavigation from "./SideNavigation.js";

const meta: Meta<typeof SideNavigation> = {
  title: "Components/SideNavigation",
  component: SideNavigation,
  parameters: { layout: "fullscreen" },
  // withNavigationRouterProps injects currentUrl + LinkComponent from the live
  // router and keys the story so active state follows navigation; withNavLayout
  // frames it in a page grid. Stories supply only data (root / footerRoot).
  // withNavigationRouterProps is self-contained (owns its RouterProvider), so
  // decorator order isn't load-bearing here; navDecorators supplies the base
  // surface and withNavLayout the page grid.
  decorators: [...navDecorators, withNavigationRouterProps, withNavLayout],
  args: {
    brand: <CanonicalLogo />,
    applicationName: "Canonical",
  },
};

export default meta;
type Story = StoryObj<typeof SideNavigation>;

/** MAAS navigation: grouped hardware/KVM/organisation/config/networking. */
export const MAAS: Story = {
  args: {
    applicationName: "MAAS",
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};

/** LXD navigation: project-scoped instances/profiles/networking/storage/images. */
export const LXD: Story = {
  args: {
    applicationName: "LXD",
    root: lxdContentRoot,
    footerRoot: lxdFooterRoot,
  },
};

/** Collapsed by default. */
export const Collapsed: Story = {
  args: {
    defaultExpanded: false,
    applicationName: "MAAS",
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};

/**
 * A certificate-user app (spec's own example: "If the application allows
 * for a certificate user (like LXD)"): the closed `footerItems` vocabulary,
 * `account`'s icon becomes `certificate`, and `logout` is dropped entirely.
 */
export const CertificateUser: Story = {
  args: {
    applicationName: "LXD",
    root: lxdContentRoot,
    footerItems: [
      { kind: "account", url: "/ui/settings/account", label: "admin" },
      { kind: "logout" },
    ],
    certificateUser: true,
  },
};

/**
 * Below Vanilla's small breakpoint (SPEC.md §7): the collapse toggle
 * becomes a "Menu"/"Close menu" text button; the header stays in its
 * normal row layout (not the desktop centred-column collapsed state); and
 * the body goes fullscreen when open rather than a 240px rail. A fixed
 * narrow wrapper stands in for an actual small-viewport preview. The
 * mobile drill-down for expandable/secondary-opening items (chevron-right,
 * back button) is out of scope — SPEC.md §10.18.
 */
export const Mobile: Story = {
  args: {
    applicationName: "MAAS",
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: "375px", blockSize: "100dvh" }}>
        <Story />
      </div>
    ),
  ],
};

const composedContexts: ContextSwitcherItem[] = [
  { key: "default", name: "default" },
  { key: "staging", name: "staging", description: "Staging environment" },
];

/**
 * Fully composed `Content` — a consumer builds the navigation region
 * directly out of JSX (via `children`) instead of the `root` data shape,
 * to place a `ContextSwitcher` at its "content-defined position" (SPEC.md
 * §1.1, §4.5) above the item groups. Exercises every row variant (`Item`,
 * `ItemButton`, `ItemSwitch`, `ItemExpandable`) and `Separator` together.
 */
export const ComposedContent: Story = {
  args: {
    applicationName: "LXD",
    children: (
      <>
        <SideNavigation.ContextSwitcher
          title="Project"
          currentContext={composedContexts[0]}
          contexts={composedContexts}
          onContextChange={fn()}
        />
        <SideNavigation.Group label="Project">
          <SideNavigation.Item url="/instances" icon="containers">
            Instances
          </SideNavigation.Item>
          <SideNavigation.ItemExpandable heading="Networking" icon="connected">
            <SideNavigation.Item url="/networks">Networks</SideNavigation.Item>
            <SideNavigation.Item url="/network-acls">ACLs</SideNavigation.Item>
          </SideNavigation.ItemExpandable>
        </SideNavigation.Group>
        <SideNavigation.Separator />
        <SideNavigation.Group label="Preferences">
          <SideNavigation.ItemSwitch icon="dark-theme" defaultChecked>
            Dark mode
          </SideNavigation.ItemSwitch>
          <SideNavigation.ItemButton icon="log-out" onClick={fn()}>
            Log out
          </SideNavigation.ItemButton>
        </SideNavigation.Group>
      </>
    ),
  },
};

/**
 * Everything neither MAAS nor LXD's own fixtures exercise, in one screen:
 *
 * - `ContextSwitcher` (content-defined position, composed via `children` —
 *   it isn't a `root.items` entry kind at all, SPEC.md §4.5).
 * - `ItemButton` and `ItemSwitch` in the *main content* (both fixtures only
 *   use plain links/labels there).
 * - An `ItemExpandable` with real multiple-choice options (each child a
 *   `control: "button"`, not a link) — "Theme: Light/Dark/System" — rather
 *   than a sub-navigation list.
 * - The same three (switch, expandable-with-options, button) *again* in the
 *   footer, via `showcaseFooterRoot` (`footerRoot`, not `footerItems`,
 *   since an expandable has no place in the closed `footerItems`
 *   vocabulary) — proving a footer's own items support exactly what a
 *   content group's do (SPEC.md §4.1, §4.3).
 */
export const Showcase: Story = {
  args: {
    applicationName: "Canonical",
    footerRoot: showcaseFooterRoot,
    children: (
      <>
        <SideNavigation.ContextSwitcher
          title="Context"
          currentContext={composedContexts[0]}
          contexts={composedContexts}
          onContextChange={fn()}
          onCreateContext={fn()}
        />
        <SideNavigation.Group label="Workspace">
          <SideNavigation.Item url="/overview" icon="status" active>
            Overview
          </SideNavigation.Item>
          <SideNavigation.ItemButton icon="restart" onClick={fn()}>
            Restart service
          </SideNavigation.ItemButton>
          <SideNavigation.ItemSwitch icon="warning" defaultChecked>
            Maintenance mode
          </SideNavigation.ItemSwitch>
        </SideNavigation.Group>
        <SideNavigation.Separator />
        <SideNavigation.Group label="Preferences">
          <SideNavigation.ItemExpandable heading="Theme" icon="dark-theme">
            <SideNavigation.ItemButton icon="light-theme" onClick={fn()}>
              Light
            </SideNavigation.ItemButton>
            <SideNavigation.ItemButton icon="dark-theme" onClick={fn()}>
              Dark
            </SideNavigation.ItemButton>
            <SideNavigation.ItemButton icon="system-theme" onClick={fn()}>
              System
            </SideNavigation.ItemButton>
          </SideNavigation.ItemExpandable>
        </SideNavigation.Group>
      </>
    ),
  },
};
