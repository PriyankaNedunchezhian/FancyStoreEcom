# Deploy Razorpay Edge Functions and set secrets.
# Run in an interactive PowerShell window (needs browser login once):
#   cd "c:\Users\M L KARTHIKEYAN\FancyStoreEcom"
#   .\scripts\deploy-razorpay.ps1

$ErrorActionPreference = 'Stop'
$ProjectRef = 'efyyaaxlhplwxlvbkkth'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# Prefer non-VITE secret from customer/.env (not exposed to the browser bundle).
$envFile = Join-Path $Root 'customer\.env'
$keyId = $null
$keySecret = $null
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*VITE_RAZORPAY_KEY_ID\s*=\s*(.+)\s*$') { $keyId = $Matches[1].Trim() }
    if ($_ -match '^\s*RAZORPAY_KEY_SECRET\s*=\s*(.+)\s*$') { $keySecret = $Matches[1].Trim() }
    if ($_ -match '^\s*VITE_RAZORPAY_KEY_SECRET\s*=\s*(.+)\s*$') {
      Write-Warning 'VITE_RAZORPAY_KEY_SECRET exposes the secret to the browser. Use RAZORPAY_KEY_SECRET instead.'
      if (-not $keySecret) { $keySecret = $Matches[1].Trim() }
    }
  }
}

if (-not $keyId -or -not $keySecret) {
  Write-Host 'Add these to customer/.env then re-run:'
  Write-Host '  VITE_RAZORPAY_KEY_ID=rzp_test_...'
  Write-Host '  RAZORPAY_KEY_SECRET=your_secret   # no VITE_ prefix'
  exit 1
}

Write-Host 'Logging in (browser)...'
npx supabase login
Write-Host "Linking project $ProjectRef ..."
npx supabase link --project-ref $ProjectRef
Write-Host 'Setting secrets...'
npx supabase secrets set "RAZORPAY_KEY_ID=$keyId" "RAZORPAY_KEY_SECRET=$keySecret"
Write-Host 'Deploying functions...'
npx supabase functions deploy create-razorpay-order --project-ref $ProjectRef
npx supabase functions deploy verify-razorpay-payment --project-ref $ProjectRef
Write-Host 'Done. Retry checkout with Online payment.'
