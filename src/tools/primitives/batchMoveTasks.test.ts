import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

interface FakeTask {
  id: { primaryKey: string };
  name: string;
  parent: FakeTask | null;
  containingProject: FakeProject | null;
  inInbox: boolean;
  ending: { kind: 'parent'; object: FakeTask };
}

interface FakeProject {
  id: { primaryKey: string };
  name: string;
  task: { id: { primaryKey: string } };
  ending: { kind: 'project'; object: FakeProject };
}

function project(id: string, rootTaskId = id): FakeProject {
  const value = { id: { primaryKey: id }, task: { id: { primaryKey: rootTaskId } }, name: id } as FakeProject;
  value.ending = { kind: 'project', object: value };
  return value;
}

function task(id: string, location: FakeProject | FakeTask | 'inbox'): FakeTask {
  const value = {
    id: { primaryKey: id },
    name: id,
    parent: typeof location === 'object' && 'parent' in location ? location : null,
    containingProject: typeof location === 'object' && !('parent' in location) ? location : null,
    inInbox: location === 'inbox',
  } as FakeTask;
  value.ending = { kind: 'parent', object: value };
  if (value.parent) value.containingProject = value.parent.containingProject;
  return value;
}

function runBatch(moves: any[], tasks: FakeTask[], projects: FakeProject[], failure?: { taskId: string; once?: boolean }): any {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/batchMoveTasks.js', import.meta.url),
    'utf8',
  );
  const inbox = { ending: { kind: 'inbox' } };
  let failureTriggered = false;
  const moveTasks = ([item]: FakeTask[], destination: any) => {
    if (
      item.id.primaryKey === failure?.taskId &&
      (!failure.once || !failureTriggered)
    ) {
      failureTriggered = true;
      throw new Error('simulated move failure');
    }
    item.parent = destination.kind === 'parent' ? destination.object : null;
    item.containingProject = destination.kind === 'project'
      ? destination.object
      : destination.kind === 'parent'
        ? destination.object.containingProject
        : null;
    item.inInbox = destination.kind === 'inbox';
  };

  const result = vm.runInNewContext(script, {
    injectedArgs: { moves },
    flattenedTasks: tasks,
    flattenedProjects: projects,
    inbox,
    moveTasks,
    JSON,
    String,
    Set,
    Array,
  });
  return JSON.parse(result);
}

test('batch move preflights all destinations before moving anything', () => {
  const alpha = project('project-alpha');
  const first = task('first', 'inbox');
  const second = task('second', 'inbox');

  const result = runBatch([
    { taskId: 'first', projectId: alpha.id.primaryKey },
    { taskId: 'second', projectId: 'missing-project' },
  ], [first, second], [alpha]);

  assert.equal(result.success, false);
  assert.equal(first.inInbox, true);
  assert.equal(second.inInbox, true);
});

test('batch move rejects descendant cycles before moving anything', () => {
  const alpha = project('project-alpha');
  const parent = task('parent', alpha);
  const child = task('child', parent);

  const result = runBatch([
    { taskId: 'parent', parentTaskId: 'child' },
  ], [parent, child], [alpha]);

  assert.equal(result.success, false);
  assert.match(result.error, /descendants/);
  assert.equal(parent.parent, null);
});

test('batch move executes and verifies project, parent, and inbox destinations', () => {
  const alpha = project('project-alpha');
  const beta = project('project-beta');
  const parent = task('parent', beta);
  const first = task('first', 'inbox');
  const second = task('second', alpha);
  const third = task('third', beta);

  const result = runBatch([
    { taskId: 'first', projectId: beta.id.primaryKey },
    { taskId: 'second', parentTaskId: parent.id.primaryKey },
    { taskId: 'third', inbox: true },
  ], [parent, first, second, third], [alpha, beta]);

  assert.equal(result.success, true);
  assert.equal(result.movedCount, 3);
  assert.equal(first.containingProject?.id.primaryKey, beta.id.primaryKey);
  assert.equal(second.parent?.id.primaryKey, parent.id.primaryKey);
  assert.equal(third.inInbox, true);
  assert.equal(result.results.every((item: any) => item.verified), true);
});

test('batch move resolves AppleScript project IDs through the project root task', () => {
  const alpha = project('project-alpha', 'root-task-alpha');
  const first = task('first', 'inbox');

  const result = runBatch([
    { taskId: 'first', projectId: 'root-task-alpha' },
  ], [first], [alpha]);

  assert.equal(result.success, true);
  assert.equal(first.containingProject?.id.primaryKey, alpha.id.primaryKey);
});

test('batch move rolls back completed moves when execution fails', () => {
  const alpha = project('project-alpha');
  const beta = project('project-beta');
  const first = task('first', alpha);
  const second = task('second', alpha);

  const result = runBatch([
    { taskId: 'first', projectId: beta.id.primaryKey },
    { taskId: 'second', projectId: beta.id.primaryKey },
  ], [first, second], [alpha, beta], { taskId: 'second', once: true });

  assert.equal(result.success, false);
  assert.equal(first.containingProject?.id.primaryKey, alpha.id.primaryKey);
  assert.equal(second.containingProject?.id.primaryKey, alpha.id.primaryKey);
});

test('batch move marks an existing destination as unchanged', () => {
  const alpha = project('project-alpha');
  const first = task('first', alpha);

  const result = runBatch([
    { taskId: 'first', projectId: alpha.id.primaryKey },
  ], [first], [alpha]);

  assert.equal(result.success, true);
  assert.equal(result.movedCount, 0);
  assert.equal(result.unchangedCount, 1);
  assert.equal(result.results[0].changed, false);
  assert.equal(result.results[0].verified, true);
});
