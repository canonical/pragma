# Canonical Strict Typescript Configuration

This package holds the TypeScript checks that `strict` leaves off, for projects that adopt them. It sets compiler options only, so it composes with a base configuration through an `extends` array (TypeScript 5.0 or later) rather than replacing one.

## Getting Started
1. Install Typescript: `bun add -d typescript`
2. Install this configuration: `bun add -d @canonical/typescript-config-strict`
3. Add it to the `extends` of your project's `tsconfig.json`, after the base configuration.

```json
{
  "extends": [
    "@canonical/typescript-config-react",
    "@canonical/typescript-config-strict"
  ]
}
```

## Configuration

This configuration enables the following behavior:
1. [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess): an element read by index, or a property read through an index signature, is `T | undefined`, so a possibly absent value is handled where it is read rather than assumed present. A length-proven read may still index directly; the compiler holds it to the same check.
2. [`exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes): an optional property may be left out, but may not be written as `undefined` unless its type says so, so a config spelled `{ size: undefined }` is not the same as one spelled without `size`. A config a caller builds — where a member is often computed and may come out `undefined` — declares its optional members as `member?: T | undefined`, so the caller can pass what it computed; a record the library builds itself keeps the strict `member?: T`, so a reader can tell an absent member from one written empty.
3. [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig/#noImplicitOverride): a member that overrides a base class member says `override`, so a renamed base member is a compile error rather than a silent new member.
4. [`noPropertyAccessFromIndexSignature`](https://www.typescriptlang.org/tsconfig/#noPropertyAccessFromIndexSignature): a property that exists only through an index signature is read with brackets, so declared members and looked-up keys read differently.
5. [`noImplicitReturns`](https://www.typescriptlang.org/tsconfig/#noImplicitReturns): every code path of a function that returns a value returns one.
6. [`noFallthroughCasesInSwitch`](https://www.typescriptlang.org/tsconfig/#noFallthroughCasesInSwitch): a non-empty `case` ends in `break`, `return` or `throw`.

### History

The DataViews packages adopted these six options first, in place of a rule that array reads go through `.at()`: the compiler enforces the same fallibility mechanically, at every index read, and needs no exception for a read the surrounding code has already proven safe.
