<!-- @canonical/generator-ds 0.17.1 -->

<script lang="ts">
  import type { DateTimeProps } from "./types.js";
  import { defaultDateTimeFormatter } from "./utils/formatters.js";

  let {
    date: dateProp,
    formatter = defaultDateTimeFormatter,
    ...rest
  }: DateTimeProps = $props();

  const date = $derived(new Date(dateProp));
</script>

<time datetime={date.toISOString()} {...rest}>
  {formatter.format(date)}
</time>

<!-- @component
`DateTime` component formats and displays dates and times.

## defaultDateTimeFormatter
```svelte
<DateTime date={new Date()} />
<DateTime date="2023-10-01T12:00:00Z" /> 
```
-->
