#!/usr/bin/env node
/**
 * msf-mcp-test.js - Verify the Metasploit MCP server works end-to-end.
 * Spawns the MCP server, sends initialize + tools/list + tools/call, exits.
 */
const { spawn } = require('child_process');

const server = spawn('node', ['/home/riziki/.kilo/msf/metasploit-mcp.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
const stderrLines = [];
server.stderr.on('data', d => stderrLines.push(d.toString()));
server.stdout.on('data', d => buf += d.toString());

function send(msg, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let done = false;
    const handler = (data) => {
      if (done) return;
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        try { resolve(JSON.parse(line)); done = true; return; } catch {}
      }
    };
    server.stdout.once('data', handler);
    server.stdin.write(JSON.stringify(msg) + '\n');
    setTimeout(() => { if (!done) { try { handler(Buffer.from('')) } catch {} } }, timeoutMs);
  });
}

(async () => {
  const init = await send({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
  });
  console.log('INIT:', init.result ? 'OK' : 'FAIL');

  const tools = await send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const toolCount = tools.result && tools.result.tools ? tools.result.tools.length : 0;
  console.log('TOOLS:', toolCount);

  const ver = await send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'msf_version', arguments: {} } });
  console.log('VERSION:', ver.result && ver.result.content ? ver.result.content[0].text.slice(0, 80) : 'FAIL');

  const hosts = await send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'msf_db_hosts', arguments: {} } });
  console.log('DB_HOSTS:', hosts.result && hosts.result.content ? hosts.result.content[0].text.slice(0, 80) : 'FAIL');

  const sessions = await send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'msf_sessions', arguments: {} } });
  console.log('SESSIONS:', sessions.result && sessions.result.content ? sessions.result.content[0].text.slice(0, 80) : 'FAIL');

  server.stdin.end();
  server.kill();
  console.log(toolCount >= 20 ? 'PASS: MCP server fully functional' : 'FAIL: not enough tools');
  process.exit(toolCount >= 20 ? 0 : 1);
})();