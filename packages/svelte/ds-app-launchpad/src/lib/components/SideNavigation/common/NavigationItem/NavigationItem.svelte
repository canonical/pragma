<script lang="ts">
  import { ButtonPrimitive } from "../../../common/ButtonPrimitive/index.js";
  import "./styles.css";
  import type { NavigationItemProps } from "./types.js";

  const componentCssClassName = "ds navigation-item";

  let {
    class: className,
    children,
    icon,
    selected,
    ...rest
  }: NavigationItemProps = $props();

  const labelId = $props.id();
</script>

<ButtonPrimitive
  class={[componentCssClassName, className, { selected }]}
  aria-labelledby={labelId}
  {...rest}
>
  {#if icon}
    <div class="icon">
      {@render icon()}
    </div>
  {/if}
  <!-- using labeled-by exposes the contents to a11y tree even if the label is visually hidden -->
  <div id={labelId} class="label">
    {@render children()}
  </div>
</ButtonPrimitive>
