<script lang="ts">
  import { NavTree } from "../NavTree/index.js";
  import type { ContentProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds content";

  let { root, currentUrl, class: className, ...rest }: ContentProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  <NavTree {root} {currentUrl} />
</div>

<!-- @component
`SideNavigation.Content` — the main navigation region. Renders the direct
children of its `root` (as groups) via `NavTree`. Not meant to be used
standalone — rendered internally by `SideNavigation`.
-->
