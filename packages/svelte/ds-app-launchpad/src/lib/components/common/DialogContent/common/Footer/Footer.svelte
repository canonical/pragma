<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import type { FooterProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds dialog-content-footer";

  let { class: className, children, ...rest }: FooterProps = $props();
</script>

<footer class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</footer>
