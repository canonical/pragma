<script lang="ts">
  import type { ContentProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds card-content";

  let { children, class: className, ...rest }: ContentProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children()}
</div>
