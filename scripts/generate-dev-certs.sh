#!/usr/bin/env bash
#
# generate-dev-certs.sh — makes sure infra/docker/nginx/certs has a cert for
# https://localhost before Nginx starts (that directory is bind-mounted into
# the nginx container — see infra/docker/docker-compose.yml — so it must be
# populated on the host first, or Nginx starts with no cert at all).
#
# Prefers mkcert: it issues certs signed by a local CA and installs that CA
# into the OS/browser trust stores, so https://localhost is trusted with no
# click-through warning. Falls back to a plain openssl self-signed cert if
# mkcert isn't available and can't be auto-installed.
#
# Called by ./setup.sh, and as a "predocker:up" hook so `pnpm docker:up` on
# its own is also safe. Safe to re-run.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.dev-logs"
CERTS_DIR="infra/docker/nginx/certs"
mkdir -p "$LOG_DIR" "$CERTS_DIR"

if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
else
  C_RESET=''; C_GREEN=''; C_YELLOW=''
fi
log_ok()   { printf '%s  ok%s   %s\n' "$C_GREEN" "$C_RESET" "$1"; }
log_warn() { printf '%s  warn%s %s\n' "$C_YELLOW" "$C_RESET" "$1"; }
log_info() { printf '  %s\n' "$1"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1 ($2)" >&2; exit 1; }
}

generate_openssl_cert() {
  require_cmd openssl "should ship with your OS — install openssl"
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "$CERTS_DIR/self-signed.key" \
    -out "$CERTS_DIR/self-signed.crt" \
    -subj "/C=US/ST=Local/L=Local/O=Boilerplate/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    > "$LOG_DIR/openssl-cert.log" 2>&1
  log_warn "Generated an untrusted self-signed cert — your browser will show a security warning at https://localhost."
}

if ! command -v mkcert >/dev/null 2>&1; then
  if [ "$(uname -s)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    log_info "mkcert not found — installing via Homebrew..."
    if brew install mkcert nss > "$LOG_DIR/mkcert-install.log" 2>&1; then
      log_ok "mkcert installed"
    else
      tail -n 20 "$LOG_DIR/mkcert-install.log" >&2
      log_warn "Could not install mkcert automatically — see $LOG_DIR/mkcert-install.log"
    fi
  else
    log_warn "mkcert not found and can't be auto-installed on this OS (see https://github.com/FiloSottile/mkcert#installation)."
  fi
fi

CA_TRUSTED=false
if command -v mkcert >/dev/null 2>&1; then
  log_info "Installing mkcert local CA into system/browser trust stores (may prompt for your password)..."
  if mkcert -install > "$LOG_DIR/mkcert-ca.log" 2>&1; then
    log_ok "Local CA trusted"
    CA_TRUSTED=true
  else
    tail -n 20 "$LOG_DIR/mkcert-ca.log" >&2
    log_warn "mkcert -install failed — see $LOG_DIR/mkcert-ca.log. Cert will still be generated, but your browser will show a warning until you run 'mkcert -install' yourself."
  fi
fi

if command -v mkcert >/dev/null 2>&1 && [ -f "$(mkcert -CAROOT)/rootCA.pem" ]; then
  if mkcert -cert-file "$CERTS_DIR/self-signed.crt" -key-file "$CERTS_DIR/self-signed.key" \
    localhost 127.0.0.1 ::1 > "$LOG_DIR/mkcert-cert.log" 2>&1; then
    if [ "$CA_TRUSTED" = true ]; then
      log_ok "Locally-trusted cert generated for https://localhost"
    else
      log_ok "Cert generated for https://localhost (CA not yet trusted — see warning above)"
    fi
  else
    tail -n 20 "$LOG_DIR/mkcert-cert.log" >&2
    log_warn "mkcert cert generation failed — see $LOG_DIR/mkcert-cert.log. Falling back to an untrusted cert."
    generate_openssl_cert
  fi
elif [ ! -f "$CERTS_DIR/self-signed.crt" ] || [ ! -f "$CERTS_DIR/self-signed.key" ]; then
  generate_openssl_cert
else
  log_ok "Existing cert in $CERTS_DIR reused"
fi
