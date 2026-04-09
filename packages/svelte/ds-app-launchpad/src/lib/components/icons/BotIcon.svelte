<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="bot" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10.625 10.6V7.85001H9.125V10.6H10.625Z" fill="currentColor"
    ></path>
    <path d="M6.875 7.85001V10.6H5.375V7.85001H6.875Z" fill="currentColor"
    ></path>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M9.25 1.60001H5.25V3.10001H7.75V4.10001H4C3.0335 4.10001 2.25 4.88351 2.25 5.85001V7.85001H1V9.35001H2.25V12.6C2.25 13.5665 3.0335 14.35 4 14.35H12C12.9665 14.35 13.75 13.5665 13.75 12.6V9.35001H15V7.85001H13.75V5.85001C13.75 4.88351 12.9665 4.10001 12 4.10001H9.25V1.60001ZM12.25 5.85001C12.25 5.71194 12.1381 5.60001 12 5.60001H4C3.86193 5.60001 3.75 5.71194 3.75 5.85001V12.6C3.75 12.7381 3.86193 12.85 4 12.85H12C12.1381 12.85 12.25 12.7381 12.25 12.6V5.85001Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
