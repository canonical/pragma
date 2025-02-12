#!/bin/bash

# Stages, commits, tags, and pushes the current state of the repo to Git.
# INPUTS:
# $1: tag (required) - The tag to be committed to the repository.

# Check if tag argument is provided
if [ -z "$1" ]; then
  echo "Error: tag argument is required."
  exit 1
fi


tag="$1"

git add .
git commit -m "chore: version bump to $tag"
# Create an annotated tag (`-m`) so that lerna can use it to determine which packages have changed
# See https://github.com/lerna/lerna/issues/1357#issuecomment-438162152
git tag "$tag" -m "$tag"
git push && git push --tags