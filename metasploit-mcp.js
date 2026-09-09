#!/usr/bin/env node
'use strict';
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const path = require('path');
const MsfRpcClient = require(path.join(__dirname, 'msf-client.js'));
const RPC_HOST = process.env.MSF_RPC_HOST || '127.0.0.1';
const RPC_PORT = process.env.MSF_RPC_PORT || '55553';
const RPC_USER = process.env.MSF_RPC_USER || 'msf';
const RPC_PASS = process.env.MSF_RPC_PASS || 'msf';
const RPC_SSL = process.env.MSF_RPC_SSL !== 'false';
const API_TOKEN = process.env.MSF_WS_JSON_RPC_API_TOKEN || 'metasploit-mcp-token-1234567890abcdef';
const client = new MsfRpcClient({ host: RPC_HOST, port: RPC_PORT, user: RPC_USER, pass: RPC_PASS, ssl: RPC_SSL, token: API_TOKEN });
function fmt(obj) { if (obj === undefined || obj === null) return '(null)'; try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); } }
const server = new Server({ name: 'metasploit-mcp', version: '1.0.0' }, { capabilities: { tools: {}, resources: {} } });

// --- List tools ---
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'msf_version', description: 'Get Metasploit framework version info', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_list_exploits', description: 'List all available exploit modules', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_list_auxiliary', description: 'List all available auxiliary modules', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_list_payloads', description: 'List all available payload modules', inputSchema: { type: 'object', properties: { module: { type: 'string', description: 'Optional parent module to filter payloads' } } } },
    { name: 'msf_list_post', description: 'List all post-exploitation modules', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_module_info', description: 'Get detailed info about a module', inputSchema: { type: 'object', properties: { type: { type: 'string', description: 'Module type: exploit, auxiliary, payload, post, encoder, evasion' }, name: { type: 'string', description: 'Module reference e.g. exploit/linux/ssh/...' } }, required: ['type', 'name'] } },
    { name: 'msf_module_options', description: 'Get options for a module', inputSchema: { type: 'object', properties: { type: { type: 'string' }, name: { type: 'string' } }, required: ['type', 'name'] } },
    { name: 'msf_run_module', description: 'Execute a module with given options', inputSchema: { type: 'object', properties: { type: { type: 'string', description: 'Module type' }, name: { type: 'string', description: 'Module reference' }, options: { type: 'object', description: 'Module options key-value pairs' }, target: { type: 'integer', description: 'Target index' }, payload: { type: 'string', description: 'Payload name' } }, required: ['type', 'name'] } },
    { name: 'msf_check_module', description: 'Check if a target is vulnerable using a module', inputSchema: { type: 'object', properties: { type: { type: 'string' }, name: { type: 'string' }, options: { type: 'object' } }, required: ['type', 'name'] } },
    { name: 'msf_console', description: 'Run commands in a Metasploit console (create if needed)', inputSchema: { type: 'object', properties: { command: { type: 'string', description: 'Command to run e.g. use exploit/...; show options; run' } } } },
    { name: 'msf_sessions', description: 'List active sessions', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_session_shell', description: 'Send command to a shell session and read output', inputSchema: { type: 'object', properties: { sid: { type: 'integer', description: 'Session ID' }, command: { type: 'string', description: 'Shell command to run' } }, required: ['sid', 'command'] } },
    { name: 'msf_session_kill', description: 'Kill a session', inputSchema: { type: 'object', properties: { sid: { type: 'integer', description: 'Session ID' } }, required: ['sid'] } },
    { name: 'msf_jobs', description: 'List background jobs', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_job_stop', description: 'Stop a background job', inputSchema: { type: 'object', properties: { jid: { type: 'integer', description: 'Job ID' } }, required: ['jid'] } },
    { name: 'msf_db_hosts', description: 'List hosts discovered in the database', inputSchema: { type: 'object', properties: { workspace: { type: 'string' } } } },
    { name: 'msf_db_services', description: 'List services discovered in the database', inputSchema: { type: 'object', properties: { host: { type: 'string', description: 'Filter by host IP' } } } },
    { name: 'msf_db_vulns', description: 'List vulnerabilities in the database', inputSchema: { type: 'object', properties: { host: { type: 'string' } } } },
    { name: 'msf_db_creds', description: 'List credentials in the database', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_db_notes', description: 'List notes in the database', inputSchema: { type: 'object', properties: { host: { type: 'string' } } } },
    { name: 'msf_db_workspaces', description: 'List workspaces', inputSchema: { type: 'object', properties: {} } },
    { name: 'msf_db_report_host', description: 'Report a host to the database', inputSchema: { type: 'object', properties: { host: { type: 'string' }, os: { type: 'string' } }, required: ['host'] } },
    { name: 'msf_db_report_service', description: 'Report a service to the database', inputSchema: { type: 'object', properties: { host: { type: 'string' }, port: { type: 'integer' }, proto: { type: 'string' }, name: { type: 'string' }, state: { type: 'string' } }, required: ['host', 'port'] } },
    { name: 'msf_db_report_note', description: 'Report a note to the database', inputSchema: { type: 'object', properties: { host: { type: 'string' }, type: { type: 'string' }, data: { type: 'string' } }, required: ['host', 'type', 'data'] } },
    { name: 'msf_set_global', description: 'Set a global setting', inputSchema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } },
    { name: 'msf_get_global', description: 'Get a global setting', inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } },
    { name: 'msf_reload_modules', description: 'Reload all modules from disk', inputSchema: { type: 'object', properties: {} } },
  ]
}));

