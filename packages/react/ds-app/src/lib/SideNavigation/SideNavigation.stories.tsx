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
- The Footer owns actions: \`footerRoot\` (free-form \`label\` + optional
  \`icon\`/\`url\`/\`control\`/\`slot\`, plus depth-1 expandables). A
  toggle-style row composes \`ItemButton\` plus a \`slot\`.
- \`ItemExpandable\` is a native \`<details>\` disclosure; expanded, it opens
  inline. Collapsed (rail) mode hides Content, degrades the footer to
  icon-only, and turns expandables' sub-items into a floating popover on
  the inline-end — flipped above its trigger on viewport overflow where
  CSS anchor positioning is supported (\`position-try-fallbacks\`).
- \`GroupHeader\` is a semantic divider — no tooltip, no interactive story.`,
      },
    },
  },
  // withNavigationRouterProps injects currentUrl + LinkComponent from the
  // live router (self-contained: owns its RouterProvider, so decorator
  // order isn't load-bearing); withNavLayout frames it in a page grid.
  // Stories supply only data (root / footerRoot).
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
 * A certificate-user app (the spec's own example) — composed, not
 * special-cased: the consumer passes the `certificate` icon and omits the
 * logout item.
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
 * Below Vanilla's small breakpoint (the 24.04 spec §7): the collapse toggle
 * becomes a "Menu"/"Close menu" text button, the header keeps its normal
 * row layout, and the body goes fullscreen when open rather than a 240px
 * rail. A fixed narrow wrapper stands in for a small-viewport preview.
 * Mobile drill-down is out of scope — the 24.04 spec §10.18.
 */
export const Mobile: Story = {
  args: {
    applicationName: "MAAS",
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};

/**
 * A practical context-switcher demo — what neither the MAAS nor LXD
 * fixtures exercise, in one screen:
 *
 * - The ContextSwitcher region (typed props slot, outside the `<nav>`
 *   landmark) with LXD's real project list: url'd contexts ride through
 *   `onContextChange` (selecting one navigates the hash router), plus a
 *   "create context" action.
 * - A plain-label content row and both `ItemExpandable` flavors: url
 *   links and plain labels.
 * - The footer's full row vocabulary: a plain link, a depth-1
 *   `ExpandableFooterItem` (disclosing into the inline-end popover when
 *   collapsed), and the Footer-only button row (`control: "button"`).
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
