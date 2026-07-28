# Supabase Diagnostic Script
# Tests if Service Role Key is valid and tables are accessible

param(
  [string]$supabaseUrl = "https://rsomamqswbezhcaprbol.supabase.co",
  [string]$serviceRoleKey = ""
)

if (-not $serviceRoleKey) {
  Write-Host "Enter your Supabase Service Role Key:" -ForegroundColor Yellow
  $secureKey = Read-Host -AsSecureString
  $serviceRoleKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secureKey))
}

Write-Host "Testing Supabase connection..." -ForegroundColor Cyan

$headers = @{
  "apikey" = $serviceRoleKey
  "Authorization" = "Bearer $serviceRoleKey"
  "Content-Type" = "application/json"
}

# Test 1: Check auth users endpoint
Write-Host "`n1. Testing auth users endpoint..." -ForegroundColor Gray
try {
  $response = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" -Headers $headers -Method Get
  Write-Host "✓ Auth endpoint works" -ForegroundColor Green
  Write-Host "  Found $($response.Count) auth users" -ForegroundColor Gray
}
catch {
  Write-Host "✗ Auth endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check users table
Write-Host "`n2. Testing users table..." -ForegroundColor Gray
try {
  $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users?limit=1" -Headers $headers -Method Get
  Write-Host "✓ Users table is readable" -ForegroundColor Green
  Write-Host "  Found $($response.Count) users" -ForegroundColor Gray
}
catch {
  Write-Host "✗ Users table failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: List all tables
Write-Host "`n3. Listing all tables..." -ForegroundColor Gray
try {
  $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/?apikey=$serviceRoleKey" -Headers $headers -Method Get
  Write-Host "✓ Tables endpoint works" -ForegroundColor Green
}
catch {
  Write-Host "✗ Tables listing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Try to read from auth.users directly via SQL-like query
Write-Host "`n4. Testing RLS and permissions..." -ForegroundColor Gray
try {
  $testInsertBody = @{
    id = "test-user-123"
    email = "test@test.com"
    name = "Test"
    role = "crew"
  } | ConvertTo-Json

  $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users" `
    -Headers $headers `
    -Method Post `
    -Body $testInsertBody `
    -ErrorAction Stop

  Write-Host "✓ Can write to users table" -ForegroundColor Green

  # Clean up test record
  Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users?id=eq.test-user-123" `
    -Headers $headers `
    -Method Delete | Out-Null

  Write-Host "  Test record cleaned up" -ForegroundColor Gray
}
catch {
  Write-Host "✗ Cannot write to users table: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  This means RLS policies may be blocking inserts" -ForegroundColor Yellow
  Write-Host "  Or the Service Role Key isn't valid" -ForegroundColor Yellow
}

Write-Host "`n" -ForegroundColor Gray
Write-Host "Diagnostic complete!" -ForegroundColor Cyan
