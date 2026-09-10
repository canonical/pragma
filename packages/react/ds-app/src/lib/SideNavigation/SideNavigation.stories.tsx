import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  contextSwitcherContentRoot,
  contextSwitcherFooterRoot,
  lxdContentRoot,
  lxdFooterRoot,
  lxdProjectContexts,
  maasContentRoot,
  maasFooterRoot,
} from "../../storybook/navigation/fixtures.js";
import {
  CanonicalLogo,
  navDecorators,
  withNavigationRouterProps,
  withNavLayout,
} from "../../storybook/navigation/story-utils.js";
import SideNavigation from "./SideNavigation.js";

const meta: Meta<typeof SideNavigation> = {
  title: "Components/SideNavigation",
  component: SideNavigation,
  tags: ["autodocs"],
  // Anatomy & usage — surfaced on the Storybook docs page alongside the
  // autodocs props table. Full spec: ./SPEC.md.
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `A full-height application sidebar in four regions: Header
(branding, collapse toggle), ContextSwitcher (optional — a select-like
widget in its own region between Header and Content, outside the
landmark), Content (the navigation landmark), Footer (user profile,
settings, non-navigational actions).

**Consumption pattern.** Data-driven only: pass data props and all four
regions build. All subcomponents are private — no dot-static exports — and
render exclusively from data.

**Anatomy.** The root is a plain \`<div>\` — not a landmark. Content renders
the component's single \`<nav>\` landmark (\`aria-label\` defaults to
"Main navigation"), so screen readers announce exactly one navigation region.
A visually hidden **"Skip to main content"** link is the first focusable
element in the DOM, letting keyboard users bypass the navigation block
(target configurable via \`skipTo\`, default \`#main-content\`).

**Where to use.** Application-level, full-height navigation — the primary
sidebar of a shell layout (MAAS, LXD). Not for in-page or secondary section
nav; use \`<nav>\` directly or Breadcrumbs there.

**When & why the rules are strict.**
- Content accepts **links and expandable items only**. \`<button>\` rows are
  reserved for the Footer — assistive technology must never conflate
  "navigate here" with "do this action" inside the navigation landmark.
- The Footer owns actions: \`footerRoot\` (free-form:
  \`label\` + optional \`icon\`/\`url\`/\`control\`/\`slot\`, plus
  depth-1 expandables). A toggle-style row is composed with \`ItemButton\`
  plus a \`slot\`.
- \`ItemExpandable\` is a native \`<details>\` disclosure; expanded, it opens
  inline. Collapsed (rail) mode hides Content, degrades the footer to
  icon-only, and turns any rendered expandable's sub-items into a floating
  popover on the inline-end with visible labels. Where CSS anchor
  positioning is supported, the popover flips above its trigger on
  viewport overflow (\`position-try-fallbacks\`); otherwise it stays
  top-anchored.
- \`GroupHeader\` is a semantic divider — no tooltip, no
  interactive story.`,
      },
    },
  },
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
 * A certificate-user app (the spec's own example: "If the application
 * allows for a certificate user (like LXD)") — composed, not special-cased:
 * the consumer passes the `certificate` icon and omits the logout item.
 */
export const CertificateUser: Story = {
  args: {
    applicationName: "LXD",
    root: lxdContentRoot,
    footerRoot: {
      key: "certificate-user-footer",
      items: [
        {
          label: "admin",
          icon: "certificate",
          url: "/ui/settings/account",
        },
      ],
    },
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
};

/**
 * A practical context-switcher demo (everything neither MAAS nor LXD's own
 * fixtures exercise, in one screen):
 *
 * - The ContextSwitcher region (typed props slot, rendered between Header
 *   and Content, outside the `<nav>` landmark) with LXD's real project
 *   list: url'd contexts ride through `onContextChange` — selecting one in
 *   the story navigates the hash router — plus a "create context" action.
 * - A plain-label content row (content rows are links or labels — nothing
 *   else), and both `ItemExpandable` flavors side by side: url links
 *   (external documentation resources) and plain labels (a non-navigable
 *   appearance picker).
 * - The footer's full row vocabulary through `footerRoot` data: a plain
 *   link, a depth-1 `ExpandableFooterItem` (the theme picker — collapsed,
 *   its sub-items disclose into the inline-end popover), and the
 *   Footer-only button row (`control: "button"`).
 */
export const WithContextSwitcher: Story = {
  name: "with ContextSwitcher",
  args: {
    applicationName: "Canonical",
    contextSwitcher: {
      title: "Project",
      currentContext: lxdProjectContexts[0],
      contexts: lxdProjectContexts,
      onContextChange: (context) => {
        if (context.url) window.location.hash = context.url;
      },
      onCreateContext: fn(),
    },
    root: contextSwitcherContentRoot,
    footerRoot: contextSwitcherFooterRoot,
  },
};
