$Repo     = "mamoonk/omni-router"
$AppName  = "omni-router"
$Branch   = "master"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git is required but not found."
  exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is required but not found."
  exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required but not found."
  exit 1
}

$NodeVer = [int]((node -v) -replace 'v', '' -replace '\..*', '')
if ($NodeVer -lt 18) {
  Write-Error "Node.js 18+ is required (found v$(node -v))."
  exit 1
}

$TmpDir = Join-Path $env:TEMP "omni-router-install"
if (Test-Path $TmpDir) { Remove-Item -Recurse -Force $TmpDir }
New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null

Write-Host "Downloading $AppName..."
git clone --depth=1 --branch $Branch "https://github.com/$Repo.git" $TmpDir
Set-Location $TmpDir

Write-Host "Installing dependencies..."
npm install

Write-Host "Building application..."
npm run build

Write-Host "`n$AppName installed successfully!"
Write-Host "`n  Run in dev mode:   npm run dev"
Write-Host "  Run web server:    npm run build:web && npm run start:web"
Write-Host "  Run preview:       npm run preview"
