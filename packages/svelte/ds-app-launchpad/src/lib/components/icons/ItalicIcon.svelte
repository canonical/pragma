<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="italic" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.91223 12.5L8.08533 3.5H6.65002L6.8114 2H11.65L11.4886 3.5H10.0399L7.86682 12.5H9.34998L9.1886 14H4.34998L4.51135 12.5H5.91223Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
