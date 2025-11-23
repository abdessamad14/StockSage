#!/bin/bash

# Download Node.js portable for Windows (offline installation)
# This script should be run BEFORE creating the package

# Use Node.js v16.20.2 for Windows 7 compatibility and modern JS features
# v16 is the last version supporting Windows 7 and includes ??, ?., etc.
# v20+ requires Windows 8.1 or later
NODE_VERSION="16.20.2"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NODE_DIR="$PROJECT_ROOT/nodejs"

echo "📦 Downloading Node.js Portable v${NODE_VERSION}..."
echo ""

# Create nodejs directory
mkdir -p "$NODE_DIR"

# Download Node.js
echo "📥 Downloading from: $NODE_URL"
curl -L "$NODE_URL" -o "/tmp/node-portable.zip"

if [ $? -ne 0 ]; then
    echo "❌ Failed to download Node.js"
    exit 1
fi

echo "📦 Extracting Node.js..."
unzip -q "/tmp/node-portable.zip" -d "/tmp/"

# Move files to nodejs directory
mv "/tmp/node-v${NODE_VERSION}-win-x64"/* "$NODE_DIR/"

# Clean up
rm "/tmp/node-portable.zip"
rm -rf "/tmp/node-v${NODE_VERSION}-win-x64"

echo "✅ Node.js portable ready at: $NODE_DIR"
echo ""
echo "📋 Contents:"
ls -lh "$NODE_DIR" | head -10
echo ""
echo "✅ You can now run: npm run build:package"
echo "   The package will include Node.js portable for offline installation"
