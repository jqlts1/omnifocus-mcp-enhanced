import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function runPerspectiveScript(changeDuringRead = false, task?: object) {
  const script = readFileSync(
    new URL(
      '../../utils/omnifocusScripts/getCustomPerspectiveTasks.js',
      import.meta.url,
    ),
    'utf8',
  );
  class FakeTask {
    constructor(values: object) {
      Object.assign(this, values);
    }
  }
  const originalPerspective = { identifier: 'original' };
  const targetPerspective = { identifier: 'target' };
  const userPerspective = { identifier: 'user' };
  const taskNode = task
    ? { object: new FakeTask(task), children: [] }
    : null;
  const window = {
    perspective: originalPerspective,
    content: {
      get rootNode() {
        if (changeDuringRead) window.perspective = userPerspective;
        return { children: taskNode ? [taskNode] : [] };
      },
    },
  };
  const result = vm.runInNewContext(script, {
    injectedArgs: { perspectiveName: 'Today' },
    Perspective: { Custom: { byName: () => targetPerspective } },
    document: { windows: [window] },
    Task: FakeTask,
  });

  return {
    result: JSON.parse(result),
    window,
    originalPerspective,
    userPerspective,
  };
}

test('custom perspective reads restore the original window perspective', () => {
  const { result, window, originalPerspective } = runPerspectiveScript();
  assert.equal(result.success, true);
  assert.equal(window.perspective, originalPerspective);
});

test('custom perspective reads preserve a user perspective change during collection', () => {
  const { result, window, userPerspective } = runPerspectiveScript(true);
  assert.equal(result.success, true);
  assert.equal(window.perspective, userPerspective);
});

test('custom perspective reads serialize full tag paths', () => {
  const team = { id: { primaryKey: 'tag-team' }, name: '团队', parent: null };
  const member = {
    id: { primaryKey: 'tag-member' },
    name: '守一',
    parent: team,
  };
  const { result } = runPerspectiveScript(false, {
    id: { primaryKey: 'task-1' },
    name: 'Tagged task',
    note: '',
    containingProject: null,
    project: null,
    tags: [member],
    dueDate: null,
    deferDate: null,
    plannedDate: null,
    completed: false,
    flagged: false,
    estimatedMinutes: null,
    repetitionRule: null,
    added: null,
    completedDate: null,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result.taskMap['task-1'].tags)), [
    {
      id: 'tag-member',
      name: '守一',
      path: '团队 / 守一',
      ancestorIds: ['tag-team'],
    },
  ]);
});
