<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="chevron-collapse" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.7123 1.46967L8.00001 5.18198L4.2877 1.46967L3.22704 2.53033L8.00001 7.3033L12.773 2.53033L11.7123 1.46967Z"
      fill="currentColor"
    ></path>
    <path
      d="M8.00001 8.69669L3.22704 13.4697L4.2877 14.5303L8.00001 10.818L11.7123 14.5303L12.773 13.4697L8.00001 8.69669Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
