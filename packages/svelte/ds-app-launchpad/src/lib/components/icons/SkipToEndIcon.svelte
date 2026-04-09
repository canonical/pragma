<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="skip-to-end" {...props}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M9.99999 8L4.5 2.5L3.439 3.56L7.87899 8L3.43897 12.439L4.49997 13.5L9.99999 8Z"
      fill="currentColor"
    ></path>
    <path d="M11.5 1.5H13L13 14.5H11.5L11.5 1.5Z" fill="currentColor"></path>
  </svg>
</IconBase>
