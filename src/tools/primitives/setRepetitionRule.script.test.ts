import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

interface FakeRule {
  ruleString: string;
  scheduleType: string | null;
  anchorDateKey: string | null;
  catchUpAutomatically: boolean;
}

const SCHEDULE_TYPES = {
  Regularly: 'REGULARLY',
  FromCompletion: 'FROM_COMPLETION',
};
const ANCHOR_DATE_KEYS = {
  DueDate: 'DUE',
  DeferDate: 'DEFER',
  PlannedDate: 'PLANNED',
};

interface RunOptions {
  existing?: FakeRule | null;
  failWrite?: boolean;
  corrupt?:
    | 'ruleString'
    | 'scheduleType'
    | 'anchorDateKey'
    | 'catchUpAutomatically'
    | 'clear';
  failRestore?: boolean;
  nextOccurrence?: Date | null;
}

function runScript(
  args: Record<string, unknown>,
  options: RunOptions = {},
): { result: any; stored: FakeRule | null; writes: number } {
  const script = readFileSync(
    new URL(
      '../../utils/omnifocusScripts/setRepetitionRule.js',
      import.meta.url,
    ),
    'utf8',
  );

  let stored: FakeRule | null = options.existing ?? null;
  let writes = 0;

  const task = {
    id: { primaryKey: 'task-1' },
    name: 'Weekly admin checklist',
    get repetitionRule():
      (FakeRule & { firstDateAfterDate: () => Date | null }) | null {
      if (!stored) return null;
      return {
        ...stored,
        firstDateAfterDate: () =>
          options.nextOccurrence ?? new Date('2026-08-07T10:00:00.000Z'),
      };
    },
    set repetitionRule(value: FakeRule | null) {
      writes += 1;
      const isRestore = writes > 1;
      if (options.failWrite && !isRestore)
        throw new Error('simulated write failure');
      if (options.failRestore && isRestore)
        throw new Error('simulated restore failure');
      if (!value) {
        stored = options.corrupt === 'clear' && !isRestore ? stored : null;
        return;
      }
      if (options.corrupt && !isRestore) {
        stored = {
          ...value,
          ruleString:
            options.corrupt === 'ruleString' ? 'FREQ=DAILY' : value.ruleString,
          scheduleType:
            options.corrupt === 'scheduleType'
              ? SCHEDULE_TYPES.FromCompletion
              : value.scheduleType,
          anchorDateKey:
            options.corrupt === 'anchorDateKey'
              ? ANCHOR_DATE_KEYS.DeferDate
              : value.anchorDateKey,
          catchUpAutomatically:
            options.corrupt === 'catchUpAutomatically'
              ? !value.catchUpAutomatically
              : value.catchUpAutomatically,
        };
        return;
      }
      stored = value;
    },
  };

  class RepetitionRule {
    constructor(
      ruleString: string,
      _method: unknown,
      scheduleType: string | null,
      anchorDateKey: string | null,
      catchUpAutomatically: boolean,
    ) {
      return {
        ruleString,
        scheduleType,
        anchorDateKey,
        catchUpAutomatically,
      } as never;
    }
  }

  const raw = vm.runInNewContext(script, {
    injectedArgs: args,
    Task: {
      byIdentifier: (id: string) => (id === 'task-1' ? task : null),
      RepetitionRule,
      RepetitionScheduleType: SCHEDULE_TYPES,
      AnchorDateKey: ANCHOR_DATE_KEYS,
    },
    flattenedTasks: [task],
    JSON,
    String,
    Object,
    Map,
    Date,
    Error,
  });

  return { result: JSON.parse(raw), stored, writes };
}

function rule(overrides: Partial<FakeRule> = {}): FakeRule {
  return {
    ruleString: 'FREQ=MONTHLY',
    scheduleType: SCHEDULE_TYPES.Regularly,
    anchorDateKey: ANCHOR_DATE_KEYS.DueDate,
    catchUpAutomatically: false,
    ...overrides,
  };
}

test('repetition script writes, verifies, and reports the next occurrence', () => {
  const run = runScript({
    taskId: 'task-1',
    ruleString: 'FREQ=WEEKLY;BYDAY=FR',
    scheduleType: 'FromCompletion',
    anchorDateKey: 'PlannedDate',
    catchUpAutomatically: true,
  });

  assert.equal(run.result.success, true);
  assert.equal(run.result.ruleString, 'FREQ=WEEKLY;BYDAY=FR');
  assert.equal(run.result.scheduleType, 'FromCompletion');
  assert.equal(run.result.anchorDateKey, 'PlannedDate');
  assert.equal(run.result.catchUpAutomatically, true);
  assert.equal(run.result.nextOccurrence, '2026-08-07T10:00:00.000Z');
});

test('repetition script rejects a missing task before writing', () => {
  const run = runScript({ taskId: 'missing', ruleString: 'FREQ=WEEKLY' });

  assert.equal(run.result.code, 'INVALID_REPETITION');
  assert.equal(run.writes, 0);
});

test('repetition script restores the previous rule after a write failure', () => {
  const existing = rule();
  const run = runScript(
    { taskId: 'task-1', ruleString: 'FREQ=WEEKLY' },
    { existing, failWrite: true },
  );

  assert.equal(run.result.code, 'REPETITION_WRITE_FAILED_RESTORED');
  assert.equal(run.result.restored, true);
  assert.deepEqual(run.stored, existing);
});

test('repetition script restores a previously absent rule after a write failure', () => {
  const run = runScript(
    { taskId: 'task-1', ruleString: 'FREQ=WEEKLY' },
    { existing: null, failWrite: true },
  );

  assert.equal(run.result.code, 'REPETITION_WRITE_FAILED_RESTORED');
  assert.equal(run.stored, null);
});

test('repetition script restores on every verified field mismatch', () => {
  for (const corrupt of [
    'ruleString',
    'scheduleType',
    'anchorDateKey',
    'catchUpAutomatically',
  ] as const) {
    const existing = rule();
    const run = runScript(
      {
        taskId: 'task-1',
        ruleString: 'FREQ=WEEKLY',
        scheduleType: 'Regularly',
        anchorDateKey: 'DueDate',
        catchUpAutomatically: false,
      },
      { existing, corrupt },
    );

    assert.equal(
      run.result.code,
      'REPETITION_VERIFICATION_FAILED_RESTORED',
      corrupt,
    );
    assert.match(run.result.error, new RegExp(corrupt));
    assert.deepEqual(run.stored, existing, corrupt);
  }
});

test('repetition script verifies that clearing removed the rule', () => {
  const cleared = runScript(
    { taskId: 'task-1', clear: true },
    { existing: rule() },
  );
  assert.equal(cleared.result.success, true);
  assert.equal(cleared.result.cleared, true);
  assert.equal(cleared.stored, null);

  const stubborn = runScript(
    { taskId: 'task-1', clear: true },
    { existing: rule(), corrupt: 'clear' },
  );
  assert.equal(stubborn.result.code, 'REPETITION_VERIFICATION_FAILED_RESTORED');
});

test('repetition script reports an unconfirmed restore with the task ID', () => {
  const run = runScript(
    { taskId: 'task-1', ruleString: 'FREQ=WEEKLY' },
    { existing: rule(), corrupt: 'ruleString', failRestore: true },
  );

  assert.equal(run.result.code, 'REPETITION_RESTORE_UNCONFIRMED');
  assert.equal(run.result.residualTaskId, 'task-1');
  assert.match(run.result.recovery, /task-1/);
});
