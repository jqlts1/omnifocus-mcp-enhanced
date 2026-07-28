import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildBoundedSnapshot, registerResources } from './resources.js';

test('bounded snapshots distinguish total matches from returned details', async () => {
  const snapshot = await buildBoundedSnapshot(
    { flagged: true },
    2,
    async () => ({ total: 3, byStatus: {} }),
    async () => [
      { id: 'one', name: 'One' },
      { id: 'two', name: 'Two' },
    ],
  );

  assert.equal(snapshot.totalCount, 3);
  assert.equal(snapshot.returnedCount, 2);
  assert.equal(snapshot.truncated, true);
  assert.equal(snapshot.tasks.length, 2);
});

test('registerResources uses the modern MCP resource API', () => {
  const calls: string[] = [];
  const server = {
    registerResource(name: string): void {
      calls.push(name);
    },
  } as unknown as McpServer;

  registerResources(server);
  assert.deepEqual(calls, ['inbox', 'today', 'projects']);
});
