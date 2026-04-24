param(
  [string]$Name = "formula72-local-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

if (!(Test-Path "exports")) {
  New-Item -ItemType Directory "exports" | Out-Null
}

# Keep Strapi telemetry/config writes inside the project on locked-down Windows setups.
$env:XDG_CONFIG_HOME = (Resolve-Path ".strapi").Path

npx.cmd strapi export --no-encrypt -f "exports\$Name"
