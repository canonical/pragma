<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="history" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.48158 5.06581C3.12487 3.85596 4.14792 2.89104 5.39329 2.31955C6.63866 1.74806 8.03733 1.60167 9.37404 1.90291C10.7108 2.20416 11.9114 2.93633 12.7913 3.98676C13.6711 5.03719 14.1814 6.34766 14.2436 7.71649C14.3057 9.08532 13.9163 10.4366 13.1353 11.5625C12.3543 12.6883 11.2249 13.5263 9.92098 13.9475C8.61707 14.3686 7.21089 14.3496 5.91885 13.8933C4.62681 13.4371 3.52051 12.5688 2.77022 11.4223M1.75 1.75V5.75H5.75M8 4V8L10 10"
      stroke="currentColor"
      stroke-width="1.5"
    ></path>
  </svg>
</IconBase>
