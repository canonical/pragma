<script lang="ts" module>
  export const buttonChildrenText = "Click me";
  export const complexChildrenText = "Complex content";
  export const iconTestId = "icon";
  export const submitChildrenText = "Submit";

  // biome-ignore lint/style/useExportType: snippets are Svelte runtime values
  export { buttonChildren, buttonIcon, complexChildren, submitChildren };
</script>

{#snippet buttonChildren()}
  <span>{buttonChildrenText}</span>
{/snippet}

{#snippet buttonIcon()}
  <svg data-testid={iconTestId}></svg>
{/snippet}

{#snippet submitChildren()}{submitChildrenText}{/snippet}

{#snippet complexChildren()}
  <span>{complexChildrenText}</span>
{/snippet}
