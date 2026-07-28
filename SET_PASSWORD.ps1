# Richco App - Emergency Password Reset Script
# Usage: .\SET_PASSWORD.ps1 -email "user@example.com" -newPassword "newpassword123"

param(
  [Parameter(Mandatory=$true)]
  [string]$email,

  [Parameter(Mandatory=$true)]
  [string]$newPassword,

  [string]$supabaseUrl = "https://rsomamqswbezhcaprbol.supabase.co",
  [string]$serviceRoleKey = ""
)

# If Service Role Key not provided, prompt for it
if (-not $serviceRoleKey) {
  Write-Host "Enter your Supabase Service Role Key (from Settings > API > Service Role Key):" -ForegroundColor Yellow
  $secureKey = Read-Host -AsSecureString
  $serviceRoleKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secureKey))
}

Write-Host "Setting password for: $email" -ForegroundColor Cyan

# Step 1: Get user ID from email
Write-Host "Looking up user ID..." -ForegroundColor Gray
$getUserUrl = "$supabaseUrl/rest/v1/users?email=eq.$email&select=id"

$getUserHeaders = @{
  "apikey" = $serviceRoleKey
  "Authorization" = "Bearer $serviceRoleKey"
  "Content-Type" = "application/json"
}

try {
  $userResponse = Invoke-RestMethod -Uri $getUserUrl -Headers $getUserHeaders -Method Get

  if ($userResponse.Count -eq 0) {
    Write-Host "❌ User not found with email: $email" -ForegroundColor Red
    exit 1
  }

  $userId = $userResponse[0].id
  Write-Host "✓ Found user ID: $userId" -ForegroundColor Green
}
catch {
  Write-Host "❌ Error looking up user: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

# Step 2: Update auth.users password via Admin API
Write-Host "Updating password..." -ForegroundColor Gray
$updateUrl = "$supabaseUrl/auth/v1/admin/users/$userId"

$updateBody = @{
  password = $newPassword
} | ConvertTo-Json

$updateHeaders = @{
  "apikey" = $serviceRoleKey
  "Authorization" = "Bearer $serviceRoleKey"
  "Content-Type" = "application/json"
}

try {
  $updateResponse = Invoke-RestMethod -Uri $updateUrl -Headers $updateHeaders -Method Put -Body $updateBody
  Write-Host "✅ Password updated successfully!" -ForegroundColor Green
  Write-Host "`nUser can now login with:" -ForegroundColor Cyan
  Write-Host "  Email: $email" -ForegroundColor White
  Write-Host "  Password: $newPassword" -ForegroundColor White
}
catch {
  Write-Host "❌ Error updating password: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
  exit 1
}

# Step 3 (Optional): Log the action
Write-Host "`nOptional: Log this reset in Supabase..." -ForegroundColor Gray
$logUrl = "$supabaseUrl/rest/v1/password_resets"

$logBody = @{
  user_id = $userId
  email = $email
  requested_by_email = "admin"
  is_completed = $true
  completed_at = (Get-Date -AsUTC).ToString("o")
  notes = "Password reset via PowerShell script"
} | ConvertTo-Json

try {
  $logResponse = Invoke-RestMethod -Uri $logUrl -Headers $updateHeaders -Method Post -Body $logBody
  Write-Host "✓ Reset logged in password_resets table" -ForegroundColor Green
}
catch {
  Write-Host "⚠ Could not log reset (table may not exist yet)" -ForegroundColor Yellow
}
