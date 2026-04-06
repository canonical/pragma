# @canonical/summon-application

Application scaffolding for Summon. This package adds generators for a router-enabled React SSR app plus standalone route and wrapper scaffolds.

## Commands

```bash
summon application react --app-path=my-router-app --ssr --router
summon route settings/billing
summon wrapper settings
```

## What it generates

- `summon application react --ssr --router` creates a React + Vite SSR app wired to `@canonical/router-core` and `@canonical/router-react`
- `summon route` creates a route module under `src/routes/`
- `summon wrapper` creates a wrapper module under `src/wrappers/`

## Notes

This package is the replacement direction for deprecated `generator-ds` app scaffolding. The generated app follows the Track E router boilerplate pattern and is designed to be discovered by the Summon CLI.
