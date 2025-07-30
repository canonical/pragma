## Documentation

Following the [diataxis](https://diataxis.fr/) principles, the monorepo documentation is split into four categories.
- Tutorials : 
- Explanations : 
- How-to guides : 
- Information Reference : 

### Tutorials

Tutorials have not been added to the documentation yet.

### Explanations :

| Resource | Description |
|----------|-------------|

### How-to guides :

| Resource | Description |
|----------|-------------|

### Information Reference : 


| Resource | Description |
|----------|-------------|


## Caveats
- For the time being, node 23 seems to provoke [an error](https://github.com/canonical/ds25/issues/226). Use node v22 for the time being, for instance with `nvm use 22`.
- We currently require Bun v1.2.19. Please run `curl -fsSL https://bun.com/install | bash -s "bun-v1.2.19"` to install 1.2.19.
  - On Windows: `iex "& {$(irm https://bun.com/install.ps1)} -Version 1.2.19"`

## Thanks
Thanks to [Chromatic](https://www.chromatic.com/) for providing the visual testing platform that helps us review UI changes and catch visual regressions.
