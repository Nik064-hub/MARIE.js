#!/usr/bin/env bash
# Portable launcher for MARIE (Linux and macOS). Only requirement: Node.js LTS (includes npm).
cd "$(dirname "$0")" || exit 1

fail() {
    echo "ERROR: $1" >&2
    echo "MARIE could not be started." >&2
    exit 1
}

# 1. Node.js and npm must be available in PATH
command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 ||
    fail "Node.js was not found. Install the LTS version from https://nodejs.org and run this file again."

# 2. Node version must satisfy Vite 7: ^20.19 || ^22.12 || >=24
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>=24||(a==22&&b>=12)||(a==20&&b>=19)?0:1)" ||
    fail "Node.js is too old. MARIE needs Node.js 20.19+, 22.12+ or 24+. Install the LTS version from https://nodejs.org."

# 3. Install dependencies only if missing or package-lock.json is newer
if ! node -e "const f=require('fs');try{process.exit(f.statSync('node_modules/.package-lock.json').mtimeMs>=f.statSync('package-lock.json').mtimeMs?0:1)}catch{process.exit(1)}"; then
    echo "Installing dependencies (npm ci)..."
    npm ci || fail "npm ci failed."
fi

# 4. Port 5173 must be free
node -e "const s=require('net').createServer();s.once('error',()=>process.exit(1));s.listen(5173,'127.0.0.1',()=>s.close())" ||
    fail "Port 5173 is already in use. MARIE may already be running at http://127.0.0.1:5173. Otherwise, close the program using that port and try again."

# 5. Start Vite; --open launches the browser once the server is ready
echo "Starting MARIE at http://127.0.0.1:5173"
echo "Press Ctrl+C to stop the server."
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
