<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="chevron-double-up" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.00002 2.5L3.22705 7.27297L4.28771 8.33363L8.00002 4.62132L11.7123 8.33363L12.773 7.27297L8.00002 2.5Z"
      fill="currentColor"
    ></path>
    <path
      d="M4.28773 13.3336L8.00004 9.62132L11.7123 13.3336L12.773 12.273L8.00004 7.5L3.22707 12.273L4.28773 13.3336Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
