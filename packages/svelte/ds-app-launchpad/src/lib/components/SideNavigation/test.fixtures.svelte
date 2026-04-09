<script lang="ts" module>
  export { children, expandToggle, footer, logo };
</script>

<script lang="ts">
  import { HomeIcon, SettingsIcon, UserIcon } from "@canonical/svelte-icons";
  import { ColorPaletteIcon } from "../icons/index.js";
  import { ExpandToggle, NavigationItem } from "./common/index.js";
  import type { ExpandToggleProps } from "./types.js";
</script>

{#snippet logo()}
  <a href="/" aria-label="Logo link">Logo link</a>
{/snippet}

{#snippet expandToggle(toggleProps: ExpandToggleProps)}
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
      <ColorPaletteIcon />
    {/snippet}
  </NavigationItem>
  <NavigationItem href="/profile">
    Link in footer
    {#snippet icon()}
      <UserIcon />
    {/snippet}
  </NavigationItem>
{/snippet}
