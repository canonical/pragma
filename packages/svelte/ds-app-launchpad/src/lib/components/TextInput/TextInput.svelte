<script lang="ts">
	import { InputPrimitive } from "../common/index.js";
	import type { TextInputProps } from "./types.js";
	import "./styles.css";

	const componentCssClassName = "ds text-input";

	let {
		class: className,
		severity,
		density,
		value = $bindable(),
		...rest
	}: TextInputProps = $props();
</script>

<InputPrimitive
	class={[componentCssClassName, className, severity, density]}
	bind:value
	{...rest}
/>
