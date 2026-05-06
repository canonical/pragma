<script lang="ts" module>
  import { Line } from "./common/Line/index.js";

  const oneLogProps = {
    line: 1234,
    timestamp: "2024-10-27T10:00:00.400Z",
    message: "Application started successfully.",
  } as const;

  const logsProps = [
    {
      line: 1,
      timestamp: "2024-10-27T10:00:00.400Z",
      message: "Application started successfully.",
    },
    {
      line: 2,
      timestamp: "2024-10-27T10:05:12.300Z",
      message: "Low disk space on server.",
    },
    {
      line: 3,
      timestamp: "2024-10-27T10:10:45.600Z",
      message: "Failed to connect to database.",
    },
  ] as const;

  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export { logs, logsProps, oneLog, oneLogProps };
</script>

{#snippet logs()}
  {#each logsProps as { message, ...rest } (rest.line)}
    <Line {...rest}>
      {message}
    </Line>
  {/each}
{/snippet}

{#snippet oneLog()}
  <Line {...oneLogProps}>
    {oneLogProps.message}
  </Line>
{/snippet}
