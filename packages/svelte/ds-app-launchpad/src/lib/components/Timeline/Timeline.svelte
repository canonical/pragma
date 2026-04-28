<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import type { TimelineProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds timeline";

  let { class: className, children, ...rest }: TimelineProps = $props();
</script>

<ol class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</ol>

<!-- @component
`Timeline` component represents a vertical timeline that displays a series of events in chronological order.

## Example Usage
```svelte
<Timeline>
  <Timeline.Event marker={{userName: "Alvarez Daniella"}} markerSize="large">
    {#snippet titleRow()}
      <Timeline.Event.TitleRow leadingText="Alvarez Daniella">
        did some cool stuff
        {#snippet date()}
          <DateTime date="2023-03-15" />
        {/snippet}
      </Timeline.Event.TitleRow>
    {/snippet}
    Description of the stuff that was done.
  </Timeline.Event>
  <Timeline.Event>
    {#snippet marker()}
      <StarredIcon />
    {/snippet}
    {#snippet titleRow()}
      <Timeline.Event.TitleRow leadingText="Alvarez Daniella">
        did other amazing things
        {#snippet date()}
          <DateTime date="2023-03-15" />
        {/snippet}
      </Timeline.Event.TitleRow>
    {/snippet}
  </Timeline.Event>
  <Timeline.HiddenEvents numHidden={3}>
    <Timeline.HiddenEvents.Link href="?show-all">Show all</Timeline.HiddenEvents.Link>
  </Timeline.HiddenEvents>
</Timeline>
```
-->
