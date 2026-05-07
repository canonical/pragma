<!-- @canonical/generator-ds 0.10.0-experimental.5 -->

<script lang="ts">
  import { getLogContext } from "../../context.js";
  import type { LineProps } from "./types.js";
  import { formatTimestamp } from "./utils/formatTimestamp.js";
  import "./styles.css";

  const componentCssClassName = "ds log-line";

  let {
    class: className,
    line,
    timestamp,
    children,
    ...rest
  }: LineProps = $props();

  const logContext = getLogContext();

  const timestampDate = $derived(new Date(timestamp));

  const formattedTimestamp = $derived(
    formatTimestamp(timestampDate, logContext.timeZone),
  );
</script>

<tr class={[componentCssClassName, className]} {...rest}>
  <th class="line-number" scope="row">
    {#if typeof line === "number"}
      {line}
    {:else}
      {@render line()}
    {/if}
  </th>
  {#if !logContext.hideTimestamps}
    <td class="timestamp">
      <time datetime={timestampDate.toISOString()}>{formattedTimestamp}</time>
    </td>
  {/if}
  <td class={["content", { wrap: logContext.wrapLines }]}
    >{@render children()}</td
  >
</tr>
