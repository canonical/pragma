<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="moon" {...props}>
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
      d="M8.06212 3.05278L8.68364 1.78702C11.8142 2.12804 14.25 4.77905 14.25 8C14.25 11.4518 11.4518 14.25 8.00002 14.25C5.64387 14.25 3.59334 12.9459 2.52899 11.0237L3.45745 9.96161C3.93465 10.1476 4.45448 10.25 5.00002 10.25C7.34723 10.25 9.25002 8.34721 9.25002 6C9.25002 4.85528 8.79844 3.81759 8.06212 3.05278ZM10.3406 3.86561C10.6047 4.52563 10.75 5.24602 10.75 6C10.75 9.14785 8.22051 11.7049 5.08324 11.7494C5.88858 12.3768 6.90091 12.75 8.00002 12.75C10.6234 12.75 12.75 10.6233 12.75 8C12.75 6.22786 11.7792 4.68194 10.3406 3.86561Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
