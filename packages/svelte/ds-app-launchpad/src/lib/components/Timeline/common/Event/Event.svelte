<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { UserAvatar } from "../../../UserAvatar/index.js";
  import type { EventProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds timeline-event";

  let {
    class: className,
    children,
    marker,
    markerSize = "small",
    titleRow,
    ...rest
  }: EventProps = $props();
</script>

<li
  class={[
    componentCssClassName,
    className,
    marker === undefined
      ? "marker-empty"
      : markerSize === "small"
        ? "marker-small"
        : "marker-large",
    { "with-title-row": titleRow },
  ]}
  {...rest}
>
  <div class="marker" aria-hidden="true">
    {#if typeof marker === "function"}
      {@render marker()}
    {:else if marker}
      <UserAvatar {...marker} />
    {/if}
  </div>
  {#if children || titleRow}
    <div class="content">
      {#if titleRow}
        <div class="title-row">
          {@render titleRow?.()}
        </div>
      {/if}
      {#if children}
        <div>
          {@render children()}
        </div>
      {/if}
    </div>
  {/if}
</li>
