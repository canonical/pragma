import type { PackageManager } from "./types.js";

const PM_COMMANDS: Record<
  PackageManager,
  {
    install: (pkg: string) => string;
    update: (pkg: string) => string;
  }
> = {
  bun: {
    install: (pkg) => `bun add -g ${pkg}`,
    update: (pkg) => `bun update -g ${pkg}`,
  },
  npm: {
    install: (pkg) => `npm install -g ${pkg}`,
    update: (pkg) => `npm update -g ${pkg}`,
  },
  pnpm: {
    install: (pkg) => `pnpm add -g ${pkg}`,
    update: (pkg) => `pnpm update -g ${pkg}`,
  },
  yarn: {
    install: (pkg) => `yarn global add ${pkg}`,
    update: (pkg) => `yarn global upgrade ${pkg}`,
  },
};

export { PM_COMMANDS };
