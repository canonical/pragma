import { createConfig } from "@canonical/storybook-config";

const config = createConfig({
  staticDirs: ["../src/assets"],
});

/* Otherwise leads to a TS error "CSF Parsing error: Expected 'ObjectExpression' but found 'CallExpression' instead in 'CallExpression'."
 * https://github.com/storybookjs/storybook/issues/26778#issuecomment-2584041985
 */
export default { ...config };
