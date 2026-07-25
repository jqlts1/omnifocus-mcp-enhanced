import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function runDuplicateScript(context: Record<string, unknown>): any {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/duplicateTask.js', import.meta.url),
    'utf8'
  );
  return JSON.parse(vm.runInNewContext(script, context) as string);
}

function makeTask(id: string, name: string, children: any[] = []) {
  const task: any = {
    id: { primaryKey: id },
    name,
    parent: null,
    containingProject: null,
    children
  };
  return task;
}

test('duplicateTask resolves by id and reports subtask count', () => {
  const child = makeTask('c1', 'Child');
  const source = makeTask('t1', 'Parent', [child]);
  const clone = makeTask('t1-copy', 'Parent', [makeTask('c1-copy', 'Child')]);

  const result = runDuplicateScript({
    injectedArgs: { taskId: 't1', includeSubtasks: true },
    flattenedTasks: [source, child],
    inbox: { ending: 'inbox-end' },
    duplicateTasks: (_tasks: any[], _loc: unknown) => [clone],
    deleteObject: () => {}
  });

  assert.equal(result.success, true);
  assert.equal(result.newTaskId, 't1-copy');
  assert.equal(result.childrenCount, 1);
});

test('duplicateTask renames the copy when newName provided', () => {
  const source = makeTask('t1', 'Original');
  const clone = makeTask('t1-copy', 'Original');

  const result = runDuplicateScript({
    injectedArgs: { taskId: 't1', newName: 'Renamed Copy' },
    flattenedTasks: [source],
    inbox: { ending: 'inbox-end' },
    duplicateTasks: () => [clone],
    deleteObject: () => {}
  });

  assert.equal(result.success, true);
  assert.equal(result.name, 'Renamed Copy');
});

test('duplicateTask strips subtasks when includeSubtasks is false', () => {
  const source = makeTask('t1', 'Parent');
  const cloneChildren = [makeTask('cc1', 'CC1'), makeTask('cc2', 'CC2')];
  const clone = makeTask('t1-copy', 'Parent', cloneChildren);
  const deleted: string[] = [];

  const result = runDuplicateScript({
    injectedArgs: { taskId: 't1', includeSubtasks: false },
    flattenedTasks: [source],
    inbox: { ending: 'inbox-end' },
    duplicateTasks: () => [clone],
    deleteObject: (obj: any) => { deleted.push(obj.id.primaryKey); }
  });

  assert.equal(result.success, true);
  assert.deepEqual(deleted, ['cc1', 'cc2']);
});

test('duplicateTask rejects ambiguous name matches', () => {
  const a = makeTask('a', 'Dup');
  const b = makeTask('b', 'Dup');

  const result = runDuplicateScript({
    injectedArgs: { taskName: 'Dup' },
    flattenedTasks: [a, b],
    inbox: { ending: 'inbox-end' },
    duplicateTasks: () => [],
    deleteObject: () => {}
  });

  assert.equal(result.success, false);
  assert.match(result.error, /Ambiguous task name/);
});

test('duplicateTask errors when task not found', () => {
  const result = runDuplicateScript({
    injectedArgs: { taskId: 'missing' },
    flattenedTasks: [],
    inbox: { ending: 'inbox-end' },
    duplicateTasks: () => [],
    deleteObject: () => {}
  });

  assert.equal(result.success, false);
  assert.match(result.error, /Task not found/);
});
