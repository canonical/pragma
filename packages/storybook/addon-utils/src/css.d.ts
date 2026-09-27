/** Lets TypeScript accept stylesheet imports; the bundler processes the CSS. */
declare module "*.css";
/** Stylesheet packages whose export specifiers carry no `.css` extension. */
declare module "@canonical/styles/fonts";
declare module "@canonical/styles-debug";
