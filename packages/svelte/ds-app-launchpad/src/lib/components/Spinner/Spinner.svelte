<script lang="ts">
  import { SpinnerIcon } from "@canonical/svelte-icons";
  import type { SpinnerProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds spinner";

  let { class: className, ...rest }: SpinnerProps = $props();
</script>

<SpinnerIcon
  name="spinner"
  class={[componentCssClassName, className]}
  aria-label="Loading"
  {...rest}
/>

<!-- @component
`Spinner` A loading icon indicator.

## Example Usage
```svelte
<Spinner />
```
-->
