#!/bin/bash

# Bump patch version in marketplace.json via a trivial README.md change + commit + push.
# The pre-commit hook does the actual version bump.

set -e

c='\033[0;35m'
y='\033[0;33m'
c0='\033[0;0m'
g='\033[0;32m'

# Toggle a trailing space in README.md to create a trivial change
if [[ "$(tail -c 1 README.md)" == " " ]]; then
    sed -i 's/ $//' README.md
else
    sed -i '$ s/$/ /' README.md
fi

git add README.md
git commit -m "bump version"
echo -e "$g**** Pushing... ****$c0"
git push
