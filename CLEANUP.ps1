# Cleanup broken users
# Lists auth users and allows deletion if needed

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

Write-Host "Listing all auth users..." -ForegroundColor Cyan

try {
  $users = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" -Headers $headers -Method Get

  Write-Host "Found $($users.users.Count) users in auth.users:" -ForegroundColor Green

  $users.users | ForEach-Object {
    Write-Host "  - $($_.email) (ID: $($_.id))" -ForegroundColor Gray
  }

  Write-Host "`nListing users in users table..." -ForegroundColor Cyan
  $tableUsers = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users?select=*" -Headers $headers -Method Get

  Write-Host "Found $($tableUsers.Count) users in users table:" -ForegroundColor Green
  $tableUsers | ForEach-Object {
    Write-Host "  - $($_.email) (ID: $($_.id))" -ForegroundColor Gray
  }

  Write-Host "`nComparison:" -ForegroundColor Yellow
  Write-Host "In auth but not in users table (broken):" -ForegroundColor Red
  $users.users | Where-Object { $_.email -notin $tableUsers.email } | ForEach-Object {
    Write-Host "  - $($_.email)" -ForegroundColor Red
  }
}
catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
