<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="emoji-smile" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.0104 9.01184C9.63897 9.74788 8.87747 10.25 8.00002 10.25C7.12257 10.25 6.36107 9.74788 5.98964 9.01184L4.65049 9.68762C5.26706 10.9094 6.53471 11.75 8.00002 11.75C9.46533 11.75 10.733 10.9094 11.3495 9.68762L10.0104 9.01184Z"
      fill="currentColor"
    ></path>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8ZM8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8C13.5 11.0376 11.0376 13.5 8 13.5Z"
      fill="currentColor"
    ></path>
    <path d="M5.5 6H7V7.5H5.5V6Z" fill="currentColor"></path>
    <path d="M9 6H10.5V7.5H9V6Z" fill="currentColor"></path>
  </svg>
</IconBase>
