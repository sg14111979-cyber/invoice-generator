#!/bin/bash
# macOS/Linux: double-click this file to start Invoice Studio.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install the LTS version from https://nodejs.org, then double-click this file again."
  read -r -p "Press Enter to close..." _
  exit 1
fi

node scripts/start.mjs
status=$?
echo
read -r -p "Invoice Studio stopped. Press Enter to close..." _
exit $status
