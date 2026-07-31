import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler, schema } from './manageTaskNotifications.js';

const extra = undefined as never;
const notification = {
  index: 0,
  kind: 'dueRelative',
  absoluteFireDate: null,
  relativeFireOffset: -1800,
  isSnoozed: false,
};

function stubDependencies() {
  const calls: Array<{ method: string; args: unknown }> = [];
  return {
    calls,
    dependencies: {
      listTaskNotifications: async (args: unknown) => {
        calls.push({ method: 'list', args });
        return {
          success: true,
          taskName: 'Submit report',
          notifications: [notification],
        };
      },
      addTaskNotification: async (args: unknown) => {
        calls.push({ method: 'add', args });
        return {
          success: true,
          taskName: 'Submit report',
          added: notification,
          notifications: [notification],
        };
      },
      removeTaskNotification: async (args: unknown) => {
        calls.push({ method: 'remove', args });
        return {
          success: true,
          taskName: 'Submit report',
          removedCount: 1,
          notifications: [],
        };
      },
    },
  };
}

test('manage_task_notifications schema enforces action contracts', () => {
  assert.equal(schema.safeParse({ action: 'list' }).success, false);
  assert.equal(
    schema.safeParse({
      action: 'add',
      taskId: 'task-1',
      absoluteDate: '2026-08-01T09:00:00',
      relativeMinutes: -30,
    }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ action: 'remove', taskId: 'task-1', index: -1 }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ action: 'list', taskId: 'task-1', index: 0 }).success,
    false,
  );
});

test('manage_task_notifications routes list, add, and remove', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  const listResult = await handler(
    { action: 'list', taskId: 'task-1' },
    extra,
  );
  const addResult = await handler(
    { action: 'add', taskName: 'Submit report', relativeMinutes: -30 },
    extra,
  );
  const removeResult = await handler(
    { action: 'remove', taskId: 'task-1', removeAll: true },
    extra,
  );

  assert.match(listResult.content[0].text, /30 min before due/);
  assert.match(addResult.content[0].text, /Added notification/);
  assert.match(removeResult.content[0].text, /Removed 1 notification/);
  assert.deepEqual(calls, [
    {
      method: 'list',
      args: { taskId: 'task-1', taskName: undefined },
    },
    {
      method: 'add',
      args: {
        taskId: undefined,
        taskName: 'Submit report',
        absoluteDate: undefined,
        relativeMinutes: -30,
      },
    },
    {
      method: 'remove',
      args: {
        taskId: 'task-1',
        taskName: undefined,
        index: undefined,
        removeAll: true,
      },
    },
  ]);
});

test('manage_task_notifications rejects invalid arguments before mutation', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  const result = await handler({ action: 'remove', taskId: 'task-1' }, extra);

  assert.equal('isError' in result && result.isError, true);
  assert.match(result.content[0].text, /exactly one of index or removeAll/);
  assert.deepEqual(calls, []);
});
