# Richco App - Create User Script
# Creates a new user in Supabase auth.users and the users table
# Usage: .\CREATE_USER.ps1 -email "user@example.com" -name "User Name" -password "password123" -isAdmin $true

param(
  [Parameter(Mandatory=$true)]
  [string]$email,

  [Parameter(Mandatory=$true)]
  [string]$name,

  [Parameter(Mandatory=$true)]
  [string]$password,

  [bool]$isAdmin = $false,

  [string]$supabaseUrl = "https://rsomamqswbezhcaprbol.supabase.co",
  [string]$serviceRoleKey = ""
)

# If Service Role Key not provided, prompt for it
if (-not $serviceRoleKey) {
  Write-Host "Enter your Supabase Service Role Key (from Settings > API > Service Role Key):" -ForegroundColor Yellow
  $secureKey = Read-Host -AsSecureString
  $serviceRoleKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secureKey))
}

$role = if ($isAdmin) { "admin" } else { "crew" }

Write-Host "Creating user: $email ($role)" -ForegroundColor Cyan

# Step 1: Create auth user
Write-Host "Creating auth user..." -ForegroundColor Gray

$createUrl = "$supabaseUrl/auth/v1/admin/users"

$createBody = @{
  email = $email
  password = $password
  email_confirm = $true
} | ConvertTo-Json

$authHeaders = @{
  "Authorization" = "Bearer $serviceRoleKey"
  "Content-Type" = "application/json"
  "apikey" = $serviceRoleKey
}

$restHeaders = @{
  "apikey" = $serviceRoleKey
  "Authorization" = "Bearer $serviceRoleKey"
  "Content-Type" = "application/json"
  "Prefer" = "return=representation"
}

try {
  $authResponse = Invoke-RestMethod -Uri $createUrl -Headers $authHeaders -Method Post -Body $createBody
  $userId = $authResponse.id
  Write-Host "✓ Auth user created: $userId" -ForegroundColor Green
}
catch {
  Write-Host "❌ Error creating auth user: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

# Step 2: Create user profile in users table
Write-Host "Creating user profile..." -ForegroundColor Gray

$profileUrl = "$supabaseUrl/rest/v1/users"

$now = (Get-Date).ToUniversalTime().ToString("o")

$profileBody = @{
  id = $userId
  email = $email
  name = $name
  role = $role
  created_at = $now
  updated_at = $now
} | ConvertTo-Json

try {
  $profileResponse = Invoke-RestMethod -Uri $profileUrl -Headers $restHeaders -Method Post -Body $profileBody
  Write-Host "✓ User profile created" -ForegroundColor Green
}
catch {
  Write-Host "❌ Error creating user profile: $($_.Exception.Message)" -ForegroundColor Red

  # Try to capture error details
  try {
    $errorContent = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorContent)
    $errorText = $reader.ReadToEnd()
    Write-Host "Details: $errorText" -ForegroundColor Yellow
  } catch {
    Write-Host "Could not read error details" -ForegroundColor Gray
  }

  Write-Host "⚠ Auth user was created but profile failed. You may need to delete and retry." -ForegroundColor Yellow
  Write-Host "Request body was: $profileBody" -ForegroundColor Gray
  exit 1
}

Write-Host "`n✅ User created successfully!" -ForegroundColor Green
Write-Host "`nLogin credentials:" -ForegroundColor Cyan
Write-Host "  Email: $email" -ForegroundColor White
Write-Host "  Password: $password" -ForegroundColor White
Write-Host "  Role: $role" -ForegroundColor White
