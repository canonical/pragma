<!-- @canonical/generator-ds 0.10.0-experimental.5 -->

<script lang="ts">
  import { setLogContext } from "./context.js";
  import type { LogProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds log";

  let {
    class: className,
    children,
    hideTimestamps = false,
    wrapLines = false,
    timeZone = "UTC",
    caption,
    ...rest
  }: LogProps = $props();

  setLogContext({
    get timeZone() {
      return timeZone;
    },
    get hideTimestamp() {
      return hideTimestamps;
    },
    get wrapLines() {
      return wrapLines;
    },
  });
</script>

<table class={[componentCssClassName, className]} {...rest}>
  {#if caption}
    <caption class="visually-hidden">{caption}</caption>
  {/if}

  <thead class="visually-hidden">
    <tr>
      <th scope="col" class="line-number">Line</th>
      {#if !hideTimestamps}
        <th scope="col" class="timestamp">Timestamp</th>
      {/if}
      <th scope="col" class="content">Content</th>
    </tr>
  </thead>

  <tbody>
    {@render children?.()}
  </tbody>
</table>

<!-- @component
`Log` is used to display log entries in a structured table format.

## Example Usage
```svelte
<Log>
  <Log.Line
    line={1}
    timestamp="2024-10-27T10:00:59.400Z"
  >
    Starting database connection...
  </Log.Line>
  <Log.Line
    id="line-2"
    timestamp="2024-10-27T10:05:12.300Z"
  >
    {#snippet line()}
      <Link href="#line-2" soft>2</Link>
    {/snippet}
    Database connection failed: Connection timed out
  </Log.Line>
</Log>
```
-->
