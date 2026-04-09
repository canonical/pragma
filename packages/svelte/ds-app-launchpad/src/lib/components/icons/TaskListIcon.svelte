<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="task-list" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13 13.75V12.25H9.00001V13.75H13Z" fill="currentColor"></path>
    <path d="M13 8.75V7.25H9.00001V8.75H13Z" fill="currentColor"></path>
    <path d="M14 3.75V2.25H9.00001V3.75H14Z" fill="currentColor"></path>
    <path d="M7 2V7H2V2H7ZM3.5 5.5H5.5V3.5H3.5V5.5Z" fill="currentColor"></path>
    <path
      d="M7.53027 9.53027L4 13.0605L1.46973 10.5303L2.53027 9.46973L4 10.9395L6.46973 8.46973L7.53027 9.53027Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
