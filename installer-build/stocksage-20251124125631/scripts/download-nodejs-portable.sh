#!/bin/bash

# Download portable Node.js for Windows
# Using Node.js v13.14.0 - LAST version to support Windows 7

NODE_VERSION="13.14.0"
BASE_URL="https://nodejs.org/dist/v${NODE_VERSION}"
FILENAME="node-v${NODE_VERSION}-win-x64.zip"
NODE_URL="${BASE_URL}/${FILENAME}"
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
