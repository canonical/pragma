// import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "storybook";

import "index.css";
import "@canonical/styles-debug/baseline-grid";

const preview: Preview = {
	decorators: [
		// @ts-ignore. Unsure why this type error is happening only on this package. Must cleanup when upgrading to Storybook 9.
		// withThemeByClassName<ReactRenderer>({
		//   themes: {
		//     light: "is-light",
		//     dark: "is-dark",
		//     paper: "is-paper",
		//   },
		//   defaultTheme: "light",
		// }),
	],
};

export default preview;
