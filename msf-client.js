#!/usr/bin/env node
'use strict';
/**
 * Metasploit JSON-RPC client for MCP integration.
 * Talks to msfrpcd JSON-RPC server (thin, /api/v1/json-rpc).
 */
const https = require('https');
const http = require('http');

class MsfRpcClient {
  constructor(opts = {}) {
    this.host = opts.host || process.env.MSF_RPC_HOST || '127.0.0.1';
    this.port = parseInt(opts.port || process.env.MSF_RPC_PORT || '55553', 10);
    this.user = opts.user || process.env.MSF_RPC_USER || 'msf';
    this.pass = opts.pass || process.env.MSF_RPC_PASS || 'msf';
    this.ssl = opts.ssl !== undefined ? opts.ssl : (process.env.MSF_RPC_SSL !== 'false');
    this.token = opts.token || process.env.MSF_WS_JSON_RPC_API_TOKEN || 'metasploit-mcp-token-1234567890abcdef';
    this.uri = '/api/v1/json-rpc';
    this._requestId = 0;
  }

  _request(method, params = []) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: ++this._requestId });
      const lib = this.ssl ? https : http;
      const req = lib.request({
        hostname: this.host, port: this.port, path: this.uri, method: 'POST',
        headers: {
          'Content-Type': 'application/json-rpc',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': 'Bearer ' + this.token,
        },
        rejectUnauthorized: false,
      }, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) return reject(new Error(json.error.message || JSON.stringify(json.error)));
            resolve(json.result);
          } catch (e) { reject(new Error('Bad response: ' + data.slice(0, 200))); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async login() { this._token = null; return this._token; }

  async call(method, params = []) { return this._request(method, params); }

  async version() { return this.call('core.version', []); }
  async listModules(type) { return this.call('module.' + type, []); }
  async moduleInfo(type, name) { return this.call('module.info', [type, name]); }
  async moduleOptions(type, name) { return this.call('module.options', [type, name]); }
  async moduleExecute(type, name, opts = {}, opts2 = {}) { return this.call('module.execute', [type, name, opts, opts2]); }
  async moduleCheck(type, name, opts = {}) { return this.call('module.check', [type, name, opts]); }
  async consoleCreate(name = 'mcp') { return this.call('console.create', [name]); }
  async consoleList() { return this.call('console.list', []); }
  async consoleRead(cid) { return this.call('console.read', [cid]); }
  async consoleWrite(cid, cmd) { return this.call('console.write', [cid, cmd + "\n"]); }
  async consoleDestroy(cid) { return this.call('console.destroy', [cid]); }
  async sessionList() { return this.call('session.list', []); }
  async sessionStop(sid) { return this.call('session.stop', [sid]); }
  async sessionShellRead(sid) { return this.call('session.shell_read', [sid]); }
  async sessionShellWrite(sid, cmd) { return this.call('session.shell_write', [sid, cmd + "\n"]); }
  async sessionMeterpreterRun(sid, cmd) { return this.call('session.meterpreter_run_single', [sid, cmd]); }
  async jobList() { return this.call('job.list', []); }
  async jobStop(jid) { return this.call('job.stop', [jid]); }
  async dbHosts() { return this.call('db.hosts', [{}]); }
  async dbServices() { return this.call('db.services', [{}]); }
  async dbVulns() { return this.call('db.vulns', [{}]); }
  async dbCreds() { return this.call('db.creds', [{}]); }
  async dbNotes() { return this.call('db.notes', [{}]); }
  async dbWorkspaces() { return this.call('db.workspaces', []); }
  async dbReportHost(opts) { return this.call('db.report_host', [opts]); }
  async dbReportService(opts) { return this.call('db.report_service', [opts]); }
  async dbReportNote(opts) { return this.call('db.report_note', [opts]); }
  async coreGetG(key) { return this.call('core.getg', [key]); }
  async coreSetG(key, val) { return this.call('core.setg', [key, val]); }
  async coreReloadModules() { return this.call('core.reload_modules', []); }
  async coreThreadList() { return this.call('core.thread_list', []); }
  async coreThreadKill(tid) { return this.call('core.thread_kill', [tid]); }
}

module.exports = MsfRpcClient;