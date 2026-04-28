<!-- @canonical/generator-ds 0.17.1 -->

<script lang="ts" module>
  import { ChainingManager } from "./utils/ChainingManager.js";

  const chainingManager = new ChainingManager(350);
</script>

<script lang="ts">
  import type { Attachment } from "svelte/attachments";
  import { createAttachmentKey } from "svelte/attachments";
  import { isEventTargetInElement } from "../../utils/index.js";
  import "./styles.css";
  import type { TooltipProps } from "./types.js";
  import { useDelayedOpen } from "./utils/useDelayedOpen.svelte.js";
  import { useTooltipPosition } from "./utils/useTooltipPosition.svelte.js";

  const componentCssClassName = "ds tooltip";
  const distanceToTrigger = 12; // px

  let {
    id: idProp,
    class: className,
    children,
    trigger,
    position = "block-start",
    autoAdjust = true,
    delay = 350,
    onmouseleave,
    onmouseenter,
    ...rest
  }: TooltipProps = $props();

  const fallbackId = $props.id();
  const id = $derived(idProp || fallbackId);
  let tooltipRef = $state<HTMLElement>();
  let triggerRef = $state<HTMLElement>();

  let isTriggerFocused = $state(false);
  let isTriggerHovered = $state(false);
  let isTooltipHovered = $state(false);
  const open = $derived(
    isTriggerFocused || isTriggerHovered || isTooltipHovered,
  );

  const listenersTriggerAttachment: Attachment<HTMLElement> = (element) => {
    triggerRef = element;
    const abortController = new AbortController();
    element.addEventListener("mouseenter", () => (isTriggerHovered = true), {
      signal: abortController.signal,
    });
    element.addEventListener(
      "mouseleave",
      (e) => {
        // Check if hover moved to the tooltip, to avoid any flicker before `mouseenter` on the tooltip is fired and handled
        if (isEventTargetInElement(e.relatedTarget, tooltipRef)) {
          isTooltipHovered = true;
        }
        isTriggerHovered = false;
      },
      { signal: abortController.signal },
    );
    element.addEventListener("focus", () => (isTriggerFocused = true), {
      signal: abortController.signal,
    });
    element.addEventListener("blur", () => (isTriggerFocused = false), {
      signal: abortController.signal,
    });
    return () => {
      triggerRef = undefined;
      abortController.abort();
      isTriggerHovered = false;
      isTriggerFocused = false;
    };
  };

  const tooltipOnmouseenter: typeof onmouseenter = (e) => {
    onmouseenter?.(e);
    isTooltipHovered = true;
  };

  const tooltipOnmouseleave: typeof onmouseleave = (e) => {
    onmouseleave?.(e);
    // Check if hover moved to the trigger, to avoid any flicker before `mouseenter` on the trigger is fired and handled
    if (isEventTargetInElement(e.relatedTarget, triggerRef))
      isTriggerHovered = true;
    isTooltipHovered = false;
  };

  const {
    triggerAttachment: tooltipPositionTriggerAttachment,
    targetAttachment,
    tooltipPosition,
    getTooltipPlacement,
  } = useTooltipPosition(
    // Start positioning even before the tooltip is actually shown (`delayedOpen`)
    () => open,
    () => position,
    () => autoAdjust,
    distanceToTrigger,
  );

  const getDelayedOpen = useDelayedOpen(
    () => open,
    () => delay,
    chainingManager,
  );
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") {
      // If escape is pressed, close the tooltip no matter what caused it to open
      isTriggerFocused = false;
      isTriggerHovered = false;
      isTooltipHovered = false;
    }
  }}
/>

{@render trigger({
  "aria-describedby": id,
  [createAttachmentKey()]: tooltipPositionTriggerAttachment,
  [createAttachmentKey()]: listenersTriggerAttachment,
})}

<div
  bind:this={tooltipRef}
  {id}
  role="tooltip"
  class={[componentCssClassName, className]}
  style:display={open /* Flip to block immediately, so it can be positioned even before shown */
    ? "block"
    : "none"}
  style:visibility={getDelayedOpen() ? "visible" : "hidden"}
  {@attach targetAttachment}
  style:top={tooltipPosition.top}
  style:left={tooltipPosition.left}
  style:--distance-to-trigger={`${distanceToTrigger}px`}
  data-placement={getTooltipPlacement()}
  onmouseenter={tooltipOnmouseenter}
  onmouseleave={tooltipOnmouseleave}
  {...rest}
>
  {@render children()}
</div>

<!-- @component
`Tooltip` are non-interactive elements that aim to provide additional information about a specific element or action.

Tooltip requires JavaScript to function correctly. If JavaScript is disabled, the tooltip content will not be accessible.
TODO(no-js): Investigate how to handle tooltips without JavaScript.

The tooltip enables a short "chaining" window (~350ms) after it closes. If any tooltip's trigger is hovered or focused within this window, the tooltip bypasses `delay` and opens immediately.

## Example Usage
```svelte
<Tooltip position="block-start" delay={500} autoAdjust={true}>
  {#snippet trigger(triggerProps)}
    <Button {...triggerProps}>Hover or focus me</Button>
  {/snippet}
  I am a tooltip!
</Tooltip>
```
-->
