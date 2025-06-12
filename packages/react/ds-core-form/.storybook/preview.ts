// import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import type { StoryContext, StoryFn } from "@storybook/react-vite";
//

import "index.css";

// const withMSW = (Story: StoryFn, context: StoryContext) => {
// 	useEffect(() => {
// 		const { msw } = context.parameters;
// 		if (msw && msw.handlers) {
// 			worker.resetHandlers();
// 			worker.use(...msw.handlers);
// 		}
// 		return () => worker.resetHandlers();
// 	}, [context.parameters.msw]);
//
// 	return createElement(Story as ComponentType, context.args);
// };
//
// worker.start({
// 	serviceWorker: {
// 		url: "/mockServiceWorker.js",
// 	},
// });

const preview: Preview = {
	tags: ["autodocs"],
	decorators: [
		// withThemeByClassName<ReactRenderer>({
		// 	themes: {
		// 		light: "is-light",
		// 		dark: "is-dark",
		// 		paper: "is-paper",
		// 	},
		// 	defaultTheme: "light",
		// }),
	],
};

export default preview;
