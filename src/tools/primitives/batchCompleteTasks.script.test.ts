import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

interface FakeTask {
  id: { primaryKey: string };
  name: string;
  completed: boolean;
  completionDate: Date | null;
  repetitionRule: { ruleString: string; firstDateAfterDate: (d: Date) => Date | null } | null;
  markComplete: (date?: Date) => void;
  markIncomplete: () => void;
}

interface RunOptions {
  existing?: FakeTask[];
  failOn?: string; // taskId that should throw on markComplete/markIncomplete
  corruptCompletion?: string; // taskId whose completion state won't match
  corruptDate?: string; // taskId whose completion date won't match
  failRestore?: boolean;
}

function runScript(
  items: Array<{ taskId: string; action: string; completionDate?: string }>,
  options: RunOptions = {},
): { result: any; tasks: FakeTask[] } {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/batchCompleteTasks.js', import.meta.url),
    'utf8',
  );

  const tasks: FakeTask[] = options.existing || [
    {
      id: { primaryKey: 'task-1' },
      name: 'Task one',
      completed: false,
      completionDate: null,
      repetitionRule: null,
      markComplete() {},
      markIncomplete() {},
    },
    {
      id: { primaryKey: 'task-2' },
      name: 'Task two',
      completed: true,
      completionDate: new Date('2026-07-27T10:00:00.000Z'),
      repetitionRule: null,
      markComplete() {},
      markIncomplete() {},
    },
    {
      id: { primaryKey: 'task-repeat' },
      name: 'Weekly admin',
      completed: false,
      completionDate: null,
      repetitionRule: {
        ruleString: 'FREQ=WEEKLY;BYDAY=FR',
        firstDateAfterDate: () => new Date('2026-08-01T10:00:00.000Z'),
      },
      markComplete() {},
      markIncomplete() {},
    },
  ];

  let deleteCallCount = 0;
  const deletedIds: string[] = [];

  for (const task of tasks) {
    task.markComplete = function (date?: Date) {
      if (options.failOn === task.id.primaryKey) {
        throw new Error('simulated markComplete failure');
      }
      this.completed = true;
      this.completionDate = date || new Date();

      // Simulate repeating task generating a new instance
      if (this.repetitionRule && this.id.primaryKey === 'task-repeat') {
        const newTask: FakeTask = {
          id: { primaryKey: 'task-repeat-new' },
          name: this.name,
          completed: false,
          completionDate: null,
          repetitionRule: this.repetitionRule,
          markComplete() {},
          markIncomplete() {},
        };
        tasks.push(newTask);
      }

      if (options.corruptCompletion === this.id.primaryKey) {
        this.completed = false;
      }
      if (options.corruptDate === this.id.primaryKey) {
        this.completionDate = new Date('1999-01-01T00:00:00.000Z');
      }
    };

    task.markIncomplete = function () {
      if (options.failOn === task.id.primaryKey) {
        throw new Error('simulated markIncomplete failure');
      }
      if (options.failRestore && deleteCallCount > 0) {
        throw new Error('simulated restore failure');
      }
      this.completed = false;
      this.completionDate = null;
      if (options.corruptCompletion === this.id.primaryKey) {
        this.completed = true;
      }
    };
  }

  const raw = vm.runInNewContext(script, {
    injectedArgs: { items },
    flattenedTasks: tasks,
    Task: {
      byIdentifier: (id: string) => tasks.find((t) => t.id.primaryKey === id) || null,
    },
    deleteObject: (task: FakeTask) => {
      deleteCallCount += 1;
      deletedIds.push(task.id.primaryKey);
      const index = tasks.indexOf(task);
      if (index >= 0) tasks.splice(index, 1);
    },
    JSON,
    String,
    Date,
    Number,
    Array,
    Math,
  });

  return { result: JSON.parse(raw), tasks };
}

test('batch complete script marks tasks complete and verifies', () => {
  const run = runScript([
    { taskId: 'task-1', action: 'complete' },
    { taskId: 'task-2', action: 'incomplete' },
  ]);

  assert.equal(run.result.success, true);
  assert.equal(run.result.items[0].status, 'completed');
  assert.equal(run.result.items[1].status, 'incompleted');
  assert.equal(run.tasks[0].completed, true);
  assert.equal(run.tasks[1].completed, false);
});

test('batch complete script accepts completionDate', () => {
  const run = runScript([
    { taskId: 'task-1', action: 'complete', completionDate: '2026-07-28T18:00:00+08:00' },
  ]);

  assert.equal(run.result.success, true);
  assert.ok(run.tasks[0].completionDate);
  const diff = Math.abs(
    run.tasks[0].completionDate!.getTime() - new Date('2026-07-28T18:00:00+08:00').getTime(),
  );
  assert.ok(diff < 1000);
});

test('batch complete script reports unchanged for idempotent items', () => {
  const run = runScript([
    { taskId: 'task-1', action: 'incomplete' },
    { taskId: 'task-2', action: 'complete' },
  ]);

  assert.equal(run.result.success, true);
  assert.equal(run.result.items[0].status, 'unchanged');
  assert.equal(run.result.items[1].status, 'unchanged');
});

test('batch complete script reports generated task for repeating', () => {
  const run = runScript([{ taskId: 'task-repeat', action: 'complete' }]);

  assert.equal(run.result.success, true);
  assert.equal(run.result.items[0].generatedTaskId, 'task-repeat-new');
  assert.equal(run.result.items[0].nextOccurrence, '2026-08-01T10:00:00.000Z');
  assert.equal(run.tasks.length, 4); // original 3 + new instance
});

test('batch complete script restores on mid-batch failure', () => {
  const run = runScript(
    [
      { taskId: 'task-1', action: 'complete' },
      { taskId: 'task-2', action: 'incomplete' },
    ],
    { failOn: 'task-2' },
  );

  assert.equal(run.result.code, 'COMPLETION_FAILED_RESTORED');
  assert.equal(run.result.restored, true);
  assert.equal(run.tasks[0].completed, false); // restored
  assert.equal(run.tasks[1].completed, true); // never changed
});

test('batch complete script restores on verification mismatch', () => {
  const run = runScript(
    [
      { taskId: 'task-1', action: 'complete' },
      { taskId: 'task-2', action: 'incomplete' },
    ],
    { corruptCompletion: 'task-2' },
  );

  assert.equal(run.result.code, 'COMPLETION_VERIFICATION_FAILED_RESTORED');
  assert.equal(run.result.restored, true);
  assert.equal(run.tasks[0].completed, false); // restored
});

test('batch complete script deletes generated task on restore', () => {
  const run = runScript([{ taskId: 'task-repeat', action: 'complete' }], {
    corruptCompletion: 'task-repeat',
  });

  assert.equal(run.result.code, 'COMPLETION_VERIFICATION_FAILED_RESTORED');
  assert.equal(run.tasks.length, 3); // new instance was deleted
  assert.ok(!run.tasks.find((t) => t.id.primaryKey === 'task-repeat-new'));
});

test('batch complete script rejects missing task ID before writing', () => {
  const run = runScript([{ taskId: 'missing-task', action: 'complete' }]);

  assert.equal(run.result.code, 'INVALID_COMPLETION');
  assert.match(run.result.error, /not found/);
});
