#!/data/data/com.termux/files/usr/bin/bash
# Yoohub Deobfuscator (Luraph v15) — Termux / Android install helper
# รันใน Termux: bash install-termux.sh

set -e

echo "=============================================="
echo "  Yoohub Deobf by Fox — Termux Installer"
echo "  Luraph v15 Deobfuscator"
echo "=============================================="
echo

# 1) Packages
echo "[1/4] Installing packages (nodejs, python, git, curl)..."
pkg update -y
pkg install -y nodejs python git curl unzip clang make cmake 2>/dev/null || \
  pkg install -y nodejs python git curl unzip

# Optional: official luau package if available
if pkg list-all 2>/dev/null | grep -q '^luau/'; then
  echo "[*] Installing luau from Termux repo..."
  pkg install -y luau || true
fi

# 2) Project deps
echo
echo "[2/4] npm install..."
if [ -f package.json ]; then
  npm install
else
  echo "[!] package.json not found — run this script from project root"
  exit 1
fi

# 3) Luau binary
echo
echo "[3/4] Checking Luau runtime..."
if command -v luau >/dev/null 2>&1; then
  echo "[+] Found system luau: $(command -v luau)"
  luau --version 2>/dev/null || true
elif [ -x "./bin/luau" ]; then
  echo "[+] Found local bin/luau"
else
  echo "[!] luau not found."
  echo "    Option A (recommended): pkg install luau"
  echo "    Option B: build from source (slow on phone):"
  echo "      git clone --depth 1 https://github.com/luau-lang/luau.git /tmp/luau"
  echo "      cd /tmp/luau && mkdir build && cd build"
  echo "      cmake .. -DCMAKE_BUILD_TYPE=Release"
  echo "      cmake --build . --target Luau.Repl.CLI -j\$(nproc)"
  echo "      cp luau \$PREFIX/bin/  (or copy to this project's bin/)"
  echo
  echo "    After install, re-run: node deob.js --detect sample/xxx.lua"
fi

# 4) Python
echo
echo "[4/4] Checking Python..."
if command -v python3 >/dev/null 2>&1; then
  echo "[+] $(python3 --version)"
else
  echo "[!] python3 not found — pkg install python"
  exit 1
fi

echo
echo "=============================================="
echo "  Ready. Examples:"
echo "    node deob.js input.lua"
echo "    node deob.js input.lua -o out.lua"
echo "    node deob.js input.lua --detect"
echo "    node deob.js input.lua --no-devirt   # fast trace"
echo "    node deob.js ./folder/               # batch"
echo "=============================================="
