import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

import { registerTools } from './registerTools.js';

interface RegisteredToolCall {
  name: string;
  config: {
    annotations?: ToolAnnotations;
  };
}

function captureTools(): RegisteredToolCall[] {
  const calls: RegisteredToolCall[] = [];
  const server = {
    registerTool(name: string, config: RegisteredToolCall['config']): void {
      calls.push({ name, config });
    },
  } as unknown as McpServer;

  registerTools(server);
  return calls;
}

test('registerTools exposes 41 unique tools through the modern MCP API', () => {
  const calls = captureTools();

  assert.equal(calls.length, 41);
  assert.equal(new Set(calls.map((call) => call.name)).size, calls.length);
});

test('registerTools marks local reads and destructive writes accurately', () => {
  const calls = captureTools();
  const byName = new Map(
    calls.map((call) => [call.name, call.config.annotations]),
  );

  assert.deepEqual(byName.get('filter_tasks'), {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  assert.deepEqual(byName.get('add_omnifocus_task'), {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  });
  assert.deepEqual(byName.get('create_project_from_outline'), {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  });
  assert.deepEqual(byName.get('batch_remove_items'), {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  });
  assert.equal(
    calls.every((call) => call.config.annotations?.openWorldHint === false),
    true,
  );
});
