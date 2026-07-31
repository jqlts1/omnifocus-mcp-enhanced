import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { registerTools } from '../dist/tools/registerTools.js';

const installer = await readFile(new URL('../skills/omnifocus-cli/install.sh', import.meta.url), 'utf8');

function registeredCommandNames() {
  const names = [];
  registerTools({
    registerTool(name) {
      names.push(name);
    },
  });
  return names.map((name) => name.replaceAll('_', '-')).sort();
}

function checklistCommandNames() {
  const declaration = installer.match(/^REQUIRED_COMMANDS=\(\n([\s\S]*?)^\)$/m);
  assert.ok(declaration, 'install.sh must declare a REQUIRED_COMMANDS array');
  return declaration[1].split(/\s+/).filter(Boolean).sort();
}

// The installer aborts when a checklist entry is absent from the generated CLI,
// and the generated command set comes from the server's live tool list. A
// checklist naming a tool the server no longer registers therefore makes
// install-skill fail on a correctly installed package, which is unrecoverable
// from the user's side. Keep the two lists identical.
test('installer checklist names exactly the tools the server registers', () => {
  assert.deepEqual(checklistCommandNames(), registeredCommandNames());
});

// mcporter resolves the generated runtime from PATH when --runtime is omitted,
// emitting a `#!/usr/bin/env bun` shebang whenever Bun is installed. Agents
// invoke the CLI from shells with a narrower PATH, where that shebang cannot
// exec. Node 18+ is a hard preflight requirement, so pin it.
test('generated CLI runtime is pinned to node', () => {
  assert.match(installer, /generate-cli \\\n(?:\s+--\S+[^\n]*\\\n)*?\s+--runtime node \\\n/);
});

// Without an explicit lifecycle, mcporter treats the server as ephemeral: every
// CLI call re-resolves `npx -y` and cold starts a server, roughly doubling wall
// time. `mcporter config add` has no --lifecycle flag, so the installer patches
// the entry itself and then asserts the value reached the bundle.
test('installer opts the server into keep-alive and verifies it landed', () => {
  assert.match(installer, /entry\.lifecycle = "keep-alive"/);
  assert.match(installer, /grep -q '"lifecycle"' "\$TARGET_DIR\/bin\/omnifocus-enhanced\.ts"/);
});

// The old message blamed a stale server and told users to clear the npm cache.
// The installer pins the server to its own version, so that diagnosis is
// impossible by construction and sends users into an endless cache-clear loop.
test('missing-command failure does not blame a stale package', () => {
  assert.doesNotMatch(installer, /npm cache clean/);
});
