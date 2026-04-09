<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="git-commit" {...props}>
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
      d="M3.56222 7.25H1V8.75H3.56222C3.91928 10.8783 5.77025 12.5 8 12.5C10.2297 12.5 12.0807 10.8783 12.4378 8.75H15V7.25H12.4378C12.0807 5.12172 10.2297 3.5 8 3.5C5.77025 3.5 3.91928 5.12172 3.56222 7.25ZM8 11C6.34315 11 5 9.65685 5 8C5 6.34315 6.34315 5 8 5C9.65685 5 11 6.34315 11 8C11 9.65685 9.65685 11 8 11Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
