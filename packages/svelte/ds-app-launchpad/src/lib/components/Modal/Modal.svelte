<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { useIsMounted } from "../../useFunctions/index.js";
  import { isEventTargetInElement } from "../../utils/index.js";
  import type { ModalMethods, ModalProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds modal";

  let {
    id: idProp,
    class: className,
    trigger,
    children,
    closeOnOutsideClick = true,
    onclick,
    ...rest
  }: ModalProps = $props();

  let dialogRef = $state<HTMLDialogElement>();

  const fallbackId = $props.id();
  const id = $derived(idProp || fallbackId);

  const isMounted = useIsMounted();

  export const showModal: ModalMethods["showModal"] = () => {
    dialogRef?.showModal();
  };

  export const close: ModalMethods["close"] = () => {
    dialogRef?.close();
  };

  // Webkit doesn't support `closedby` attribute on dialog elements (https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy).
  // TODO(closedby): Remove this fallback when Webkit supports it.
  let contentWrapperRef = $state<HTMLElement>();

  const isClosedByFallbackNeeded = $derived(
    isMounted.value && !("closedBy" in HTMLDialogElement.prototype),
  );

  // TODO(Invoker Commands API): Remove this when Invoker Commands API is widely supported (https://caniuse.com/wf-invoker-commands)
  const isInvokerCommandsFallbackNeeded = $derived(
    isMounted.value &&
      (!("commandForElement" in HTMLButtonElement.prototype) ||
        !("command" in HTMLButtonElement.prototype)),
  );

  const fallbackOnclick: typeof onclick = (e) => {
    onclick?.(e);
    if (
      closeOnOutsideClick &&
      contentWrapperRef &&
      !isEventTargetInElement(e.target, contentWrapperRef)
    ) {
      close();
    }
  };
</script>

{@render trigger?.({
  onclick: isInvokerCommandsFallbackNeeded ? showModal : undefined,
  commandfor: id,
  command: "show-modal",
  "aria-haspopup": "dialog",
})}

<dialog
  bind:this={dialogRef}
  {id}
  class={[componentCssClassName, className]}
  closedby={closeOnOutsideClick ? "any" : "closerequest"}
  onclick={isClosedByFallbackNeeded ? fallbackOnclick : onclick}
  {...rest}
>
  <!-- TODO(closedby): Remove this wrapper when Webkit supports closedby -->
  <div style="display: contents;" bind:this={contentWrapperRef}>
    {@render children?.(id, close)}
  </div>
</dialog>

<!-- @component
`Modal` provides a mechanism for displaying content overlaying the main application. 

Modal can be imperatively controlled by the following methods available on the component instance:
- `showModal`: Shows the modal.
- `close`: Closes the modal.

Modal is declaratively controlled by default through the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) using `commandfor` and `command` attributes supplied via the `trigger` snippet. Imperative methods remain available for cases where opening or closing must be orchestrated in code. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) for more information.

## Example Usage
```svelte
<script lang="ts">
  let modal = $state<ModalMethods>();
  // Imperative controls on the component instance
  $effect(() => modal?.showModal())
</script>

<Modal bind:this={modal}>
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
