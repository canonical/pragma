<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="sun" {...props}>
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
      d="M5 8C5 9.65685 6.34315 11 8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8ZM8 3.5C5.51472 3.5 3.5 5.51472 3.5 8C3.5 10.4853 5.51472 12.5 8 12.5C10.4853 12.5 12.5 10.4853 12.5 8C12.5 5.51472 10.4853 3.5 8 3.5Z"
      fill="currentColor"
    ></path>
    <path d="M7.25 13.5H8.75V15H7.25V13.5Z" fill="currentColor"></path>
    <path d="M2.5 7.25L2.5 8.75H1L1 7.25H2.5Z" fill="currentColor"></path>
    <path
      d="M12.4194 4.64124L11.3588 3.58058L12.4194 2.51992L13.4801 3.58058L12.4194 4.64124Z"
      fill="currentColor"
    ></path>
    <path
      d="M11.3588 12.4194L12.4194 11.3587L13.4801 12.4194L12.4194 13.4801L11.3588 12.4194Z"
      fill="currentColor"
    ></path>
    <path d="M7.25 1H8.75V2.5H7.25V1Z" fill="currentColor"></path>
    <path d="M15 7.25V8.75H13.5V7.25H15Z" fill="currentColor"></path>
    <path
      d="M3.58058 13.4801L2.51992 12.4194L3.58058 11.3588L4.64124 12.4194L3.58058 13.4801Z"
      fill="currentColor"
    ></path>
    <path
      d="M2.5199 3.5806L3.58056 2.51994L4.64122 3.5806L3.58056 4.64126L2.5199 3.5806Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
