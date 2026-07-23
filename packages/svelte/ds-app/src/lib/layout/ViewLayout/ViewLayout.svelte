<!-- Ported from @canonical/react-ds-app ViewLayout -->

<!--
@component
ViewLayout — a single view within the application shell.

Divides its space between the view content (default slot, `1fr`) and an
optional contextual aside (named slot, `min-content`), per the ontology
instance `apps.layout.view_layout`.

@example
```svelte
<ViewLayout>
  {#snippet aside()}
    <RelatedLinks />
  {/snippet}
  <ContentLayout>
    <Card />
  </ContentLayout>
</ViewLayout>
```
-->

<script lang="ts">
  import type { ViewLayoutProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds view-layout";

  let {
    class: className,
    children,
    aside,
    ...rest
  }: ViewLayoutProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
	<div class="content">{@render children?.()}</div>
	{#if aside}
		<div class="aside">{@render aside()}</div>
	{/if}
</div>
