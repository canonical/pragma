<script lang="ts">
  import { subId } from "../../utils/index.js";
  import { setModalContext } from "./context.js";
  import type { ModalProps } from "./types.js";
  import { closedByFallbackAttachment } from "./utils/index.js";
  import "./styles.css";

  const componentCssClassNameBase = "modal";
  const componentCssClassName = `ds ${componentCssClassNameBase}`;
  const componentCssClassNameNonModalBackdrop = `ds ${componentCssClassNameBase}-non-modal-backdrop`;

  let {
    id: idProp,
    class: className,
    children,
    closedby = "closerequest",
    ontoggle: ontoggleProp,
    open = $bindable(),
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    ...rest
  }: ModalProps = $props();

  const fallbackId = $props.id();
  const id = $derived(idProp || fallbackId);
  const titleId = subId(fallbackId, "title");

  setModalContext({
    get id() {
      return id;
    },
    titleId,
  });

  /** Capture the initial value of `open` for SSR paint. After hydration, the dialog's open attribute should never be set manually. */
  const initialOpen = open;

  /** Reflect the invoker commands, Escape, outside click changes back onto `open`. */
  const ontoggle: typeof ontoggleProp = (e) => {
    ontoggleProp?.(e);
    const newOpen = e.newState === "open";
    if (newOpen !== open) open = newOpen;
  };
</script>

<!-- A non-modal dialog has no real `::backdrop` so we need to fake one. Can't be a pseudo-element, because a pseudo lives inside the dialog so `closedby="any"` wouldn't work. -->
{#if initialOpen}
  <div class={componentCssClassNameNonModalBackdrop}></div>
{/if}
<!-- `aria-labelledby` beats `aria-label` in the accessible-name computation, so the Header's title only names the dialog when no `aria-label` is given. -->
<dialog
  {id}
  class={[componentCssClassName, className]}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledby ?? (ariaLabel ? undefined : titleId)}
  {closedby}
  {ontoggle}
  open={initialOpen}
  {@attach closedByFallbackAttachment(closedby)}
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
  {@render children?.(
    { commandfor: id, command: "close" },
    () => (open = false),
  )}
</dialog>

<!-- TODO(button): Use the DS Button in the example once available. -->
<!-- @component
A modal is a focused container that sits on top of the main view, requiring users to interact with it before returning to that view. The main use case is asking the user to confirm a decision they have already taken — for instance, sending a delete request.

It renders a native `<dialog>` opened as a modal, so the backdrop, focus management, page inertness and Escape handling come from the platform.

Modal is declaratively controlled by default through the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API): point a button's `commandfor` at the modal's `id` and set `command` to `"show-modal"` or `"close"`. Buttons inside the modal can spread the `closeProps` passed to the `children` snippet instead. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) for more information.

For cases where opening or closing must be orchestrated in code, Modal can be controlled through the bindable `open` prop. With `bind:open` it stays in sync with the modal in both directions: setting it opens or closes the modal, and it updates to reflect changes made by invoker commands, `Escape`, or an outside click. Setting `open` during SSR renders the dialog open on page load without client-side JS, and it is upgraded to a true modal once hydrated.

The sections are composed by the consumer: render `Modal.Header`, `Modal.Content` and `Modal.Footer` as children. The header's title names the dialog; a modal composed without a header must carry its own `aria-label`. For heading semantics, wrap the title in a heading of the level that fits the page.

On open, the browser focuses the first focusable element in the modal — usually the header's close button, which is the recommended target when nothing needs more immediate interaction. Add [`autofocus`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/autofocus) to the element the user is expected to interact with first, such as the first field of a form, or to the modal itself when the user is expected to activate it to dismiss it.

`import { Modal } from "@canonical/svelte-ds-global";`

## Example Usage
```svelte
<button commandfor="discard-review" command="show-modal" aria-haspopup="dialog">
  Discard review
</button>
<Modal id="discard-review">
  {#snippet children(closeProps, close)}
    <Modal.Header>Discard pending review?</Modal.Header>
    <Modal.Content>
      Discarding the pending review will permanently delete your comments.
    </Modal.Content>
    <Modal.Footer>
      <button {...closeProps}>Keep review</button>
      <button
        onclick={() => {
          // doSomething();
          close();
        }}
      >
        Discard review
      </button>
    </Modal.Footer>
  {/snippet}
</Modal>
```

@implements ds:global.pattern.modal
-->
