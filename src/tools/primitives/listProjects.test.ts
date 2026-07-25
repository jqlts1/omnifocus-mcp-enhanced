import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ACTIVE = 'ACTIVE';
const DONE = 'DONE';
const AVAILABLE = 'AVAILABLE';
const BLOCKED = 'BLOCKED';

function runScript(injectedArgs: Record<string, unknown>, projects: any[]): any {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/listProjects.js', import.meta.url),
    'utf8'
  );
  return JSON.parse(vm.runInNewContext(script, {
    injectedArgs,
    flattenedProjects: projects,
    Project: { Status: { Active: ACTIVE, OnHold: 'ONHOLD', Done: DONE, Dropped: 'DROPPED' } },
    Task: { Status: { Available: AVAILABLE, Next: 'NEXT', Blocked: BLOCKED } }
  }) as string);
}

function makeTask(completed: boolean, status: string) {
  return { completed, taskStatus: status };
}

function makeProject(id: string, name: string, status: string, tasks: any[]) {
  return {
    id: { primaryKey: id },
    name,
    status,
    parentFolder: null,
    folder: null,
    note: '',
    dueDate: null,
    deferDate: null,
    sequential: false,
    flattenedTasks: tasks
  };
}

test('listProjects flags stalled projects (work remains but nothing actionable)', () => {
  const stalled = makeProject('p1', 'Stalled', ACTIVE, [
    makeTask(false, BLOCKED),
    makeTask(true, AVAILABLE)
  ]);
  const healthy = makeProject('p2', 'Healthy', ACTIVE, [
    makeTask(false, AVAILABLE)
  ]);

  const result = runScript({ status: 'active' }, [stalled, healthy]);

  assert.equal(result.success, true);
  assert.equal(result.count, 2);

  const p1 = result.projects.find((p: any) => p.id === 'p1');
  assert.equal(p1.remainingTaskCount, 1);
  assert.equal(p1.availableTaskCount, 0);
  assert.equal(p1.isStalled, true);

  const p2 = result.projects.find((p: any) => p.id === 'p2');
  assert.equal(p2.availableTaskCount, 1);
  assert.equal(p2.isStalled, false);
});

test('listProjects does not flag empty projects as stalled', () => {
  const empty = makeProject('p3', 'Empty', ACTIVE, []);
  const result = runScript({ status: 'active' }, [empty]);

  assert.equal(result.projects[0].remainingTaskCount, 0);
  assert.equal(result.projects[0].isStalled, false);
});

test('listProjects filters by status and supports all', () => {
  const active = makeProject('a', 'A', ACTIVE, []);
  const done = makeProject('d', 'D', DONE, []);

  const onlyActive = runScript({ status: 'active' }, [active, done]);
  assert.deepEqual(onlyActive.projects.map((p: any) => p.id), ['a']);

  const all = runScript({ status: 'all' }, [active, done]);
  assert.equal(all.count, 2);
});
