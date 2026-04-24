param(
  [Parameter(Mandatory = $true)]
  [string]$RenderAdminUrl,

  [string]$TransferToken,

  [switch]$Force
)

$ErrorActionPreference = "Stop"

if ($RenderAdminUrl -notmatch "/admin/?$") {
  throw "RenderAdminUrl must be the full Strapi admin URL, for example https://your-service.onrender.com/admin"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

# Keep Strapi telemetry/config writes inside the project on locked-down Windows setups.
$env:XDG_CONFIG_HOME = (Resolve-Path ".strapi").Path

if ([string]::IsNullOrWhiteSpace($TransferToken)) {
  $secureToken = Read-Host "Transfer token" -AsSecureString
  $tokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try {
    $TransferToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
  }
}

$argsList = @(
  "strapi",
  "transfer",
  "--to",
  $RenderAdminUrl,
  "--to-token",
  $TransferToken
)

if ($Force) {
  $argsList += "--force"
}

npx.cmd @argsList
