<script lang="ts" generics="T">
  import type { CheckboxProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds checkbox";

  let {
    class: className,
    group = $bindable(),
    checked = $bindable(),
    value,
    ...rest
  }: CheckboxProps<T> = $props();

  function getChecked() {
    if (group && value !== undefined) return group.includes(value);
    return Boolean(checked);
  }

  function setChecked(newChecked: boolean) {
    checked = newChecked;

    if (group && value !== undefined) {
      if (newChecked) {
        group = [...group, value];
      } else {
        group = group.filter((v) => v !== value);
      }
    }
  }
</script>

<input
  type="checkbox"
  class={[componentCssClassName, className]}
  {value}
  bind:checked={getChecked, setChecked}
  {...rest}
/>

<!-- @component
`Checkbox` is an input control for selecting one or more options.

As an input control, it requires a `<label>` associated with it.

## Example Usage
```svelte
<label>
  <Checkbox checked />
  Receive updates
</label>
```

## Group Control
The component supports `bind:group` for controlling a group of checkboxes, similarly to [native Svelte bind:group](https://svelte.dev/docs/svelte/bind#input-bind:group).

If `bind:group` is used, the `checked` prop must be omitted, and each checkbox in the group must have a `value` prop set. The bound `group` should be an array of values.

### Example Usage
```svelte
<script lang="ts">
  let selected = $state<string[]>([]);
</script>

<label>
  <Checkbox bind:group={selected} value="alpha" />
  Alpha
</label>
<label>
  <Checkbox bind:group={selected} value="beta" />
  Beta
</label>
```
-->
