<script lang="ts">
	import type { TextareaProps } from "./types.js";
	import { calculateDynamicRows } from "./utils/index.js";
  import "./styles.css";

	const componentCssClassName = "ds textarea";
	const defaultRows = 2;

	let {
		class: className,
		value = $bindable(),
		ref = $bindable(),
		rows: rowsProps = [defaultRows, defaultRows * 2 + 1],
		...rest
	}: TextareaProps = $props();

	const dynamicRows = $derived.by(() => {
		if (typeof rowsProps === "number") {
			return rowsProps;
		}

		if (!value) {
			return rowsProps[0];
		}

		const [minRows, maxRows] = rowsProps;
		return calculateDynamicRows(value, minRows, maxRows);
	});
</script>

<textarea
	bind:this={ref}
	bind:value
	class={[componentCssClassName, className]}
	rows={dynamicRows}
	{...rest}
></textarea>

