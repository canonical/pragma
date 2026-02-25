<script lang="ts" generics="T">
  import type { RadioProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds radio";

  let {
    class: className,
    group = $bindable(),
    onchange: onchangeProp,
    value,
    ...rest
  }: RadioProps<T> = $props();

  const onchange: typeof onchangeProp = (e) => {
    onchangeProp?.(e);
    if (value !== undefined && e.currentTarget.checked) {
      group = value;
    }
  };
</script>

<input
  type="radio"
  class={[componentCssClassName, className]}
  {onchange}
  {value}
  checked={value !== undefined && group === value ? true : undefined}
  {...rest}
/>

<!-- @component
`Radio` is an input control for selecting a single option from a set.

As an input control, it requires a `<label>` associated with it.

## Example Usage
```svelte
<label>
  <Radio checked name="theme" value="light" />
  Light
</label>
<label>
  <Radio name="theme" value="dark" />
  Dark
</label>
```

## Group Control
The component supports `bind:group` for controlling a group of radios, similarly to [native Svelte bind:group](https://svelte.dev/docs/svelte/bind#input-bind:group).

If `bind:group` is used, the `checked` prop must be omitted, and each radio in the group must have a `value` prop set.

### Example Usage
```svelte
<script lang="ts">
  let theme = $state("light");
</script>

<label>
  <Radio bind:group={theme} value="light" />
  Light
</label>
<label>
  <Radio bind:group={theme} value="dark" />
  Dark
</label>
```
-->
