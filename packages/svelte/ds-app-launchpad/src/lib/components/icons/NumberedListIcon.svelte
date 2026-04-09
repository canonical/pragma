<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="numbered-list" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.04001 3.94V8.75H4.53001V2H3.49001C3.20335 2.30667 2.84668 2.58333 2.42001 2.83C2.00001 3.07667 1.59335 3.28 1.20001 3.44L1.65001 4.59C1.81001 4.53667 1.97001 4.47667 2.13001 4.41C2.29001 4.34333 2.44668 4.27 2.60001 4.19C2.76001 4.11 2.90668 4.02667 3.04001 3.94Z"
      fill="currentColor"
    ></path>
    <path d="M13.8 13.5V12H6.79999V13.5H13.8Z" fill="currentColor"></path>
    <path d="M12.8 8.75V7.25H6.79999V8.75H12.8Z" fill="currentColor"></path>
    <path d="M14.8 4V2.5H6.79999V4H14.8Z" fill="currentColor"></path>
  </svg>
</IconBase>
