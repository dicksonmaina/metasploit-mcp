# OpenClaw / Hermes / Goose - Metasploit MCP Integration

This directory contains everything needed to wire the Metasploit MCP server into
any agent: Kilo Code, OpenClaw, Hermes, and Goose.

## Architecture

```
Agent (Kilo/OpenClaw/Hermes/Goose)
  |
  |-- MCP stdio client (configured in agent config)
  |     |
  |     +-- metasploit-mcp.js (Node.js MCP server, this dir)
  |           |
  |           +-- msf-client.js (JSON-RPC client)
  |                 |
  |                 +-- msfrpcd JSON-RPC daemon (port 55553)
  |                       |
  |                       +-- Metasploit Framework (exploit, aux, post, session, db, console)
  |
  +-- msf-harness.sh (ensure msfrpcd is running)
```

## Files

- `metasploit-mcp.js` - Main MCP server (27 tools, 6 resources)
- `msf-client.js` - Thin JSON-RPC client for msfrpcd
- `msf-harness.sh` - Daemon lifecycle manager (start/stop/restart/status)
- `msf-mcp-test.js` - End-to-end test script

## Quick start

```bash
# 1. Ensure msfrpcd is running
bash /home/riziki/.kilo/msf/msf-harness.sh start

# 2. Verify MCP server works
node /home/riziki/.kilo/msf/msf-mcp-test.js

# 3. Agents auto-discover it via their MCP config
```

## Agent-specific setup

### Kilo Code
Config already updated at `/home/riziki/.kilo/kilo.json`:
```json
"metasploit": {
  "type": "stdio",
  "command": "node",
  "args": ["/home/riziki/.kilo/msf/metasploit-mcp.js"],
  "env": { ... }
}
```

### OpenClaw
See `/home/riziki/.openclaw-hermesrizikibot/openclaw-mcp.json` for the MCP server block.
Add it to your OpenClaw config under `mcp.servers`.

### Hermes
Add to your Hermes `config.yaml`:
```yaml
mcp:
  servers:
    metasploit:
      type: stdio
      command: node
      args: ["/home/riziki/.kilo/msf/metasploit-mcp.js"]
```

### Goose
Add to your Goose `config.yaml`:
```yaml
extensions:
  metasploit:
    enabled: true
    type: stdio
    command: node
    args: ["/home/riziki/.kilo/msf/metasploit-mcp.js"]
```

## Available tools (27)

| Tool | Description |
|------|-------------|
| msf_version | Framework version info |
| msf_list_exploits | List all exploit modules |
| msf_list_auxiliary | List all auxiliary modules |
| msf_list_payloads | List all payload modules |
| msf_list_post | List all post-exploitation modules |
| msf_module_info | Get detailed info about a module |
| msf_module_options | Get options for a module |
| msf_run_module | Execute a module with options |
| msf_check_module | Check if target is vulnerable |
| msf_console | Run commands in a Metasploit console |
| msf_sessions | List active sessions |
| msf_session_shell | Send command to shell session |
| msf_session_kill | Kill a session |
| msf_jobs | List background jobs |
| msf_job_stop | Stop a background job |
| msf_db_hosts | List hosts in database |
| msf_db_services | List services in database |
| msf_db_vulns | List vulnerabilities in database |
| msf_db_creds | List credentials in database |
| msf_db_notes | List notes in database |
| msf_db_workspaces | List workspaces |
| msf_db_report_host | Report a host to database |
| msf_db_report_service | Report a service to database |
| msf_db_report_note | Report a note to database |
| msf_set_global | Set a global setting |
| msf_get_global | Get a global setting |
| msf_reload_modules | Reload all modules from disk |

## Resources (6)

- msf://version
- msf://modules/exploits
- msf://modules/payloads
- msf://db/hosts
- msf://db/sessions
- msf://db/jobs

## Security

This MCP server is for authorized security testing only. It provides full
read/write access to the Metasploit Framework including module execution,
session management, and database operations. Ensure msfrpcd authentication
is properly configured (API token + user/password) before exposing to agents.