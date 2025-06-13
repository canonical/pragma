# Packaging Standards Reference

This document outlines the standards and conventions for packaging code within the Canonical Design System. It aims to ensure consistency, maintainability, and reliability across all packages.

## Introduction

Our packaging practices are guided by the following core principles:

* **Consistency:** Maintain uniform patterns for package structure, dependencies, and build processes.
* **Reliability:** Ensure packages can be installed and used without requiring elevated privileges or interactive prompts.
* **Maintainability:** Organize packages with clear boundaries and responsibilities.
* **Compatibility:** Ensure packages work seamlessly with Lerna and other build tools.

## Package Structure (`packaging/structure`)

### Directory Organization (`packaging/structure/directory`)

Each package **shall** follow a consistent directory structure:

```
package/
├── src/           # Source code
├── dist/          # Compiled output
├── docs/          # Documentation (if needed beyond README.md)
└── index.ts       # Main entry point
```

> ✅ **Do**
> 
> + Keep source code in the `src` directory
> + Place build artifacts in the `dist` directory
> + Use `index.ts` as the main entry point
> + Keep documentation close to the code it documents

> ❌ **Don't**
>
> + Place build artifacts in source directories
> + Create deep directory hierarchies
> + Mix source and build files
> + Place documentation in unrelated locations

### Package Configuration (`packaging/structure/configuration`)

Each package **shall** include essential configuration files:

1. **package.json**: Package metadata and dependencies
2. **tsconfig.json**: TypeScript configuration
3. **biome.json**: Code style and linting rules

> ✅ **Do**
> 
> + Include all required configuration files
> + Use consistent configuration across packages
> + Extend base configurations from shared packages
> + Keep configuration files up to date

> ❌ **Don't**
>
> + Duplicate configuration across packages
> + Use inconsistent configuration patterns
> + Omit required configuration files
> + Use outdated configuration patterns

## Dependencies (`packaging/dependencies`)

### Package Tiers (`packaging/dependencies/tiers`)

Packages **shall** be categorized into tiers with different dependency requirements:

1. **Core Packages**: Fundamental packages that form the foundation of the design system
   - Examples: `@canonical/react-ds-core`, `@canonical/tokens`
   - Must minimize dependencies
   - Dependencies must be strategically chosen
   - Consider implementing functionality internally

2. **Tiered Packages**: Team-specific or specialized packages
   - Examples: `@canonical/react-ds-app-launchpad`
   - Can include additional dependencies
   - Must maintain compatibility with core packages
   - Dependencies may be removed if features are upstreamed

> ✅ **Do**
> 
> + Evaluate dependencies against alternatives
> + Consider internal implementation for core packages
> + Keep dependencies minimal in core packages
> + Document dependency decisions
> + Monitor for upstream opportunities

> ❌ **Don't**
>
> + Add unnecessary dependencies to core packages
> + Introduce incompatible dependencies
> + Impact build or test performance
> + Duplicate functionality available in core

### Dependency Requirements (`packaging/dependencies/requirements`)

All dependencies **shall** meet the following requirements:

1. **Security**: Regular updates and security audits
2. **Health**: Minimum [Snyk Advisor](https://snyk.io/advisor/) health score of 80
3. **License**: Compatible with [Canonical's licensing structure](https://library.canonical.com/legal/licensing-policy) and not force the license of the package they are installed in to be in conflict with our licensing guidelines.
4. **Maintenance**: Actively maintained and supported
5. **Performance**: No significant impact on build or test times

> ✅ **Do**
> 
> + Regularly update dependencies
> + Monitor security advisories
> + Check Snyk health scores
> + Verify license compatibility
> + Test build and test performance impact

> ❌ **Don't**
>
> + Use unmaintained dependencies
> + Ignore security vulnerabilities
> + Use incompatible licenses
> + Accept poor health scores
> + Add dependencies that slow builds

### Dependency Management (`packaging/dependencies/management`)

Packages **shall** manage dependencies appropriately:

1. **Dependencies**: Required for runtime
2. **DevDependencies**: Required for development
3. **PeerDependencies**: Required by consuming packages

> ✅ **Do**
> 
> + Place dependencies in the correct category
> + Use exact versions for internal dependencies
> + Use version ranges for external dependencies
> + Keep dependencies up to date

> ❌ **Don't**
>
> + Require dependencies that need sudo access
> + Use dependencies that require interactive prompts
> + Mix dependency categories incorrectly
> + Use outdated or insecure dependencies

### Version Management (`packaging/dependencies/versions`)

Package versions **shall** be managed by [Lerna](https://lerna.js.org/) using [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/):

1. **Commit Messages**: Follow conventional commits specification
2. **Version Bumps**: Determined by commit message types, not manually. 
3. **Dependencies**: Automatically bumped when dependencies change

> ✅ **Do**
> 
> + Use conventional commit messages
> + Include breaking changes in commit body when needed
> + Keep commit messages clear and descriptive
> + Follow the commit message format:
>   ```
>   type(scope): description
>   
>   [optional body]
>   
>   [optional footer(s)]
>   ```

> ❌ **Don't**
>
> + Manually modify package versions
> + Use non-conventional commit messages
> + Skip version bumps for breaking changes
> + Mix different versioning schemes

## Build Process (`packaging/build`)

### Build Configuration (`packaging/build/configuration`)

Build processes **shall** be consistent and reliable:

1. **TypeScript**: Use `tsconfig.build.json` for production builds
2. **CSS**: Copy CSS files to appropriate locations
3. **Assets**: Handle static assets appropriately

> ✅ **Do**
> 
> + Use consistent build scripts across packages
> + Include all necessary build steps
> + Handle all asset types appropriately
> + Keep build processes fast and reliable

> ❌ **Don't**
>
> + Skip necessary build steps
> + Use inconsistent build patterns
> + Leave build artifacts in source directories
> + Create slow or unreliable builds

### Build Output (`packaging/build/output`)

Build output **shall** be organized and complete:

1. **JavaScript**: Compiled and bundled code
2. **TypeScript**: Type definitions
3. **CSS**: Stylesheets
4. **Assets**: Static resources

> ✅ **Do**
> 
> + Include all necessary output files
> + Organize output logically
> + Generate type definitions
> + Handle all asset types

> ❌ **Don't**
>
> + Omit necessary output files
> + Mix source and output files
> + Skip type definitions
> + Leave build output unorganized

## Publishing (`packaging/publishing`)

### Package Publishing (`packaging/publishing/process`)

Packages **shall** be published with appropriate metadata:

1. **Name**: Follow `@canonical/` namespace
2. **Version**: Semantic version
3. **Files**: Include only necessary files
4. **Exports**: Define public API

> ✅ **Do**
> 
> + Use correct package names
> + Include all necessary files
> + Define clear public APIs
> + Document package usage

> ❌ **Don't**
>
> + Publish unnecessary files
> + Expose internal APIs
> + Use incorrect namespaces
> + Skip documentation

### Package Installation (`packaging/publishing/installation`)

Packages **shall** be installable without special requirements:

1. **No Sudo**: Avoid dependencies requiring elevated privileges
2. **No Prompts**: Avoid interactive installation steps
3. **No Special Tools**: Use standard package managers

> ✅ **Do**
> 
> + Use standard package managers
> + Avoid special installation requirements
> + Document installation steps
> + Test installation process

> ❌ **Don't**
>
> + Require sudo access
> + Use interactive prompts
> + Require special tools
> + Skip installation testing
