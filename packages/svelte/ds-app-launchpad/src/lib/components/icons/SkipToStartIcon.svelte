<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="skip-to-start" {...props}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M6.00001 8L11.5 2.5L12.561 3.56L8.12101 8L12.561 12.439L11.5 13.5L6.00001 8Z"
      fill="currentColor"
    ></path>
    <path d="M4.5 1.5H3L3 14.5H4.5L4.5 1.5Z" fill="currentColor"></path>
  </svg>
</IconBase>
