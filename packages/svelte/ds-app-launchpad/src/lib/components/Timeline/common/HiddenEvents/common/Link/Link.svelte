<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { Link } from "../../../../../Link/index.js";
  import type { LinkProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds timeline-hidden-events-link";

  let { class: className, ...rest }: LinkProps = $props();
</script>

<!-- A separate element instead of a pseudo-element on the link, so it doesn't get underlined on hover -->
<span class="{componentCssClassName}-separator" aria-hidden="true">•</span>
<Link class={[componentCssClassName, className]} {...rest} />
