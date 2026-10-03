<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Modal } from "./index.js";

  // TODO(button): Replace the native buttons with the DS Button once available.

  // Svelte 5 Storybook autodocs do not currently pick up component docs from
  // the component source reliably, so we inject the description here instead:
  // https://github.com/storybookjs/storybook/discussions/34104#discussioncomment-16084065

  /**
   * A modal is a focused container that sits on top of the main view, requiring users to interact with it before returning to that view.
   *
   * It renders a native `<dialog>` opened as a modal. Open and close it declaratively with the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) — a button with `commandfor` set to the modal's `id` and `command` set to `"show-modal"` or `"close"` — or programmatically through the bindable `open` prop.
   *
   * Compose the sections with `Modal.Header`, `Modal.Content` and `Modal.Footer`. The header's title names the dialog; a modal without a header must carry its own `aria-label`. For heading semantics, wrap the title in a heading of the level that fits the page.
   *
   * On open, the browser focuses the first focusable element in the modal — usually the header's close button, which is the recommended target when nothing needs more immediate interaction. Add [`autofocus`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/autofocus) to the element the user is expected to interact with first, such as the first field of a form.
   */
  const { Story } = defineMeta({
    title: "_work_in_progress/pattern/Modal",
    tags: ["autodocs"],
    component: Modal,
    argTypes: {
      children: {
        control: false,
      },
    },
    // TODO: Render stories open (in iframes, so the top-layer dialogs stay in their previews) once
    // docs Controls update iframed stories: https://github.com/storybookjs/storybook/issues/11908
  });

  // "Without dismiss affordances" story state
  let open = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeLeft = $state(0);
  const onclick = () => {
    if (interval) clearInterval(interval);
    open = true;
    timeLeft = 5;
    interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        open = false;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    }, 1000);
  };

  const storyOfUbuntu = [
    "Ubuntu is an ancient African word meaning 'humanity to others'. It is often described as reminding us that 'I am what I am because of who we all are'. We bring the spirit of Ubuntu to the world of computers and software.",
    "Linux was already established in 2004, but it was fragmented into proprietary and unsupported community editions, and free software was not a part of everyday life for most computer users. That's when Mark Shuttleworth gathered a small team of Debian developers who together founded Canonical and set out to create an easy-to-use Linux desktop called Ubuntu.",
    "The mission for Ubuntu is both social and economic. First, we deliver the world's free software, freely, to everybody on the same terms. Whether you are a student or a global bank, you can download and use Ubuntu free of charge.",
    "Ubuntu was the first operating system to commit to scheduled releases on a predictable cadence, every six months, starting in October 2004. In 2006 we decided that every fourth release, made every two years, would receive long-term support for large-scale deployments. This is the origin of the term LTS for stable, maintained releases.",
    "The commercial and community teams collaborate to produce a single, high-quality release, which receives ongoing maintenance for a defined period. Both the release and ongoing updates for core packages are freely available to all users.",
    "Canonical is the publisher of Ubuntu. Members of the Canonical team lead aspects of Ubuntu such as the kernel, default desktop, foundations, security, OpenStack, and Kubernetes.",
    "However, the governance of Ubuntu is somewhat independent of Canonical, with volunteer leaders from around the world taking responsibility for many critical elements of the project.",
    "It remains a key tenet of the Ubuntu Project that Ubuntu is a shared work between Canonical, other companies, and the thousands of volunteers who bring their expertise to bear on making it a world-class platform for anyone to use.",
    "The first official Ubuntu release — Version 4.10, codenamed the 'Warty Warthog' — was launched in October 2004, and sparked dramatic global interest as thousands of free software enthusiasts and experts joined the Ubuntu community.",
    "Ubuntu today has many flavors and dozens of specialized derivatives. There are also special editions for servers, OpenStack clouds, and connected devices. All editions share common infrastructure and software, making Ubuntu a unique single platform that scales from consumer electronics to the desktop and up into the cloud for enterprise computing.",
    "Ubuntu Desktop is by far the world's most widely used Linux workstation platform, powering the work of engineers across the globe. Ubuntu Core sets the standard for tiny, transactional operating systems for highly secure connected devices.",
    "We hope Ubuntu will bring something wonderful to your computing — and we hope that you'll join us in helping to shape and build the future of free software together.",
  ];
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <button
      commandfor="modal-default"
      command="show-modal"
      aria-haspopup="dialog"
    >
      Show modal
    </button>
    <Modal {...args} id="modal-default">
      {#snippet children(closeProps, close)}
        <Modal.Header>Discard pending review?</Modal.Header>
        <Modal.Content>
          You have added 4 comments. Discarding the pending review will
          permanently delete them. Are you sure you want to continue?
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
  {/snippet}
</Story>

<!-- Add `autofocus` to the element the user is expected to interact with first. -->

<Story name="With autofocus">
  {#snippet template({ children: _, ...args })}
    <button
      commandfor="modal-autofocus"
      command="show-modal"
      aria-haspopup="dialog"
    >
      Show modal
    </button>
    <Modal {...args} id="modal-autofocus">
      {#snippet children(closeProps, close)}
        <Modal.Header>Rename branch</Modal.Header>
        <Modal.Content>
          <label>
            New name
            <input value="feature/modal" autofocus />
          </label>
        </Modal.Content>
        <Modal.Footer>
          <button {...closeProps}>Cancel</button>
          <button
            onclick={() => {
              // rename();
              close();
            }}
          >
            Rename
          </button>
        </Modal.Footer>
      {/snippet}
    </Modal>
  {/snippet}
</Story>

<!-- For heading semantics, wrap the title in a heading of the level that fits the page. -->

<Story name="With a heading">
  {#snippet template({ children: _, ...args })}
    <button
      commandfor="modal-heading"
      command="show-modal"
      aria-haspopup="dialog"
    >
      Show modal
    </button>
    <Modal {...args} id="modal-heading">
      <Modal.Header>
        <h2>Keyboard shortcuts</h2>
      </Modal.Header>
      <Modal.Content>
        <h3>Navigation</h3>
        <p>Press <kbd>j</kbd> and <kbd>k</kbd> to move between comments.</p>
        <h3>Review</h3>
        <p>Press <kbd>r</kbd> to reply to the focused comment.</p>
      </Modal.Content>
    </Modal>
  {/snippet}
</Story>

<!-- With `closedby="none"` and `closeButton={false}`, the modal offers no way to dismiss it: Escape and outside clicks do nothing. It closes only when the bindable `open` is set to `false`. -->

<Story
  name="Without dismiss affordances"
  args={{ closedby: "none" }}
  argTypes={{ open: { control: false } }}
>
  {#snippet template({ children: _, open: __, ...args })}
    <!--
      <script lang="ts">
        let open = $state(false);
        let interval: ReturnType<typeof setInterval> | null = null;
        let timeLeft = $state(0);
        const onclick = () => {
          if (interval) clearInterval(interval);
          open = true;
          timeLeft = 5;
          interval = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
              open = false;
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
            }
          }, 1000);
        };
      </script>
    -->

    <button {onclick}>Show modal</button>
    <Modal
      bind:open
      onclose={() => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }}
      {...args}
    >
      <Modal.Header closeButton={false}>Closed from code</Modal.Header>
      <Modal.Content>
        This modal can't be dismissed. It closes itself in {timeLeft} seconds.
      </Modal.Content>
    </Modal>
  {/snippet}
</Story>

<!-- With `closedby="any"`, a click outside the modal closes it too. -->

<Story name="Closed by an outside click" args={{ closedby: "any" }}>
  {#snippet template({ children: _, ...args })}
    <button
      commandfor="modal-outside-click"
      command="show-modal"
      aria-haspopup="dialog"
    >
      Show modal
    </button>
    <Modal {...args} id="modal-outside-click">
      <Modal.Header>Keyboard shortcuts</Modal.Header>
      <Modal.Content>
        Press <kbd>?</kbd> anywhere to show this list again.
      </Modal.Content>
    </Modal>
  {/snippet}
</Story>

<!-- Only the content scrolls: the header and footer stay in place, and the modal never grows past `--modal-max-block-size`. -->

<Story name="Long content">
  {#snippet template({ children: _, ...args })}
    <button
      commandfor="modal-long-content"
      command="show-modal"
      aria-haspopup="dialog"
    >
      Show modal
    </button>
    <Modal {...args} id="modal-long-content">
      {#snippet children(closeProps)}
        <Modal.Header>The story of Ubuntu</Modal.Header>
        <Modal.Content>
          {#each storyOfUbuntu as paragraph (paragraph)}
            <p>{paragraph}</p>
          {/each}
        </Modal.Content>
        <Modal.Footer>
          <button {...closeProps}>Close</button>
        </Modal.Footer>
      {/snippet}
    </Modal>
  {/snippet}
</Story>

<!-- Without `Modal.Header` nothing names the dialog, so it must carry its own `aria-label`. -->

<Story name="Without a header">
  {#snippet template({ children: _, ...args })}
    <button
      commandfor="modal-without-header"
      command="show-modal"
      aria-haspopup="dialog"
    >
      Show modal
    </button>
    <Modal {...args} id="modal-without-header" aria-label="Maintenance notice">
      {#snippet children(closeProps)}
        <Modal.Content>The service will restart at 02:00 UTC.</Modal.Content>
        <Modal.Footer>
          <button {...closeProps}>Got it</button>
        </Modal.Footer>
      {/snippet}
    </Modal>
  {/snippet}
</Story>
