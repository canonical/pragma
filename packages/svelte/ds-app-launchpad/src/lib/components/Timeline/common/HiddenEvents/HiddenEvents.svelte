<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import "./styles.css";
  import type { HiddenEventsProps } from "./types.js";

  const componentCssClassName = "ds timeline-hidden-events";

  let {
    class: className,
    children,
    numHidden,
    ...rest
  }: HiddenEventsProps = $props();
</script>

<li class={[componentCssClassName, className]} {...rest}>
  <div>
    <span>
      {numHidden} hidden
    </span>
    {@render children?.()}
  </div>
</li>
