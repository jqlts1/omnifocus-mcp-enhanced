#!/usr/bin/env node
// cli.cjs
const path = require('path');
const childProcess = require('child_process');

const args = process.argv.slice(2);
const subcommand = args[0];

// `install-skill` installs the bundled agent skill instead of starting the server.
if (subcommand === 'install-skill') {
  const installScript = path.join(__dirname, 'skills', 'omnifocus-cli', 'install.sh');
  const result = childProcess.spawnSync('bash', [installScript, ...args.slice(1)], {
    stdio: 'inherit'
  });
  process.exit(result.status === null ? 1 : result.status);
}

if (subcommand === '--help' || subcommand === '-h') {
  process.stdout.write(`omnifocus-mcp-enhanced

Usage:
  omnifocus-mcp-enhanced                 Start the MCP server (stdio transport)
  omnifocus-mcp-enhanced install-skill   Install into ./.claude/skills
  omnifocus-mcp-enhanced install-skill --global
                                         Install into ~/.claude/skills
  omnifocus-mcp-enhanced --version       Print the package version

The server is normally launched by an MCP client rather than run by hand.
`);
  process.exit(0);
}

if (subcommand === '--version' || subcommand === '-v') {
  process.stdout.write(`${require('./package.json').version}\n`);
  process.exit(0);
}

// Default: start the MCP server.
const serverPath = path.join(__dirname, 'dist', 'server.js');
childProcess.spawn('node', ['--experimental-modules', serverPath], {
    stdio: 'inherit'
});
