<script lang="ts">
  import { Content, Footer, Header } from "./common/index.js";
  import type { SideNavigationProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-navigation";

  let {
    class: className,
    brand,
    applicationName,
    root,
    footerRoot,
    currentUrl,
    expanded = $bindable(true),
    "aria-label": ariaLabel = "Main navigation",
    ...rest
  }: SideNavigationProps = $props();

  const contentId = $props.id();

  function handleToggle(): void {
    expanded = !expanded;
  }
</script>

<nav
  class={[componentCssClassName, className]}
  class:collapsed={!expanded}
  data-expanded={expanded}
  aria-label={ariaLabel}
  {...rest}
>
  <Header
    {brand}
    {applicationName}
    {expanded}
    onToggle={handleToggle}
    collapseControls={contentId}
  />
  {#if expanded && root}
    <Content id={contentId} {root} {currentUrl} />
  {/if}
  {#if footerRoot}
    <Footer root={footerRoot} {currentUrl} />
  {/if}
</nav>

<!-- @component
`SideNavigation` is an application's primary navigation — a full-height rail
rendered from a navigation item tree, with an optional collapsed (icon-only)
state. It has three regions: a required Header (brand + collapse toggle), a
Content region that grows to fill the remaining space and hides while
collapsed, and an optional Footer, pinned to the bottom and visible
(icon-only) even while collapsed.

`root`'s and `footerRoot`'s direct children are rendered as groups (an
optional heading over a list of items); a flat, ungrouped list is just one
group with no `label`. An item with its own `items` renders as an expandable
disclosure row; its `items` become subitems shown when expanded (one level
deep, per the spec).

Every item needs a `key` or `url` (`@canonical/utils`' `getItemId` resolves
it); navigable items render as plain `<a href>` — no router `Link` indirection
needed, SvelteKit progressively enhances native anchors on its own.

Arrow-key navigation is a WCAG-conformant enhancement layered on top of plain
top-to-bottom Tab order (every item stays independently Tab-focusable, per the
spec): Up/Down move across items at the SAME level only — within a group,
crossing to the next/previous group at the edges — never descending into a
level automatically. Left/Right and Enter are the only way to cross a level,
mirroring the spec's own "Enter expands and focuses the first child" rule.

`import { SideNavigation } from "@canonical/svelte-ds-app-wpe";`

## Example Usage
```svelte
<script lang="ts">
  let expanded = $state(true);
</script>

<SideNavigation
  bind:expanded
  currentUrl={page.url.pathname}
  root={{
    key: "root",
    items: [
      {
        key: "main",
        items: [
          { url: "/dashboard", label: "Dashboard" },
          {
            key: "settings",
            label: "Settings",
            items: [
              { url: "/settings/general", label: "General" },
              { url: "/settings/members", label: "Members" },
            ],
          },
        ],
      },
    ],
  }}
  footerRoot={{
    key: "footer",
    items: [{ key: "footer-group", items: [{ url: "/profile", label: "Profile" }] }],
  }}
>
  {#snippet brand({ expanded })}
    <a href="/" aria-label="Home">{expanded ? "Acme" : "A"}</a>
  {/snippet}
</SideNavigation>
```

@implements ds:apps.pattern.side-navigation
-->
