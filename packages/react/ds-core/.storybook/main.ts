import { createConfig } from "@canonical/storybook-config";

import { dirname, join } from "node:path";

function getAbsolutePath(value: string): string {
	return dirname(require.resolve(join(value, "package.json")));
}

const config = createConfig(getAbsolutePath);

/* Otherwise leads to a TS error "CSF Parsing error: Expected 'ObjectExpression' but found 'CallExpression' instead in 'CallExpression'."
 * https://github.com/storybookjs/storybook/issues/26778#issuecomment-2584041985
 */
export default { ...config };
