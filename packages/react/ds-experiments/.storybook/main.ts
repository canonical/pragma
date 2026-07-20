import { createConfig } from "@canonical/storybook-config";

export default createConfig("react", {
  // Wraps stories that declare `parameters.relay` in a relay-test-utils mock
  // environment, so the graph projection components (which use Relay hooks)
  // render without a server. The `graphql\`...\`` tags they contain are rewritten
  // by `vite-plugin-relay-lite`, configured in the package's `vite.config.ts`,
  // which Storybook's react-vite framework merges automatically.
  extraAddons: ["@canonical/storybook-addon-relay"],
});