// --- Call tool handler ---
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    switch (name) {
      case 'msf_version': return { content: [{ type: 'text', text: fmt(await client.version()) }] };
      case 'msf_list_exploits': return { content: [{ type: 'text', text: fmt(await client.listModules('exploits')) }] };
      case 'msf_list_auxiliary': return { content: [{ type: 'text', text: fmt(await client.listModules('auxiliary')) }] };
      case 'msf_list_payloads': return { content: [{ type: 'text', text: fmt(await client.listModules('payloads')) }] };
      case 'msf_list_post': return { content: [{ type: 'text', text: fmt(await client.listModules('post')) }] };
      case 'msf_module_info': return { content: [{ type: 'text', text: fmt(await client.moduleInfo(args.type, args.name)) }] };
      case 'msf_module_options': return { content: [{ type: 'text', text: fmt(await client.moduleOptions(args.type, args.name)) }] };
      case 'msf_run_module': {
        const r = await client.moduleExecute(args.type, args.name, args.options || {}, {});
        return { content: [{ type: 'text', text: fmt(r) }] };
      }
      case 'msf_check_module': return { content: [{ type: 'text', text: fmt(await client.moduleCheck(args.type, args.name, args.options || {})) }] };
      case 'msf_console': {
        let cid = null;
        const cl = await client.consoleList();
        const arr = Object.keys(cl);
        if (arr.length > 0) cid = arr[0]; else { const c = await client.consoleCreate('mcp'); cid = c.id; }
        await client.consoleWrite(cid, args.command);
        await new Promise(r => setTimeout(r, 1500));
        const out = await client.consoleRead(cid);
        return { content: [{ type: 'text', text: fmt(out) }] };
      }
      case 'msf_sessions': return { content: [{ type: 'text', text: fmt(await client.sessionList()) }] };
      case 'msf_session_shell': {
        await client.sessionShellWrite(args.sid, args.command);
        await new Promise(r => setTimeout(r, 1000));
        const out = await client.sessionShellRead(args.sid);
        return { content: [{ type: 'text', text: fmt(out) }] };
      }
      case 'msf_session_kill': return { content: [{ type: 'text', text: fmt(await client.sessionStop(args.sid)) }] };
      case 'msf_jobs': return { content: [{ type: 'text', text: fmt(await client.jobList()) }] };
      case 'msf_job_stop': return { content: [{ type: 'text', text: fmt(await client.jobStop(args.jid)) }] };
      case 'msf_db_hosts': return { content: [{ type: 'text', text: fmt(await client.dbHosts()) }] };
      case 'msf_db_services': return { content: [{ type: 'text', text: fmt(await client.dbServices()) }] };
      case 'msf_db_vulns': return { content: [{ type: 'text', text: fmt(await client.dbVulns()) }] };
      case 'msf_db_creds': return { content: [{ type: 'text', text: fmt(await client.dbCreds()) }] };
      case 'msf_db_notes': return { content: [{ type: 'text', text: fmt(await client.dbNotes()) }] };
      case 'msf_db_workspaces': return { content: [{ type: 'text', text: fmt(await client.dbWorkspaces()) }] };
      case 'msf_db_report_host': return { content: [{ type: 'text', text: fmt(await client.dbReportHost({ host: args.host, os: args.os })) }] };
      case 'msf_db_report_service': return { content: [{ type: 'text', text: fmt(await client.dbReportService({ host: args.host, port: args.port, proto: args.proto || 'tcp', name: args.name || '', state: args.state || 'open' })) }] };
      case 'msf_db_report_note': return { content: [{ type: 'text', text: fmt(await client.dbReportNote({ host: args.host, type: args.type, data: args.data })) }] };
      case 'msf_set_global': return { content: [{ type: 'text', text: fmt(await client.coreSetG(args.key, args.value)) }] };
      case 'msf_get_global': return { content: [{ type: 'text', text: fmt(await client.coreGetG(args.key)) }] };
      case 'msf_reload_modules': return { content: [{ type: 'text', text: fmt(await client.coreReloadModules()) }] };
      default: return { content: [{ type: 'text', text: 'Unknown tool: ' + name }], isError: true };
    }
  } catch (err) {
    return { content: [{ type: 'text', text: 'Error: ' + err.message }], isError: true };
  }
});

