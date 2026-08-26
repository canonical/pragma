<script lang="ts" module>
  export const buttonChildrenText = "Click me";
  export const submitChildrenText = "Submit";
  export const complexChildrenText = "Complex content";
  export const iconTestId = "icon";

  export { buttonChildren, buttonIcon, submitChildren, complexChildren };
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
