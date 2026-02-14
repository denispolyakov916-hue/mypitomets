#!/bin/bash
set -e

echo "================================================"
echo "     Pet-care-platform - macOS install"
echo "================================================"
echo ""

if ! xcode-select -p &>/dev/null; then
  echo "[INFO] Installing Xcode Command Line Tools..."
  xcode-select --install || true
  echo "[INFO] Please finish the Xcode tools install if prompted."
fi

if ! command -v brew &>/dev/null; then
  echo "[INFO] Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [ -x "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

echo "[INFO] Updating Homebrew..."
brew update

echo "[INFO] Installing required packages..."
brew install python@3.11 node postgresql@15 git

echo "[INFO] Starting PostgreSQL service..."
brew services start postgresql@15

echo "[INFO] Creating role and database (if missing)..."
DB_ROLE_EXISTS=$(psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='pitomets';" || true)
if [ "$DB_ROLE_EXISTS" != "1" ]; then
  psql -d postgres -c "CREATE ROLE pitomets WITH LOGIN PASSWORD '578321';"
fi

DB_EXISTS=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='pitomets_db';" || true)
if [ "$DB_EXISTS" != "1" ]; then
  psql -d postgres -c "CREATE DATABASE pitomets_db OWNER pitomets;"
fi

echo ""
echo "✅ macOS dependencies installed."
echo "✅ PostgreSQL is running with user 'pitomets'."
echo "✅ DB password is set to: 578321"
echo ""
