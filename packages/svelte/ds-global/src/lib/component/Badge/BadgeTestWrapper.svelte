<script lang="ts">
  import Badge from "./Badge.svelte";
</script>

<div class="disabled"  style="--modifier-color-foreground-primary-disabled: rgb(1, 2, 3);">
  <Badge value={42} data-testid="badge" />
</div>