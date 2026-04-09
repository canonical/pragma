<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="chevron-expand" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.00001 1.1967L3.22704 5.96967L4.2877 7.03033L8.00001 3.31802L11.7123 7.03033L12.773 5.96967L8.00001 1.1967Z"
      fill="currentColor"
    ></path>
    <path
      d="M11.7123 8.96967L8.00001 12.682L4.2877 8.96967L3.22704 10.0303L8.00001 14.8033L12.773 10.0303L11.7123 8.96967Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
