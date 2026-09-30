<script lang="ts">
  import type { FooterProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds card-footer";

  let { children, class: className, ...rest }: FooterProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children()}
</div>
