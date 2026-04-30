<script lang="ts" module>
  // biome-ignore lint/style/useExportType: snippets are runtime values, not types
  export { children, expandToggle, footer, logo };
</script>

<script lang="ts">
  import {
    HighlightOffIcon,
    HomeIcon,
    SettingsIcon,
    UserIcon,
  } from "@canonical/svelte-icons";
  import { ExpandToggle, NavigationItem } from "./common/index.js";
  import type { SideNavigationExpandToggleProps } from "./index.js";
</script>

{#snippet logo()}
  <a href="/" aria-label="Logo link">Logo link</a>
{/snippet}

{#snippet expandToggle(toggleProps: SideNavigationExpandToggleProps)}
  <ExpandToggle {...toggleProps} />
{/snippet}

{#snippet children()}
  <NavigationItem href="/">
    Link in nav
    {#snippet icon()}
      <HomeIcon />
    {/snippet}
  </NavigationItem>
  <NavigationItem>
    Button in nav
    {#snippet icon()}
      <SettingsIcon />
    {/snippet}
  </NavigationItem>
{/snippet}

{#snippet footer()}
  <NavigationItem>
    Button in footer
    {#snippet icon()}
      <HighlightOffIcon />
    {/snippet}
  </NavigationItem>
  <NavigationItem href="/profile">
    Link in footer
    {#snippet icon()}
      <UserIcon />
    {/snippet}
  </NavigationItem>
{/snippet}
