<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="terminal" {...props}>
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
      d="M0.75 3.5C0.75 2.5335 1.5335 1.75 2.5 1.75H13.5C14.4665 1.75 15.25 2.5335 15.25 3.5V12.5C15.25 13.4665 14.4665 14.25 13.5 14.25H2.5C1.5335 14.25 0.75 13.4665 0.75 12.5V3.5ZM2.5 3.25C2.36193 3.25 2.25 3.36193 2.25 3.5V12.5C2.25 12.6381 2.36193 12.75 2.5 12.75H13.5C13.6381 12.75 13.75 12.6381 13.75 12.5V3.5C13.75 3.36193 13.6381 3.25 13.5 3.25H2.5Z"
      fill="currentColor"
    ></path>
    <path d="M8 9.3H12V10.8H8V9.3Z" fill="currentColor"></path>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M4.93299 4.94L3.87299 6L5.87799 8.006L3.87299 10.011L4.93299 11.071L7.99999 8.006L4.93299 4.94Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
