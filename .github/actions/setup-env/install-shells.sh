#!/usr/bin/env bash
# Installs the shells whose GENERATED completion scripts the suite executes.
#
# `shellDrive.test.ts` drives the emitted bash, zsh and fish scripts in the
# real shell. Its bash describes are ungated (the runner always has bash), but
# the zsh and fish describes are `describe.skipIf(!hasShell(...))` — so on a
# runner without those two interpreters they assert NOTHING and the suite still
# reports green. That is what CI did from the day the file was written: the
# only execution proof for the zsh and fish scripts ran nowhere. zsh is the
# default shell on macOS, and the static tier (`safety.test.ts`) only pins what
# characters a script may not contain, never that it parses or answers.
#
# So the install is verified rather than assumed. `apt-get install` failing —
# a transient mirror, a renamed package, universe not enabled — would put the
# suite straight back to silently skipping, which is the exact defect this step
# exists to close. Failing HERE names the cause; a green suite that ran nothing
# names nothing.
set -euo pipefail

sudo apt-get update
sudo apt-get install -y --no-install-recommends zsh fish

# `hasShell` in the suite probes exactly this: the interpreter is on PATH and
# runs a `-c` script. Probe it the same way, so a shell that installs but is
# not invocable fails the step instead of silently skipping a describe.
missing=0
for sh in zsh fish; do
  if [ "$("$sh" -c 'printf ok' 2>/dev/null)" = "ok" ]; then
    echo "$sh: $("$sh" --version)"
  else
    echo "::error::${sh} is not on PATH or cannot run a -c script — shellDrive.test.ts would skip its ${sh} describes and assert nothing"
    missing=1
  fi
done
exit "$missing"
