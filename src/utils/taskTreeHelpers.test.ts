import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const STATUS = {
  Available: 'AVAILABLE',
  Blocked: 'BLOCKED',
  Completed: 'COMPLETED',
  Dropped: 'DROPPED',
  DueSoon: 'DUE_SOON',
  Next: 'NEXT',
  Overdue: 'OVERDUE',
};

function task(
  id: string,
  status = STATUS.Available,
  children: any[] = [],
): any {
  return {
    id: { primaryKey: id },
    name: id,
    note: '',
    taskStatus: status,
    flagged: false,
    dueDate: null,
    deferDate: null,
    plannedDate: null,
    estimatedMinutes: null,
    containingProject: null,
    inInbox: true,
    tags: [],
    children,
  };
}

function loadHelpers(): {
  serialize: (task: any, args: any, hideCompleted: boolean) => any;
  repetition: (task: any) => any;
} {
  const script = readFileSync(
    new URL('./omnifocusScripts/taskTreeHelpers.js', import.meta.url),
    'utf8',
  );
  const context: Record<string, unknown> = {
    Task: {
      Status: STATUS,
      RepetitionScheduleType: {
        Regularly: 'REGULARLY',
        FromCompletion: 'FROM_COMPLETION',
      },
      AnchorDateKey: {
        DueDate: 'DUE',
        DeferDate: 'DEFER',
        PlannedDate: 'PLANNED',
      },
    },
    Math,
    Number,
    Object,
    Date,
  };
  vm.runInNewContext(
    `${script}\nthis.serialize = omnifocusMcpSerializeTask;\nthis.repetition = omnifocusMcpRepetition;`,
    context,
  );
  return context as never;
}

function loadSerializer(): any {
  return loadHelpers().serialize;
}

test('task tree serializer counts visible children and hides completed descendants', () => {
  const serialize = loadSerializer();
  const parent = task('parent', STATUS.Available, [
    task('remaining'),
    task('completed', STATUS.Completed),
    task('dropped', STATUS.Dropped),
  ]);

  const result = serialize(parent, { showSubtasks: true }, true);
  assert.equal(result.childrenCount, 1);
  assert.deepEqual(
    Array.from(result.children, (child: any) => child.id),
    ['remaining'],
  );
});

test('task tree serializer enforces maxSubtaskDepth', () => {
  const serialize = loadSerializer();
  const parent = task('parent', STATUS.Available, [
    task('child', STATUS.Available, [task('grandchild')]),
  ]);

  const result = serialize(
    parent,
    { showSubtasks: true, maxSubtaskDepth: 1 },
    true,
  );
  assert.equal(result.children.length, 1);
  assert.equal(result.children[0].children.length, 0);
  assert.equal(result.children[0].childrenTruncated, true);
  assert.equal(result.children[0].childrenCount, 1);
});

test('task tree serializer omits notes and tags throughout compact trees', () => {
  const serialize = loadSerializer();
  const child = task('child');
  child.note = 'child secret';
  child.tags = [{ id: { primaryKey: 'tag-child' }, name: 'private' }];
  const parent = task('parent', STATUS.Available, [child]);
  parent.note = 'parent secret';
  parent.tags = [{ id: { primaryKey: 'tag-parent' }, name: 'private' }];

  const compact = serialize(
    parent,
    { showSubtasks: true, outputMode: 'compact' },
    true,
  );
  assert.equal('note' in compact, false);
  assert.equal('tags' in compact, false);
  assert.equal('note' in compact.children[0], false);
  assert.equal('tags' in compact.children[0], false);

  const detailed = serialize(parent, { showSubtasks: true }, true);
  assert.equal(detailed.note, 'parent secret');
  assert.equal(detailed.tags[0].name, 'private');
});

test('task tree serializer marks repeating tasks in every output mode', () => {
  const serialize = loadSerializer();
  const repeating = task('repeating');
  repeating.repetitionRule = { ruleString: 'FREQ=WEEKLY' };

  assert.equal(serialize(repeating, {}, true).isRepeating, true);
  assert.equal(
    serialize(repeating, { outputMode: 'compact' }, true).isRepeating,
    true,
  );
  assert.equal(serialize(task('plain'), {}, true).isRepeating, false);
  assert.equal('repetition' in serialize(repeating, {}, true), false);
});

test('repetition serializer maps enums and the next occurrence', () => {
  const { repetition } = loadHelpers();
  const next = new Date('2026-08-07T10:00:00.000Z');
  const repeating = task('repeating');
  repeating.repetitionRule = {
    ruleString: 'FREQ=WEEKLY;BYDAY=FR',
    scheduleType: 'FROM_COMPLETION',
    anchorDateKey: 'PLANNED',
    catchUpAutomatically: true,
    firstDateAfterDate: () => next,
  };

  assert.deepEqual(
    { ...repetition(repeating) },
    {
      ruleString: 'FREQ=WEEKLY;BYDAY=FR',
      scheduleType: 'FromCompletion',
      anchorDateKey: 'PlannedDate',
      catchUpAutomatically: true,
      nextOccurrence: next.toISOString(),
    },
  );
});

test('repetition serializer tolerates missing rules and failing lookahead', () => {
  const { repetition } = loadHelpers();
  assert.equal(repetition(task('plain')), null);

  const repeating = task('repeating');
  repeating.repetitionRule = {
    ruleString: 'FREQ=DAILY',
    firstDateAfterDate: () => {
      throw new Error('unsupported');
    },
  };
  const serialized = repetition(repeating);
  assert.equal(serialized.nextOccurrence, null);
  assert.equal(serialized.scheduleType, null);
  assert.equal(serialized.catchUpAutomatically, false);
});
