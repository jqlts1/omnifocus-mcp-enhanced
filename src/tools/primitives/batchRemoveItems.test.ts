import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

interface FakeTask {
  id: { primaryKey: string };
  name: string;
  children: FakeTask[];
}

interface FakeProject {
  id: { primaryKey: string };
  task: { id: { primaryKey: string } };
  name: string;
  flattenedTasks: FakeTask[];
}

function task(id: string, children: FakeTask[] = []): FakeTask {
  return { id: { primaryKey: id }, name: id, children };
}

function project(id: string, tasks: FakeTask[] = []): FakeProject {
  return {
    id: { primaryKey: id },
    task: { id: { primaryKey: `root-${id}` } },
    name: id,
    flattenedTasks: tasks,
  };
}

function runBatch(
  items: { id: string; itemType: 'task' | 'project' }[],
  tasks: FakeTask[],
  projects: FakeProject[],
  failId?: string,
) {
  const script = readFileSync(
    new URL(
      '../../utils/omnifocusScripts/batchRemoveItems.js',
      import.meta.url,
    ),
    'utf8',
  );
  const flattenedTasks = [...tasks];
  const flattenedProjects = [...projects];
  const undoStack: (() => void)[] = [];
  const document = {
    get canUndo() {
      return undoStack.length > 0;
    },
    undo() {
      const undo = undoStack.pop();
      if (!undo) throw new Error('Nothing to undo');
      undo();
    },
  };
  const pendingDeleted: {
    object: FakeTask | FakeProject;
    index: number;
    kind: 'task' | 'project';
  }[] = [];
  const deleteObject = (object: FakeTask | FakeProject) => {
    const id = object.id.primaryKey;
    if (id === failId) throw new Error('simulated delete failure');
    const taskIndex = flattenedTasks.findIndex((item) => item === object);
    if (taskIndex >= 0) {
      flattenedTasks.splice(taskIndex, 1);
      pendingDeleted.push({ object, index: taskIndex, kind: 'task' });
    } else {
      const projectIndex = flattenedProjects.findIndex(
        (item) => item === object,
      );
      if (projectIndex >= 0) {
        flattenedProjects.splice(projectIndex, 1);
        pendingDeleted.push({ object, index: projectIndex, kind: 'project' });
      }
    }
    undoStack.splice(0, undoStack.length, () => {
      for (let index = pendingDeleted.length - 1; index >= 0; index -= 1) {
        const deleted = pendingDeleted[index];
        if (deleted.kind === 'task') {
          flattenedTasks.splice(deleted.index, 0, deleted.object as FakeTask);
        } else {
          flattenedProjects.splice(
            deleted.index,
            0,
            deleted.object as FakeProject,
          );
        }
      }
      pendingDeleted.length = 0;
    });
  };

  const raw = vm.runInNewContext(script, {
    injectedArgs: { items },
    flattenedTasks,
    flattenedProjects,
    deleteObject,
    document,
    JSON,
    String,
    Set,
    Array,
  });
  return { result: JSON.parse(raw), flattenedTasks, flattenedProjects };
}

test('batch removal preflights every stable ID before deleting anything', () => {
  const first = task('first');
  const { result, flattenedTasks } = runBatch(
    [
      { id: 'first', itemType: 'task' },
      { id: 'missing', itemType: 'task' },
    ],
    [first],
    [],
  );

  assert.equal(result.success, false);
  assert.equal(flattenedTasks.includes(first), true);
});

test('batch removal deletes and verifies tasks and projects', () => {
  const child = task('child');
  const parent = task('parent', [child]);
  const alpha = project('alpha', [parent, child]);
  const { result, flattenedTasks, flattenedProjects } = runBatch(
    [
      { id: 'parent', itemType: 'task' },
      { id: 'alpha', itemType: 'project' },
    ],
    [parent, child],
    [alpha],
  );

  assert.equal(result.success, true);
  assert.equal(result.removedCount, 2);
  assert.equal(result.results[0].cascadeCount, 1);
  assert.equal(result.results[1].cascadeCount, 2);
  assert.equal(flattenedTasks.includes(parent), false);
  assert.equal(flattenedProjects.includes(alpha), false);
  assert.equal(
    result.results.every((item: { verified: boolean }) => item.verified),
    true,
  );
});

test('batch removal rolls back completed deletions when execution fails', () => {
  const first = task('first');
  const second = task('second');
  const { result, flattenedTasks } = runBatch(
    [
      { id: 'first', itemType: 'task' },
      { id: 'second', itemType: 'task' },
    ],
    [first, second],
    [],
    'second',
  );

  assert.equal(result.success, false);
  assert.match(result.error, /Completed deletions were restored/);
  assert.deepEqual(flattenedTasks, [first, second]);
});
