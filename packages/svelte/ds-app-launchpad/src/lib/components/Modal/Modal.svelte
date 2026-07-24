<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { useIsMounted } from "../../useFunctions/index.js";
  import { isEventTargetInElement } from "../../utils/index.js";
  import type { ModalProps } from "./types.js";
  import "./styles.css";

  const componentCssClassNameBase = "modal";
  const componentCssClassName = `ds ${componentCssClassNameBase}`;
  const componentCssClassNameNonModalBackdrop = `ds ${componentCssClassNameBase}-non-modal-backdrop`;

  let {
    id: idProp,
    class: className,
    trigger,
    children,
    closeOnOutsideClick = true,
    onclick,
    ontoggle: ontoggleProp,
    open = $bindable(),
    ...rest
  }: ModalProps = $props();

  const fallbackId = $props.id();
  const id = $derived(idProp || fallbackId);

  const isMounted = useIsMounted();

  // Webkit doesn't support `closedby` attribute on dialog elements (https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy).
  // TODO(closedby): Remove this fallback when Webkit supports it.
  let contentWrapperRef = $state<HTMLElement>();

  const isClosedByFallbackNeeded = $derived(
    isMounted.value && !("closedBy" in HTMLDialogElement.prototype),
  );

  const fallbackOnclick: typeof onclick = (e) => {
    onclick?.(e);
    if (
      closeOnOutsideClick &&
      contentWrapperRef &&
      !isEventTargetInElement(e.target, contentWrapperRef)
    ) {
      open = false;
    }
  };

  /** Capture the initial value of `open` for SSR paint. After hydration, the dialog's open attribute should never be set manually. */
  const initialOpen = open;

  /** Reflect the invoker commands, Escape, outside click changes back onto `open`. */
  const ontoggle: typeof ontoggleProp = (e) => {
    ontoggleProp?.(e);
    const newOpen = e.newState === "open";
    if (newOpen !== open) open = newOpen;
  };
</script>

{@render trigger?.({
  commandfor: id,
  command: "show-modal",
  "aria-haspopup": "dialog",
})}

<!-- A non-modal dialog has no real `::backdrop` so we need to fake one. Can't be a pseudo-element, because a pseudo lives inside the dialog so `closeOnOutsideClick` wouldn't work. -->
{#if initialOpen}
  <div class={componentCssClassNameNonModalBackdrop}></div>
{/if}
<dialog
  {id}
  class={[componentCssClassName, className]}
  closedby={closeOnOutsideClick ? "any" : "closerequest"}
  onclick={isClosedByFallbackNeeded ? fallbackOnclick : onclick}
  {ontoggle}
  open={initialOpen}
  {@attach (dialogEl) => {
    // Suppress the transition on mount so that when we upgrade to modal the open fade doesn't play.
    dialogEl.classList.add("no-transition");

    // Map `open` changes to `showModal`/`close`. First run upgrades the dialog to modal if `open` is true.
    $effect(() => {
      if (open) {
        if (dialogEl.open && !dialogEl.matches(":modal")) {
          // `open === true` during SSR case
          // `showModal` throws when called on open non-modal dialog so we need to close it first
          dialogEl.addEventListener(
            "close",
            (e) => {
              // Suppress the "upgrade" close event.
              e.stopImmediatePropagation();
            },
            { once: true, capture: true },
          );
          dialogEl.close();
        }
        dialogEl.showModal();
      } else {
        dialogEl.close();
      }

      // Re-enable the transition after the first sync so that later changes animate.
      dialogEl.classList.remove("no-transition");
    });
  }}
  {...rest}
>
  <div style="display: contents;" bind:this={contentWrapperRef}>
    {@render children?.(id, () => (open = false))}
  </div>
</dialog>

<!-- @component
`Modal` provides a mechanism for displaying content overlaying the main application.

Modal is declaratively controlled by default through the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) using `commandfor` and `command` attributes supplied via the `trigger` snippet. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) for more information.

For cases where opening or closing must be orchestrated in code, Modal can be controlled through the bindable `open` prop. With `bind:open` it stays in sync with the modal in both directions: setting it opens or closes the modal, and it updates to reflect changes made by invoker commands, `Escape`, or an outside click. Setting `open` during SSR renders the dialog open on page load without client-side JS, and it is upgraded to a true modal once hydrated.

## Example Usage
```svelte
<script lang="ts">
  let open = $state(false);
</script>

<p>Modal is {open ? "open" : "closed"}</p>
<Modal bind:open>
  {#snippet trigger(triggerProps)}
    <button {...triggerProps}>
      Open Modal
    </button>
  {/snippet}
  {#snippet children(commandfor, close)}
    <Modal.Content>
      <Modal.Content.Header>
        Modal's Header
        <Modal.Content.Header.CloseButton
          {commandfor}
          command="close"
        />
      </Modal.Content.Header>
      <Modal.Content.Body>
        Main Content
      </Modal.Content.Body>
      <Modal.Content.Footer>
        <Button
          onclick={() => {
            // doSomething();
            close();
          }}
        >
          Confirm
        </Button>
      </Modal.Content.Footer>
    </Modal.Content>
  {/snippet}
</Modal>
```
-->