// --- Resources ---
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: 'msf://version', name: 'Framework version', description: 'Metasploit version and ruby info', mimeType: 'application/json' },
    { uri: 'msf://modules/exploits', name: 'Exploit modules', description: 'List of all exploit modules', mimeType: 'application/json' },
    { uri: 'msf://modules/payloads', name: 'Payload modules', description: 'List of all payload modules', mimeType: 'application/json' },
    { uri: 'msf://db/hosts', name: 'Discovered hosts', description: 'Hosts stored in the database', mimeType: 'application/json' },
    { uri: 'msf://db/sessions', name: 'Active sessions', description: 'Currently active sessions', mimeType: 'application/json' },
    { uri: 'msf://db/jobs', name: 'Background jobs', description: 'Currently running background jobs', mimeType: 'application/json' },
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    if (uri === 'msf://version') return { contents: [{ uri, mimeType: 'application/json', text: fmt(await client.version()) }] };
    if (uri === 'msf://modules/exploits') return { contents: [{ uri, mimeType: 'application/json', text: fmt(await client.listModules('exploits')) }] };
    if (uri === 'msf://modules/payloads') return { contents: [{ uri, mimeType: 'application/json', text: fmt(await client.listModules('payloads')) }] };
    if (uri === 'msf://db/hosts') return { contents: [{ uri, mimeType: 'application/json', text: fmt(await client.dbHosts()) }] };
    if (uri === 'msf://db/sessions') return { contents: [{ uri, mimeType: 'application/json', text: fmt(await client.sessionList()) }] };
    if (uri === 'msf://db/jobs') return { contents: [{ uri, mimeType: 'application/json', text: fmt(await client.jobList()) }] };
    throw new Error('Unknown resource: ' + uri);
  } catch (err) {
    throw new Error('Resource read failed: ' + err.message);
  }
});

// --- Start stdio transport ---
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error('[msf-mcp] connect failed:', err.message);
  process.exit(1);
});
