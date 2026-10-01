<!-- Copied from https://github.com/canonical/pragma-core/blob/main/docs/contributing/issues.md; change it there first. -->
# Issues

Read this when opening, triaging, transferring or re-creating an issue.

## Contents

- Checklist
- Pick the repository
- Write the title
- Write the body
- Apply the type label
- Moving an issue

## Checklist

```
- [ ] 1. Pick the repository
- [ ] 2. Write a free-form title
- [ ] 3. Write the body
- [ ] 4. Apply the type label
```

## Pick the repository

- **An issue lives in the repository whose code it would change** ([CONTRIBUTING.md](../../CONTRIBUTING.md#which-repository-owns-what)). A problem seen in one repository but caused by the other is filed where the fix will land.
- **A proposal for a design-system UI block**, new or changed, is a change to the models and specifications: file it in pragma-core, with the proposal templates there. Implementing a block in a component library is filed in pragma-web.
- **Write a reference to the other repository in full**, for example `canonical/pragma-core#42`.

## Write the title

The title is free-form: plain words that say what is wrong or wanted. It has no conventional-commit form, and templates prefill none. The type goes on as a label.

## Write the body

Use the template's sections when a template applies. Otherwise use these, leaving out any that do not apply:

```markdown
## What
## Why
## Current state on main
## Done when
```

## Apply the type label

- **Whoever files or triages the issue applies the type label** by hand, from the commit types ([commits.md](commits.md)).
- **In pragma-web, apply it when filing.** The Jira sync reads the labels when the issue is created: `feat` becomes a Story and anything else a Bug.
- **Only labels that exist in the repository can be applied**, by hand, by a template or by a form.

## Moving an issue

- **Transfer an issue when GitHub allows it.** A transferred issue keeps a label only when the target repository has one with the same name.
- **Re-create it when GitHub does not.** An issue cannot move from an internal or private repository into a public one, and an archived repository refuses transfers.
- **A re-created issue carries the `Origin: <repo>` label**, naming the repository it came from. Create the label first when the target repository does not have it yet.
- **Internal content is never posted publicly as it stands.** Re-create it as a public-safe summary: no people's names or handles, assignees, internal ticket keys, links into internal documents, designs or chats, or internal planning. A maintainer reviews it before it is posted. End it with `Originally tracked in [canonical/<repo>#<n>](<link>) (Canonical members).`
- **Move issues in bulk only after a dry run** that lists each new title and repository, reviewed by a maintainer.
