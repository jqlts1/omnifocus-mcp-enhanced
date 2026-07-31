import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler, schema } from './getTasks.js';

const extra = undefined as never;

function stubDependencies() {
  const calls: Array<{ method: string; args: unknown }> = [];
  return {
    calls,
    dependencies: {
      getInboxTasks: async (args: unknown) => {
        calls.push({ method: 'inbox', args });
        return 'inbox result';
      },
      getFlaggedTasks: async (args: unknown) => {
        calls.push({ method: 'flagged', args });
        return 'flagged result';
      },
      getForecastTasks: async (args: unknown) => {
        calls.push({ method: 'forecast', args });
        return 'forecast result';
      },
      getTasksByTag: async (args: unknown) => {
        calls.push({ method: 'tag', args });
        return 'tag result';
      },
      getCustomPerspectiveTasks: async (args: unknown) => {
        calls.push({ method: 'custom', args });
        return 'custom result';
      },
    },
  };
}

test('get_tasks schema enforces source-specific arguments', () => {
  assert.equal(schema.safeParse({ source: 'tag' }).success, false);
  assert.equal(
    schema.safeParse({ source: 'custom', perspectiveName: 'Today' }).success,
    true,
  );
  assert.equal(
    schema.safeParse({ source: 'inbox', tagName: 'Work' }).success,
    false,
  );
  assert.equal(schema.safeParse({ source: 'forecast', days: 0 }).success, false);
});

test('get_tasks routes each source with normalized defaults', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  const scenarios = [
    { source: 'inbox' as const },
    { source: 'flagged' as const, projectFilter: 'Client' },
    { source: 'forecast' as const, days: 14, includeDeferredOnly: true },
    { source: 'tag' as const, tagName: 'Work', exactMatch: true },
    {
      source: 'custom' as const,
      perspectiveName: 'Today',
      displayMode: 'flat' as const,
      limit: 25,
    },
  ];

  for (const scenario of scenarios) {
    const result = await handler(scenario, extra);
    assert.equal('isError' in result, false);
  }

  assert.deepEqual(calls, [
    {
      method: 'inbox',
      args: {
        hideCompleted: true,
        showSubtasks: false,
        maxSubtaskDepth: undefined,
      },
    },
    {
      method: 'flagged',
      args: {
        hideCompleted: true,
        projectFilter: 'Client',
        showSubtasks: false,
        maxSubtaskDepth: undefined,
      },
    },
    {
      method: 'forecast',
      args: {
        days: 14,
        hideCompleted: true,
        includeDeferredOnly: true,
        showSubtasks: false,
        maxSubtaskDepth: undefined,
      },
    },
    {
      method: 'tag',
      args: {
        tagName: 'Work',
        hideCompleted: true,
        exactMatch: true,
        showSubtasks: false,
        maxSubtaskDepth: undefined,
      },
    },
    {
      method: 'custom',
      args: {
        perspectiveName: 'Today',
        hideCompleted: true,
        limit: 25,
        displayMode: 'flat',
        showHierarchy: false,
        groupByProject: true,
      },
    },
  ]);
});

test('get_tasks returns validation errors before invoking a primitive', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  const result = await handler({ source: 'tag' }, extra);

  assert.equal('isError' in result && result.isError, true);
  assert.match(result.content[0].text, /tagName is required/);
  assert.deepEqual(calls, []);
});
