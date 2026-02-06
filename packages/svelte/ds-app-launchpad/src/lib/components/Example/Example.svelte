<!-- @canonical/generator-ds 0.11.0 -->

<script lang="ts">
  import type { ExampleProps } from "./types.js";

  const componentCssClassName = "ds example";

  const { class: className, ...rest }: ExampleProps = $props();
  let count = $state(0);

  function handleClick() {
    count++;
  }
</script>

<div class={[componentCssClassName, className]} {...rest}>
  <button onclick={handleClick}>Click me</button>
  <p>Count: {count}</p>
</div>

<!-- @component
`Example` A reusable UI component that displays a button and a count.

## Example Usage
```svelte
<Example class="custom-class" id="unique-id" />
```
-->

<style>
  .ds.example {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--lp-color-background-default);
    > button {
      border-radius: 8px;
      border: 1px solid transparent;
      padding: 0.6em 1.2em;
      font-size: 1em;
      font-weight: 500;
      background-color: var(--lp-color-background-default);
      border: 1px solid var(--lp-color-border-default);
      color: var(--lp-color-text-default);
      transition: border-color 0.25s;
      width: fit-content;

      &:hover {
        border-color: #646cff;
      }
      &:focus,
      &:focus-visible {
        outline: 4px auto -webkit-focus-ring-color;
      }
    }
    > p {
      color: var(--lp-color-text-default);
    }
  }
</style>
