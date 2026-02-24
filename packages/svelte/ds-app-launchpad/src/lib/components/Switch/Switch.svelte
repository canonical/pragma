<script lang="ts" generics="T">
  import { useIsMounted } from "../../useIsMounted.svelte.js";
  import type { SwitchProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds switch";

  let {
    class: className,
    group = $bindable(),
    checked = $bindable(),
    value,
    disabled,
    ...rest
  }: SwitchProps<T> = $props();

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

  const isMounted = useIsMounted();
  // If there is no JS, we have no way to update the `aria-checked` attribute even though, the checkbox remains functional. Don't set `aria-checked` server-side, to avoid mismatched `checked` and `aria-checked` states.
  const ariaChecked = $derived(isMounted.value ? getChecked() : undefined);
</script>

<input
  type="checkbox"
  role="switch"
  class={[componentCssClassName, className]}
  {value}
  {disabled}
  bind:checked={getChecked, setChecked}
  aria-checked={ariaChecked}
  aria-readonly={disabled}
  {...rest}
/>

<!-- @component
`Switch` is a toggle control that allows users to switch between two states, typically on and off. It is commonly used for settings or preferences.

As an input control, it requires a `<label>` associated with it.

## Example Usage
```svelte
<script lang="ts">
  let checked = $state(false);
</script>
<label>
  <Switch bind:checked />
  Toggle me
</label>
```

## Group Control
The component supports `bind:group` for controlling a group of switches, similarly to [native Svelte bind:group](https://svelte.dev/docs/svelte/bind#input-bind:group) of checkbox inputs.

If `bind:group` is used, the `checked` prop must be omitted, and each switch in the group must have a `value` prop set. The bound `group` should be an array of values.

The presence of a Switch's `value` in the `group` array determines (and is reflected by) its checked state.

### Example Usage
```svelte
<script lang="ts">
  let selected = $state<string[]>([]);
</script>

<label>
  <Switch bind:group={selected} value="alpha" />
  Alpha
</label>
<label>
  <Switch bind:group={selected} value="beta" />
  Beta
</label>
```
-->
