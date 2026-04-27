<script lang="ts">
  import { SearchIcon } from "@canonical/svelte-icons";
  import { ButtonPrimitive } from "../../../common/index.js";
  import type { SearchButtonProps } from "./types.js";
  import "./styles.css";
  import { getSearchBoxContext } from "../../context.js";

  const componentCssClassName = "ds search-box-search-button";

  let {
    class: className,
    type = "submit",
    disabled,
    "aria-label": ariaLabel,
    ...rest
  }: SearchButtonProps = $props();

  const searchBoxContext = getSearchBoxContext();
</script>

<ButtonPrimitive
  {type}
  class={[componentCssClassName, className]}
  disabled={disabled !== undefined ? disabled : searchBoxContext.disabled}
  aria-label={ariaLabel !== undefined
    ? ariaLabel
    : searchBoxContext["aria-label"]}
  {...rest}
>
  <SearchIcon />
</ButtonPrimitive>
