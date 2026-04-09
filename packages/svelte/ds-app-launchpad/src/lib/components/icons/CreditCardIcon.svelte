<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="credit-card" {...props}>
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
      d="M13 4.5H3C2.72386 4.5 2.5 4.72386 2.5 5V5.75H13.5V5C13.5 4.72386 13.2761 4.5 13 4.5ZM2.5 11V7.25H13.5V11C13.5 11.2761 13.2761 11.5 13 11.5H3C2.72386 11.5 2.5 11.2761 2.5 11ZM3 3C1.89543 3 1 3.89543 1 5V11C1 12.1046 1.89543 13 3 13H13C14.1046 13 15 12.1046 15 11V5C15 3.89543 14.1046 3 13 3H3ZM10.75 8.5C10.3358 8.5 10 8.83579 10 9.25V9.75C10 10.1642 10.3358 10.5 10.75 10.5H11.25C11.6642 10.5 12 10.1642 12 9.75V9.25C12 8.83579 11.6642 8.5 11.25 8.5H10.75Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
