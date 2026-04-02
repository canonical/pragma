<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import type { BodyProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds dialog-content-body";

  let { class: className, children, ...rest }: BodyProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</div>
