# Exit immediately if any command fails
$ErrorActionPreference = "Stop"

# Ensure Node.js and npm are installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Clone the repo
git clone https://github.com/moyshik7/marnie.git
Set-Location marnie

# Install dependencies for backend and frontend
npm ci
Set-Location frontend
npm ci
Set-Location ..

# Tell the user that the build was successful
$INSTALL_DIR = (Get-Location).Path
Write-Host ""
Write-Host "=================================================="
Write-Host " Marnie installed successfully at: $INSTALL_DIR"
Write-Host ""
Write-Host " To run Marnie later:"
Write-Host "   cd $INSTALL_DIR"
Write-Host "   npm run nobuild"
Write-Host "=================================================="
Write-Host ""
Write-Host "Starting Express server..."
Write-Host "Press Ctrl+C to stop."
Write-Host ""

# Build and start the app
npm run start