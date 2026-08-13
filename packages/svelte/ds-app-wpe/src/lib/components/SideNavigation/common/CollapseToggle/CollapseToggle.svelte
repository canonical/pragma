<script lang="ts">
  import type { CollapseToggleProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-navigation-collapse-toggle";

  let {
    class: className,
    expanded = true,
    "aria-label": ariaLabel,
    ...rest
  }: CollapseToggleProps = $props();
</script>

<button
  type="button"
  class={[componentCssClassName, className]}
  aria-expanded={expanded}
  aria-label={ariaLabel ??
    (expanded ? "Collapse navigation" : "Expand navigation")}
  {...rest}
>
  <svg class="chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M10 3L5 8l5 5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<!-- @component
`SideNavigation.CollapseToggle` — icon-only button that expands or collapses
the navigation rail. Carries the disclosure ARIA contract: `aria-expanded`
reflects the current state; pass `aria-controls` pointing at the id of the
region it toggles.
-->
