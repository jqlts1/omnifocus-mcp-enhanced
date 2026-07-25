import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { formatNotification } from './taskNotifications.js';

function runScript(injectedArgs: Record<string, unknown>, tasks: any[]): any {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/taskNotifications.js', import.meta.url),
    'utf8'
  );
  return JSON.parse(vm.runInNewContext(script, { injectedArgs, flattenedTasks: tasks }) as string);
}

function absoluteNotification(iso: string) {
  return {
    kind: '[object Task.Notification.Kind: Absolute]',
    absoluteFireDate: new Date(iso),
    isSnoozed: false,
    get relativeFireOffset(): number { throw new Error('absolute has no offset'); }
  };
}

function relativeNotification(seconds: number) {
  return {
    kind: '[object Task.Notification.Kind: DueRelative]',
    relativeFireOffset: seconds,
    isSnoozed: false,
    get absoluteFireDate(): Date { throw new Error('relative has no absolute date'); }
  };
}

function makeTask(id: string, name: string, notifications: any[] = [], dueDate: Date | null = null) {
  return {
    id: { primaryKey: id },
    name,
    dueDate,
    notifications,
    addNotification(arg: unknown) {
      const created = typeof arg === 'number'
        ? relativeNotification(arg)
        : absoluteNotification((arg as Date).toISOString());
      this.notifications.push(created);
      return created;
    },
    removeNotification(target: unknown) {
      const idx = this.notifications.indexOf(target);
      if (idx >= 0) this.notifications.splice(idx, 1);
    }
  };
}

test('taskNotifications list serializes absolute and relative kinds safely', () => {
  const task = makeTask('t1', 'Task', [
    absoluteNotification('2026-03-05T09:00:00.000Z'),
    relativeNotification(-1800)
  ]);

  const result = runScript({ action: 'list', taskId: 't1' }, [task]);

  assert.equal(result.success, true);
  assert.equal(result.notifications.length, 2);
  assert.equal(result.notifications[0].kind, 'absolute');
  assert.equal(result.notifications[0].absoluteFireDate, '2026-03-05T09:00:00.000Z');
  assert.equal(result.notifications[0].relativeFireOffset, null);
  assert.equal(result.notifications[1].kind, 'dueRelative');
  assert.equal(result.notifications[1].relativeFireOffset, -1800);
  assert.equal(result.notifications[1].absoluteFireDate, null);
});

test('taskNotifications add supports absolute dates', () => {
  const task = makeTask('t1', 'Task');
  const result = runScript(
    { action: 'add', taskId: 't1', absoluteDate: '2026-03-05T09:00:00.000Z' },
    [task]
  );

  assert.equal(result.success, true);
  assert.equal(result.notifications.length, 1);
  assert.equal(result.notifications[0].kind, 'absolute');
});

test('taskNotifications add converts relativeMinutes to seconds and requires a due date', () => {
  const withDue = makeTask('t1', 'Task', [], new Date('2026-03-06T10:00:00.000Z'));
  const ok = runScript({ action: 'add', taskId: 't1', relativeMinutes: -30 }, [withDue]);
  assert.equal(ok.success, true);
  assert.equal(ok.notifications[0].relativeFireOffset, -1800);

  const noDue = makeTask('t2', 'No Due');
  const fail = runScript({ action: 'add', taskId: 't2', relativeMinutes: -30 }, [noDue]);
  assert.equal(fail.success, false);
  assert.match(fail.error, /no due date/);
});

test('taskNotifications remove by index and removeAll', () => {
  const task = makeTask('t1', 'Task', [
    absoluteNotification('2026-03-05T09:00:00.000Z'),
    relativeNotification(-600)
  ]);

  const one = runScript({ action: 'remove', taskId: 't1', index: 0 }, [task]);
  assert.equal(one.success, true);
  assert.equal(one.removedCount, 1);
  assert.equal(one.notifications.length, 1);

  const all = runScript({ action: 'remove', taskId: 't1', removeAll: true }, [task]);
  assert.equal(all.success, true);
  assert.equal(all.notifications.length, 0);
});

test('taskNotifications rejects out-of-range index and ambiguous names', () => {
  const task = makeTask('t1', 'Task', [absoluteNotification('2026-03-05T09:00:00.000Z')]);
  const oor = runScript({ action: 'remove', taskId: 't1', index: 5 }, [task]);
  assert.equal(oor.success, false);
  assert.match(oor.error, /out of range/);

  const a = makeTask('a', 'Dup');
  const b = makeTask('b', 'Dup');
  const ambiguous = runScript({ action: 'list', taskName: 'Dup' }, [a, b]);
  assert.equal(ambiguous.success, false);
  assert.match(ambiguous.error, /Ambiguous task name/);
});

test('formatNotification renders human-readable output', () => {
  assert.match(
    formatNotification({ index: 0, kind: 'dueRelative', absoluteFireDate: null, relativeFireOffset: -1800, isSnoozed: false }),
    /30 min before due/
  );
  assert.match(
    formatNotification({ index: 1, kind: 'absolute', absoluteFireDate: '2026-03-05T09:00:00.000Z', relativeFireOffset: null, isSnoozed: false }),
    /absolute — fires at/
  );
});
