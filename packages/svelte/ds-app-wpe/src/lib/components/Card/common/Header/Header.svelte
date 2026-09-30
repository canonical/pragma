<script lang="ts">
  import type { HeaderProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds card-header";

  let { children, class: className, ...rest }: HeaderProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children()}
</div>
