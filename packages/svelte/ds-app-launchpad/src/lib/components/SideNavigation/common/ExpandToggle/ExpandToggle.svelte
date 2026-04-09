<script lang="ts">
  import { ButtonPrimitive } from "../../../common/ButtonPrimitive/index.js";
  import { ExpandRightIcon } from "../../../icons/index.js";
  import "./styles.css";
  import type { ExpandToggleProps } from "./types.js";

  const componentCssClassName = "ds side-navigation-expand-toggle";

  let { class: className, ...rest }: ExpandToggleProps = $props();
</script>

<ButtonPrimitive class={[componentCssClassName, className]} {...rest}>
  <ExpandRightIcon class="expand-icon" />
</ButtonPrimitive>
