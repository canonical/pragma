<script lang="ts">
  import { cssControlledFade } from "../../transistions/cssControlledFade.js";
  import "./styles.css";
  import type { SideNavigationProps } from "./types.js";

  const componentCssClassName = "ds side-navigation";

  let {
    class: className,
    children,
    logo,
    footer,
    expandToggle,
    expanded = true,
    ...rest
  }: SideNavigationProps = $props();

  const navId = $props.id();

  // We need to track if expanded has changed from its initial value to avoid animating on first render
  let expandedChanged = $state(false);
  // svelte-ignore state_referenced_locally
  const initialExpanded = expanded;
  $effect.pre(() => {
    if (expanded !== initialExpanded) expandedChanged = true;
  });
</script>

<header
  class={[componentCssClassName, className]}
  class:collapsed={!expanded}
  class:expanded-changed={expandedChanged}
  {...rest}
>
  <div class="logo">
    {@render logo()}
  </div>
  {@render expandToggle?.({
    "aria-expanded": expanded,
    "aria-controls": navId,
    "aria-label": expanded ? "Collapse navigation" : "Expand navigation",
  })}
  {#if expanded}
    <nav
      id={navId}
      transition:cssControlledFade={{
        durationVar: "--transition-duration-side-navigation",
        easingVar: "--transition-easing-side-navigation",
      }}
    >
      {@render children?.()}
    </nav>
  {/if}
  {#if footer}
    <div class="footer">
      {@render footer()}
    </div>
  {/if}
</header>

<!-- @component
`SideNavigation` is the primary navigation component containing links to navigate between different sections of an application. The component can be expanded or collapsed (depending on the `expanded` prop).

The component has two sections:
- main navigation area (children) - it is hidden when component is collapsed;
- footer area (footer) - if component is collapsed, only icons are shown.

## Example Usage
```svelte
<script lang="ts">
  let expanded = $state(true);
</script>

<SideNavigation {expanded}>
  {#snippet logo()}
    <a href="/" aria-label="Home">
      <Logo />
    </a>
  {/snippet}
  {#snippet expandToggle(toggleProps)}
    <SideNavigation.ExpandToggle
      {...toggleProps}
      onclick={() => (expanded = !expanded)}
    />
  {/snippet}
  <SideNavigation.NavigationItem href="/dashboard">
    {#snippet icon()}
      <Dashboard />
    {/snippet}
    Dashboard
  </SideNavigation.NavigationItem>
  <SideNavigation.NavigationItem href="/projects">
    {#snippet icon()}
      <Folder />
    {/snippet}
    Projects
  </SideNavigation.NavigationItem>
  {#snippet footer()}
    <SideNavigation.NavigationItem onclick={doSomething}>
      {#snippet icon()}
        <ColorPalette />
      {/snippet}
      Theme
    </SideNavigation.NavigationItem>
    <SideNavigation.NavigationItem href="/profile">
      {#snippet icon()}
        <User />
      {/snippet}
      John Doe
    </SideNavigation.NavigationItem>
    <SideNavigation.NavigationItem onclick={doSomethingElse}>
      {#snippet icon()}
        <LogOut />
      {/snippet}
      Logout
    </SideNavigation.NavigationItem>
  {/snippet}
</SideNavigation>
```
-->
