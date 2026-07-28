# Sync existing auth users to users table
# This fixes the broken state where auth.users exists but users table is empty

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

Write-Host "Fetching all auth users..." -ForegroundColor Cyan

try {
  $authUsers = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" -Headers $headers -Method Get

  if ($authUsers.users.Count -eq 0) {
    Write-Host "No auth users found" -ForegroundColor Yellow
    exit
  }

  Write-Host "Found $($authUsers.users.Count) auth users. Creating user profiles..." -ForegroundColor Green

  $now = (Get-Date).ToUniversalTime().ToString("o")
  $inserted = 0
  $failed = 0

  foreach ($user in $authUsers.users) {
    # Extract name from email (before @)
    $name = $user.email.Split("@")[0]

    # Determine role (assume first user is admin, rest are crew)
    $role = if ($inserted -eq 0) { "admin" } else { "crew" }

    $profileBody = @{
      id = $user.id
      email = $user.email
      name = $name
      role = $role
      created_at = $now
      updated_at = $now
    } | ConvertTo-Json

    try {
      Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users" `
        -Headers $headers `
        -Method Post `
        -Body $profileBody | Out-Null

      Write-Host "[OK] $($user.email) ($role)" -ForegroundColor Green
      $inserted++
    }
    catch {
      Write-Host "[FAIL] $($user.email): $($_.Exception.Message)" -ForegroundColor Red
      $failed++
    }
  }

  Write-Host "`nSynced $inserted users to users table" -ForegroundColor Green
  if ($failed -gt 0) {
    Write-Host "Failed: $failed" -ForegroundColor Yellow
  }
}
catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
