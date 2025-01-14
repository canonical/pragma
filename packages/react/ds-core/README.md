# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) 
  uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) 
  uses [SWC](https://swc.rs/) for Fast Refresh

## Caveats

### TSConfig

#### Skip library check

We use [skipLibCheck](https://www.typescriptlang.org/tsconfig/#skipLibCheck) to
skip type checking of declaration files. This is needed for compatibility with
storybook dependencies. If this option is not enabled, the following error occurs:

```
The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("storybook/internal/types")' call instead.
```

Library checking is only disabled for Storybook files. This is due to 
Storybook dependencies using CommonJS modules alongside ECMAScript modules, 
which causes issues when TypeScript tries to type-check them together.

Storybook files are excluded from builds in [tsconfig.build.json](tsconfig.build.json).
Library type-checking is enabled for builds.


### Bun

[Bun](https://bun.sh/) is being experimentally used as a package manager.

### Build tool

Bun includes a [native JS bundler](https://bun.sh/docs/bundler) that can 
transpile Typescript.

#### Downsides

We are not currently considering using `bun build` for production builds for 
the following reasons:

##### Globstar

Bun's [implementation of globstar](https://bun.sh/docs/api/glob) is non-standard.
It is difficult to build arbitrarily deep filepaths, as Bun expects a globstar 
for each level of supported nesting. Most glob implementations treat a globstar 
as representing an arbitrary number of non-hidden directories. However, with 
Bun, matching `.ts` files in `src/ui/Button` requires the glob pattern 
`**/**/*.ts`, which does not match files in other levels of nesting.

##### Dist Depth

Generating `dist/` output that has the correct folder structure (i.e., 
`dist/ui/Button/`) is non-trivial. `bun build` generates output with folder 
structure starting from matching the shallowest source file. However, this is 
not always desired. For example, if `ui/` is inside `src/`, one must `cd` into 
`src` before running `bun build` to generate the appropriate folder structure. 
You must then set build output to `../dist` to place build results in the 
project root. This makes the build script unnecessarily complex.

##### Type emitting

`bun build` does not generate types, so it must be accompanied by the usage of 
some other tool that generates type declarations.

#### Upsides

##### Speed

Bun builds slightly faster than the Typescript compiler.

| Tool | Command                                                             | Real Time | User Time | Sys Time |
| ---- | --------------------------------------------------------------------| --------- | --------- | -------- |
| Bun  | `bun run build:package:bun`                                         | 0m0.648s  | 0m1.498s  | 0m0.117s |
| Typescript  | `bun run build:package:tsc && bun run build:package:copycss` | 0m0.707s  | 0m1.615s  | 0m0.094s |

Note that the bun build must also call `tsc` to generate type declarations, and 
the tsc build must call the external `copyfiles` dependency to copy assets into 
`dist/`.

##### Non-TS bundling

`bun build` copies non-TS assets (such as images, stylesheets, etc) into `dist`. 
`tsc` must be followed up with a manual step that copies non-TS files (currently, 
this is only CSS) into `dist`.
