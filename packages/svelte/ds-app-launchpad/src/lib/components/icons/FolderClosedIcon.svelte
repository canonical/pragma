<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="folder-closed" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M10 5H13.5C14.3284 5 15 5.67157 15 6.5V12.5C15 13.3284 14.3284 14 13.5 14H2.5C1.67157 14 1 13.3284 1 12.5V3.5C1 2.67157 1.67157 2 2.5 2H8.5C9.32843 2 10 2.67157 10 3.5V5ZM8.5 3.5V5H2.5V3.5H8.5ZM2.5 12.5L2.5 6.5H13.5V12.5H2.5Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
