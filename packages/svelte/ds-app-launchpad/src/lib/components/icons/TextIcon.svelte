<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="text" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M7 3V4.5H5.25V9H3.75V4.5H2V3H7Z" fill="currentColor"></path>
    <path d="M8.5 3H14V4.5H8.5V3Z" fill="currentColor"></path>
    <path d="M14 7.5H6.75V9H14V7.5Z" fill="currentColor"></path>
    <path d="M14 12V13.5H3V12H14Z" fill="currentColor"></path>
  </svg>
</IconBase>
