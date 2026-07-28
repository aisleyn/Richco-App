# Populate crew_members table from auth users
# This creates crew member records so they appear in the app

param(
  [string]$supabaseUrl = "https://rsomamqswbezhcaprbol.supabase.co",
  [string]$serviceRoleKey = ""
)

if (-not $serviceRoleKey) {
  Write-Host "Enter your Supabase Service Role Key:" -ForegroundColor Yellow
  $secureKey = Read-Host -AsSecureString
  $serviceRoleKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secureKey))
}

$headers = @{
  "apikey" = $serviceRoleKey
  "Authorization" = "Bearer $serviceRoleKey"
  "Content-Type" = "application/json"
}

Write-Host "Populating crew_members table..." -ForegroundColor Cyan

# Crew members to add
$crewData = @(
  @{ email = "aisley@richcogroup.com"; first_name = "Aisley"; last_name = "Admin"; is_admin = $true }
  @{ email = "joannat@richcogroup.com"; first_name = "Joanna"; last_name = "T"; is_admin = $false }
  @{ email = "sherrie@richcogroup.com"; first_name = "Sherrie"; last_name = "S"; is_admin = $false }
)

$inserted = 0
$failed = 0

foreach ($crew in $crewData) {
  $body = @{
    email = $crew.email
    first_name = $crew.first_name
    last_name = $crew.last_name
    phone = ""
    role = "field"
    status = "available"
    is_admin = $crew.is_admin
  } | ConvertTo-Json

  try {
    Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/crew_members" `
      -Headers $headers `
      -Method Post `
      -Body $body | Out-Null

    $adminLabel = if ($crew.is_admin) { "[ADMIN]" } else { "[CREW]" }
    Write-Host "[OK] $($crew.email) $adminLabel" -ForegroundColor Green
    $inserted++
  }
  catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*duplicate*" -or $errorMsg -like "*409*") {
      Write-Host "[EXISTS] $($crew.email) (already in table)" -ForegroundColor Yellow
    } else {
      Write-Host "[FAIL] $($crew.email): $errorMsg" -ForegroundColor Red
      $failed++
    }
  }
}

Write-Host "`nDone! Inserted $inserted crew members" -ForegroundColor Green
if ($failed -gt 0) {
  Write-Host "Failed: $failed" -ForegroundColor Yellow
}
