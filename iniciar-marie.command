#!/usr/bin/env bash
# macOS double-click launcher: reuses iniciar-marie.sh and keeps the window open on errors.
# Finder gives apps a minimal PATH, so add the usual Node.js install locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
bash "$(dirname "$0")/iniciar-marie.sh" || {
    echo
    read -r -p "Press Enter to close this window..."
}
