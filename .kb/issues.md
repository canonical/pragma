# Preface

How to file an issue: its title, its labels, and which of the two pragma repositories it belongs in. Read this before opening or triaging an issue.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- **An issue title is a semantic `type(scope): subject`, like a pull request title**, using the same types (`.kb/commits.md`), for example `fix(router): keep the query string across a redirect`.
- **The type is also applied as a label.** On a pull request CI derives the type label from the title; on an issue, whoever files or triages it adds the matching type label by hand.
- **An issue lives in the repository whose code it would change.** A toolchain, token or design-system-model change belongs in `canonical/pragma-core`; a component, stylesheet, Storybook, application or documentation-site change belongs in `canonical/pragma-web`. A problem seen in one repository but caused by the other is filed where the fix will land.
- **Cross-repository references are written in full**, for example `canonical/pragma-core#42`, because a bare `#42` resolves against the repository it is written in.
