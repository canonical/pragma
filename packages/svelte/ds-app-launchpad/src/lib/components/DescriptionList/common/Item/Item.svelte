<!-- @canonical/generator-ds 0.17.1 -->

<script lang="ts">
  import { getDescriptionListContext } from "../../context.js";
  import "./styles.css";
  import type { ItemProps } from "./types.js";

  const componentCssClassName = "ds description-list-item";

  let { class: className, name, children, ...rest }: ItemProps = $props();

  const descriptionListContext = getDescriptionListContext();
</script>

<div
  class={[componentCssClassName, className, descriptionListContext.layout]}
  {...rest}
>
  <dt>{name}</dt>
  <dd>{@render children()}</dd>
</div>
