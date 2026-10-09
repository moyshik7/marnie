#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

# Ensure Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first"
    exit 1
fi

# Check if directory already exists
if [ -d "marnie" ]; then
    echo "Directory 'marnie' already exists. Please remove it or run inside another directory."
    exit 1
fi

# Clone the repo
git clone https://github.com/moyshik7/marnie.git
cd marnie

# Install dependencies for backend and frontend
npm ci
cd frontend
npm ci
cd ..

# Tell the user that the build was successful
INSTALL_DIR="$(pwd)"
echo ""
echo "=================================================="
echo " Marnie installed successfully at: $INSTALL_DIR"
echo ""
echo " To run Marnie later:"
echo "   cd $INSTALL_DIR"
echo "   npm run nobuild"
echo "=================================================="
echo ""
echo "Starting server..."
echo "Press Ctrl+C to stop."
echo ""

# Build and start the app
npm run start