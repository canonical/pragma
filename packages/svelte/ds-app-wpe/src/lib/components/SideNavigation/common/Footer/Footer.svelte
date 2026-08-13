<script lang="ts">
  import { NavTree } from "../NavTree/index.js";
  import type { FooterProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds footer";

  let { root, currentUrl, class: className, ...rest }: FooterProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  <NavTree {root} {currentUrl} />
</div>

<!-- @component
`SideNavigation.Footer` — optional region pinned to the bottom, for
account-level or global actions. Drives its own `NavTree` over its `root`,
independent of Content. Stays visible (icon-only) while the rail is
collapsed — see the root `styles.css` for the collapsed-state label fade.
-->
