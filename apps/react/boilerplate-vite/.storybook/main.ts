import { createConfig } from "@canonical/storybook-config";

export default createConfig("react", {
  staticDirs: ["../src/assets", "../public"],
  // Wraps stories that declare `parameters.relay` in a relay-test-utils mock
  // environment, so components using Relay hooks render without a server.
  extraAddons: ["@canonical/storybook-addon-relay"],
});
