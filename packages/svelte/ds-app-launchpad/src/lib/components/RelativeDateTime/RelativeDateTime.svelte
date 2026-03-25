<!-- @canonical/generator-ds 0.17.1 -->

<script lang="ts">
  import type {
    RelativeDateTimeProps,
    RelativeTimeFormatValue,
  } from "./types.js";
  import {
    dateTimeFormatter,
    relativeTimeFormatter,
  } from "./utils/formatters.js";
  import { getOptimalRelativeTimeFormatValue } from "./utils/getOptimalRelativeTimeFormatValue.js";

  let {
    date: dateProp,
    nowThreshold = 60_000,
    nowLabel = "now",
    ...rest
  }: RelativeDateTimeProps = $props();

  const date = $derived(new Date(dateProp));

  const isOutsideThreshold = (elapsed: number) =>
    Math.abs(elapsed) >= nowThreshold;

  // We intentionally capture only the initial `rtfValue` here, and then update it in an effect below. If `date` changes, the effect will re-run and update `rtfValue` accordingly.
  // Capturing the initial value here avoids flashing incorrect content during SSR.
  // svelte-ignore state_referenced_locally
  const initialElapsed = date.getTime() - Date.now();
  let rtfValue = $state<RelativeTimeFormatValue | null>(
    isOutsideThreshold(initialElapsed)
      ? getOptimalRelativeTimeFormatValue(initialElapsed)
      : null,
  );

  const display = $derived.by(() => {
    if (!rtfValue) return nowLabel;
    return relativeTimeFormatter.format(rtfValue.value, rtfValue.unit);
  });

  /**
   * Periodically recalculates `rtfValue` based on the current time, scheduling
   * the next update at the interval most appropriate for the current magnitude
   * of elapsed time. Cleans up the timeout on teardown.
   */
  $effect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const newElapsed = date.getTime() - Date.now();
      if (isOutsideThreshold(newElapsed)) {
        const { nextUpdateIn, ...newRtfValue } =
          getOptimalRelativeTimeFormatValue(newElapsed);
        rtfValue = newRtfValue;
        timeout = setTimeout(tick, nextUpdateIn);
      } else {
        rtfValue = null;
        timeout = setTimeout(tick, nowThreshold - Math.abs(newElapsed));
      }
    };

    tick();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  });
</script>

<time
  datetime={date.toISOString()}
  title={dateTimeFormatter.format(date)}
  {...rest}
>
  {display}
</time>

<!-- @component
`RelativeDateTime` component formats and displays dates and times in a user-friendly relative format, automatically updating the display as time passes.

## Example Usage
```svelte
<RelativeDateTime date={new Date()} />
<RelativeDateTime date="2023-10-01T12:00:00Z" nowThreshold={120_000} nowLabel="just now" /> 
```
-->
