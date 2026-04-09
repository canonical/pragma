<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="reply" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.44975 2L7.51041 3.06066L4.37108 6.19999H11.5C13.1569 6.19999 14.5 7.54314 14.5 9.19999V14.2H13V9.19999C13 8.37156 12.3284 7.69999 11.5 7.69999H4.37156L7.51041 10.8388L6.44975 11.8995L1.5 6.94975L6.44975 2Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
