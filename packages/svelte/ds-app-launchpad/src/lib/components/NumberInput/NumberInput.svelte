<script lang="ts">
	import { InputPrimitive } from "../common/index.js";
	import type { NumberInputProps } from "./types.js";
	import "./styles.css";

	const componentCssClassName = "ds number-input";

	let {
		class: className,
		severity,
		density,
		value = $bindable(),
		...rest
	}: NumberInputProps = $props();
</script>

<InputPrimitive
	class={[componentCssClassName, className, severity, density]}
	type="number"
	bind:value
	{...rest}
/>

<!-- @component
`NumberInput` is a styled wrapper around the native `<input type="number">` element.

As an input, it requires a `<label>` associated with it.

## Example Usage
```svelte
<label>
  Age
  <NumberInput class="custom-class" id="unique-id" min={0} max={100} />
</label>
```
-->
