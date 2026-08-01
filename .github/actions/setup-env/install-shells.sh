#!/usr/bin/env bash
# Installs the shells the completion suite drives, so its zsh and fish cases
# stop skipping in CI.
#
# `shellDrive.test.ts` executes the GENERATED completion scripts in real
# shells. Its 33 cases split: 15 bash cases run wherever bash exists (always),
# and 18 zsh/fish cases sit behind `describe.skipIf(!hasShell(...))`. Those 18
# were verified against real zsh 5.9 and fish 3.7 during development and then
# skipped everywhere since, because no CI job had the shells — a skip is not
# continuous proof, and the completion surface is the one most exposed to
# every change in the kernel.
#
# Unconditional and loud, deliberately: this is the same posture the browser
# install landed on in #901. There is nothing to detect — a job that runs the
# test suite needs the shells, and a silent skip is exactly the failure mode
# this script exists to end. It prints the resolved versions so the log always
# says which shells the run actually proved against.
set -euo pipefail

sudo apt-get update -qq
sudo apt-get install -y -qq zsh fish

missing=0
for shell in zsh fish; do
  if command -v "$shell" >/dev/null 2>&1; then
    echo "$shell: $("$shell" --version 2>&1 | head -1)"
  else
    echo "::error::${shell} is not on PATH after apt install — the completion suite's ${shell} cases would skip silently"
    missing=1
  fi
done
exit "$missing"
