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
    gap: 1rem;
    > button {
      border-radius: 8px;
      border: 1px solid transparent;
      padding: 0.6em 1.2em;
      font-size: 1em;
      font-weight: 500;
      background-color: #1a1a1a;
      color: #fff;
      transition: border-color 0.25s;
      &:hover {
        border-color: #646cff;
      }
      &:focus,
      &:focus-visible {
        outline: 4px auto -webkit-focus-ring-color;
      }
    }
  }
</style>
