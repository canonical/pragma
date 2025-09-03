<script lang="ts">
// biome-ignore lint/correctness/noUnusedVariables: false alarm
const { name }: { name: string } = $props();
</script>

<div class="test-class">
  <span data-testid="greeting">Hello {name}</span>
</div>
