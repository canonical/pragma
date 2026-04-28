<!-- @canonical/generator-ds 0.10.0-experimental.5 -->

<script lang="ts">
  import { getTHContext } from "../../context.js";
  import type { SortButtonProps } from "./types.js";
  import "./styles.css";
  import { ArrowDownIcon, ArrowUpIcon } from "@canonical/svelte-icons";
  import { ButtonPrimitive } from "../../../../../common/index.js";
  import { SortIcon } from "../../../../../icons/index.js";

  const componentCssClassName = "ds table-th-sort";

  let { class: className, ...rest }: SortButtonProps = $props();

  const thContext = getTHContext();
  const sortDirection = $derived(thContext.sortDirection);
</script>

<ButtonPrimitive
  class={[
    componentCssClassName,
    className,
    {
      sorted: sortDirection && sortDirection !== "none",
    },
  ]}
  {...rest}
>
  {#if sortDirection === "ascending"}
    <ArrowUpIcon aria-hidden="true" />
  {:else if sortDirection === "descending"}
    <ArrowDownIcon aria-hidden="true" />
  {:else}
    <SortIcon aria-hidden="true" />
  {/if}
</ButtonPrimitive>
