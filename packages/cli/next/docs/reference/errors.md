# Errors & exit codes

Every command returns a `{ ok, ... }` envelope and maps its failure to one of four process exit codes. Generated from the live error kernel — do not edit by hand.

## Exit codes

| Exit code | Meaning |
| --- | --- |
| `0` | success |
| `1` | runtime (entity-not-found, empty, config, internal) |
| `2` | usage (invalid/ambiguous input, unknown verb) |
| `3` | store unavailable |

## Response envelope

```json
{
  "success": {
    "ok": true,
    "data": "<payload>",
    "meta": "<object>"
  },
  "error": {
    "ok": false,
    "error": {
      "code": "<ErrorCode>",
      "message": "<string>",
      "suggestions": "string[]?",
      "recovery": "Recovery?",
      "validOptions": "string[]?",
      "filters": "object?"
    }
  }
}
```

## Error codes

Every `error.code` in a failure envelope is one of the following:

| Code | Meaning |
| --- | --- |
| `ENTITY_NOT_FOUND` | A named entity (block, standard, token, …) was not found. |
| `EMPTY_RESULTS` | A query or listing resolved to nothing under the active scope. |
| `INVALID_INPUT` | An argument was malformed, out of range, or the wrong shape. |
| `AMBIGUOUS_INPUT` | A name resolved to several entities (reserved; not yet raised). |
| `UNKNOWN_VERB` | The command noun or verb is not recognized. |
| `STORE_UNAVAILABLE` | The local store could not be reached or is not built. |
| `CONFIG_ERROR` | The layered configuration could not be resolved. |
| `INTERNAL_ERROR` | An unexpected failure — please report it. |
| `UNSUPPORTED` | A capability is unavailable in this build or environment. |
