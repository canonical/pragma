<script lang="ts">
  import type { ImageProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds card-image";

  let { class: className, ...rest }: ImageProps = $props();
</script>

<img class={[componentCssClassName, className]} {...rest} />
