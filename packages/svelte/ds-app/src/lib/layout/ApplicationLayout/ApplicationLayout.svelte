<!-- Ported from @canonical/react-ds-app ApplicationLayout -->

<!--
@component
ApplicationLayout — the application shell.

Divides the viewport between a leading navigation rail (named slot,
`min-content`) and the main content area (default slot, `1fr`), per the
ontology instance `apps.layout.application_layout`.

@example
```svelte
<ApplicationLayout>
  {#snippet navigation()}
    <SideNavigation />
  {/snippet}
  <ViewLayout>
    <ContentLayout>
      <Card />
    </ContentLayout>
  </ViewLayout>
</ApplicationLayout>
```
-->

<script lang="ts">
  import type { ApplicationLayoutProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds application-layout";

  let {
    class: className,
    children,
    navigation,
    ...rest
  }: ApplicationLayoutProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
	{#if navigation}
		<div class="navigation">{@render navigation()}</div>
	{/if}
	<div class="content">{@render children?.()}</div>
</div>
