## Canonical Web Team Styles

### Caveats

The custom build for semantic tokens triggers the following two warnings : 

```
⚠️ dist/semantic.css
While building semantic.css, token collisions were found; output may be unexpected. 
Ignore this warning if intentional.

Use log.verbosity "verbose" or use CLI option --verbose for more details.
Refer to: https://styledictionary.com/reference/logging/
⚠️ dist/semantic.css
While building semantic.css, filtered out token references were found; output may be
 unexpected. Ignore this warning if intentional.

Use log.verbosity "verbose" or use CLI option --verbose for more details.
Refer to: https://styledictionary.com/reference/logging/
```

These two warnings are expected and have been disabled using the `--no-warn` flag.

