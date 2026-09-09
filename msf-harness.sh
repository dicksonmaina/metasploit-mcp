#!/usr/bin/env bash
# msf-harness.sh - Ensure msfrpcd JSON-RPC daemon is running for all agents.
# Used by Kilo, OpenClaw, Hermes, Goose, and any MCP-capable agent.
set -euo pipefail

RPC_HOST="${MSF_RPC_HOST:-127.0.0.1}"
RPC_PORT="${MSF_RPC_PORT:-55553}"
RPC_USER="${MSF_RPC_USER:-msf}"
RPC_PASS="${MSF_RPC_PASS:-msf}"
API_TOKEN="${MSF_WS_JSON_RPC_API_TOKEN:-metasploit-mcp-token-1234567890abcdef}"
PIDFILE="${HOME}/.msf4/msf-json-rpc.pid"

log() { echo "[msf-harness] $*"; }

# Check if JSON-RPC daemon is already responding
rpc_alive() {
  curl -sk -o /dev/null -w "%{http_code}" \
    -X POST "https://${RPC_HOST}:${RPC_PORT}/api/v1/json-rpc" \
    -H "Content-Type: application/json-rpc" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -d '{"jsonrpc":"2.0","method":"core.version","params":[],"id":1}' 2>/dev/null | grep -q 200
}

# Check PID file for running process
pid_alive() {
  if [ -f "$PIDFILE" ]; then
    local pid
    pid=$(cat "$PIDFILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Ensure SSL certs exist for msfrpcd
ensure_certs() {
  if [ ! -f "${HOME}/.msf4/msf-ws-cert.pem" ]; then
    log "Generating SSL certificates..."
    mkdir -p "${HOME}/.msf4"
    openssl req -x509 -newkey rsa:2048 \
      -keyout "${HOME}/.msf4/msf-ws-key.pem" \
      -out "${HOME}/.msf4/msf-ws-cert.pem" \
      -days 365 -nodes -subj "/CN=localhost" 2>/dev/null
    chmod 600 "${HOME}/.msf4/msf-ws-key.pem"
    chmod 644 "${HOME}/.msf4/msf-ws-cert.pem"
  fi
}

# Start msfrpcd if not running
start_rpc() {
  if rpc_alive; then
    log "JSON-RPC daemon already alive on ${RPC_HOST}:${RPC_PORT}"
    return 0
  fi
  if pid_alive; then
    log "Daemon PID alive but not responding, killing stale process"
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    sleep 2
  fi

  log "Starting msfrpcd JSON-RPC daemon..."
  ensure_certs
  export MSF_WS_JSON_RPC_API_TOKEN="$API_TOKEN"
  cd /opt/metasploit
  bundle exec ruby -Ilib msfrpcd \
    -a "$RPC_HOST" -p "$RPC_PORT" \
    -U "$RPC_USER" -P "$RPC_PASS" \
    --no-ssl -j &
  local pid=$!
  echo "$pid" > "$PIDFILE"

  # Wait for daemon to be ready
  for i in $(seq 1 30); do
    if rpc_alive; then
      log "JSON-RPC daemon ready (PID $pid)"
      return 0
    fi
    sleep 1
  done
  log "ERROR: msfrpcd failed to start"
  return 1
}

# Stop the daemon
stop_rpc() {
  if [ -f "$PIDFILE" ]; then
    local pid
    pid=$(cat "$PIDFILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      log "Stopping msfrpcd (PID $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 2
    fi
    rm -f "$PIDFILE"
  fi
  log "msfrpcd stopped"
}

# Show status
status_rpc() {
  if rpc_alive; then
    log "JSON-RPC daemon: ALIVE on ${RPC_HOST}:${RPC_PORT}"
    curl -sk -X POST "https://${RPC_HOST}:${RPC_PORT}/api/v1/json-rpc" \
      -H "Content-Type: application/json-rpc" \
      -H "Authorization: Bearer ${API_TOKEN}" \
      -d '{"jsonrpc":"2.0","method":"core.version","params":[],"id":1}' 2>/dev/null
    echo
  else
    log "JSON-RPC daemon: NOT RUNNING"
  fi
}

# Main
case "${1:-start}" in
  start) start_rpc ;;
  stop) stop_rpc ;;
  restart) stop_rpc; start_rpc ;;
  status) status_rpc ;;
  *) echo "Usage: $0 {start|stop|restart|status}"; exit 1 ;;
esac