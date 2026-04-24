<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="sort" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.5303 1.46973L9.25 2.00006V14.5001H10.75V3.81072L13.4697 6.53039L14.5303 5.46973L10.5303 1.46973Z"
      fill="currentColor"
    ></path>
    <path
      d="M5.46967 14.5303L6.75 13.9999V1.49994H5.25V12.1893L2.53033 9.46961L1.46967 10.5303L5.46967 14.5303Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
