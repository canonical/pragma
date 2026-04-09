<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="chevron-double-down" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.00002 13.5036L3.22705 8.73066L4.28771 7.67L8.00002 11.3823L11.7123 7.67L12.773 8.73066L8.00002 13.5036Z"
      fill="currentColor"
    ></path>
    <path
      d="M4.28773 2.67L8.00004 6.38231L11.7123 2.67L12.773 3.73066L8.00004 8.50363L3.22707 3.73066L4.28773 2.67Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
