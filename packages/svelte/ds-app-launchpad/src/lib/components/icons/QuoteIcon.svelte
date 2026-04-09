<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="quote" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3.5 2H2V14H3.5V2Z" fill="currentColor"></path>
    <path d="M10 3H5V4.5H10V3Z" fill="currentColor"></path>
    <path d="M14 7.5H5V9H14V7.5Z" fill="currentColor"></path>
    <path d="M5 12H12V13.5H5V12Z" fill="currentColor"></path>
  </svg>
</IconBase>
