#!/bin/bash
# Richco App - Emergency Password Reset Script (Bash/curl version)
# Usage: ./set_password.sh -e "user@example.com" -p "newpassword123" -k "your_service_role_key"

SUPABASE_URL="https://xwpghxnyhqqafgwumejt.supabase.co"

while getopts "e:p:k:" opt; do
  case $opt in
    e) EMAIL="$OPTARG" ;;
    p) NEW_PASSWORD="$OPTARG" ;;
    k) SERVICE_ROLE_KEY="$OPTARG" ;;
    *) echo "Usage: $0 -e email -p password -k service_role_key"; exit 1 ;;
  esac
done

if [ -z "$EMAIL" ] || [ -z "$NEW_PASSWORD" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing required parameters"
  echo "Usage: $0 -e user@example.com -p newpassword -k your_service_role_key"
  exit 1
fi

echo "Setting password for: $EMAIL"

# Step 1: Get user ID
echo "Looking up user ID..."
USER_RESPONSE=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/users?email=eq.$EMAIL&select=id" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ User not found with email: $EMAIL"
  exit 1
fi

echo "✓ Found user ID: $USER_ID"

# Step 2: Update password
echo "Updating password..."
UPDATE_RESPONSE=$(curl -s -X PUT \
  "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$NEW_PASSWORD\"}")

if echo "$UPDATE_RESPONSE" | grep -q "error"; then
  echo "❌ Error: $UPDATE_RESPONSE"
  exit 1
fi

echo "✅ Password updated successfully!"
echo ""
echo "User can now login with:"
echo "  Email: $EMAIL"
echo "  Password: $NEW_PASSWORD"
