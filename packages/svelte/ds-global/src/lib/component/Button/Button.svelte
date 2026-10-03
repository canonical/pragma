<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { Spinner } from "../../subcomponent/Spinner/index.js";
  import type { ButtonProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds button";

  let {
    class: className,
    children,
    importance = "primary",
    anticipation,
    emphasis,
    variant,
    icon,
    loading,
    loadingLabel = "Loading",
    disabled,
    onclick,
    ...rest
  }: ButtonProps = $props();

  const hasVisibleChildren = $derived(children != null);

  // A loading button stays focusable (a natively disabled button would drop
  // keyboard focus to the document) and is instead marked aria-disabled, with
  // activation blocked here.
  const isBlocked = $derived(loading === true && !disabled);

  // The status region is rendered whenever the consumer controls `loading`,
  // so it exists before its text changes; live regions inserted together with
  // their content are not reliably announced.
  const hasLoadingStatus = $derived(loading !== undefined);

  // Blocks activation while loading: preventDefault stops a form submission
  // and stopImmediatePropagation stops listeners attached after this one.
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onclick?.(event);
  };
</script>

<!--
  The icon and label stay in the DOM while loading to avoid layout shifts.
-->
<button
  class={[
    componentCssClassName,
    importance,
    anticipation,
    emphasis,
    variant,
    loading && "loading",
    className,
  ]}
  aria-busy={loading || undefined}
  aria-disabled={isBlocked || undefined}
  {disabled}
  {...rest}
  onclick={handleClick}
>
  <!--
    # TODO: Update Icon to use Svelte Icon
    # currently blocked by: https://warthogs.atlassian.net/browse/WPE-430
    # and https://github.com/canonical/pragma-web/pull/959
  -->
  {#if icon}
    <span class="icon">
      {@render icon()}
    </span>
  {/if}
  {#if hasVisibleChildren}
    <span class="label">
      {@render children?.()}
    </span>
  {/if}
  {#if loading}
    <span class="loading-spinner" aria-hidden="true">
      <Spinner />
    </span>
  {/if}
</button>
<!--
  The status region sits outside the button: a button's descendants are
  presentational, so a live region inside it is not reliably announced.
-->
{#if hasLoadingStatus}
  <span class="ds button-loading-status" role="status">
    {loading ? loadingLabel : ""}
  </span>
{/if}

<!-- @component
Buttons trigger actions within an interface, typically involving data
transformation or manipulation. They provide clear visual indicators of
the primary actions users can perform on a page or section.

`import { Button } from "@canonical/svelte-ds-global";`

## Example Usage
```svelte
<Button importance="primary" anticipation="constructive">
  Save changes
</Button>
```

@implements ds:global.component.button
-->
