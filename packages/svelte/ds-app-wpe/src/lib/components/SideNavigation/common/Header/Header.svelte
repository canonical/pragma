<script lang="ts">
  import { CollapseToggle } from "../CollapseToggle/index.js";
  import type { HeaderProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-navigation-header";

  let {
    class: className,
    brand,
    applicationName,
    expanded,
    onToggle,
    collapseControls,
    ...rest
  }: HeaderProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {#if brand}
    <div class="brand">{@render brand({ expanded })}</div>
  {/if}
  {#if applicationName}
    <span class="title p">{@render applicationName()}</span>
  {/if}
  <CollapseToggle
    {expanded}
    aria-controls={collapseControls}
    onclick={onToggle}
  />
</div>

<!-- @component
`SideNavigation.Header` — top region holding the brand (at the start) and the
collapse toggle (at the end). Not meant to be used standalone — rendered
internally by `SideNavigation`.
-->
