<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="git-commit-vertical" {...props}>
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
      d="M7.25 12.4378V15H8.75L8.75 12.4378C10.8783 12.0807 12.5 10.2297 12.5 8C12.5 5.77025 10.8783 3.91928 8.75 3.56222L8.75 1L7.25 1V3.56222C5.12171 3.91928 3.5 5.77025 3.5 8C3.5 10.2297 5.12172 12.0807 7.25 12.4378ZM11 8C11 9.65685 9.65685 11 8 11C6.34315 11 5 9.65685 5 8C5 6.34315 6.34315 5 8 5C9.65685 5 11 6.34315 11 8Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
