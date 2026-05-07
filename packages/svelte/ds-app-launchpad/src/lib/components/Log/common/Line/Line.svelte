<!-- @canonical/generator-ds 0.10.0-experimental.5 -->
<script lang="ts" module>
  const defaultFormatter = new TimestampFormatter();
</script>

<script lang="ts">
  import { getLogContext } from "../../context.js";
  import type { LineProps } from "./types.js";
  import "./styles.css";
  import { TimestampFormatter } from "./utils/TimestampFormatter.js";

  const componentCssClassName = "ds log-line";

  let {
    class: className,
    line,
    timestamp,
    children,
    ...rest
  }: LineProps = $props();

  const logContext = getLogContext();

  function formatTimestamp(timestamp: Date) {
    return logContext.timestampFormatter
      ? logContext.timestampFormatter.format(timestamp)
      : defaultFormatter.format(timestamp, logContext.timeZone);
  }
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
    <!-- If timestamps are hidden globally, don't render the timestamp column at all -->
    <td class="timestamp">
      <!-- If only this particular line doesn't have a timestamp, render the cell, but leave it empty -->
      {#if timestamp !== undefined}
        {@const timestampDate = new Date(timestamp)}
        <time datetime={timestampDate.toISOString()}>
          {formatTimestamp(timestampDate)}
        </time>
      {/if}
    </td>
  {/if}
  <td class={["content", { wrap: logContext.wrapLines }]}
    >{@render children()}</td
  >
</tr>
