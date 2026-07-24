import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './setRepetitionRule.js';

test('set_repetition_rule schema requires taskId', () => {
  assert.throws(() => schema.parse({}));
});

test('set_repetition_rule schema accepts minimal valid input', () => {
  const parsed = schema.parse({ taskId: 'abc123' }) as any;
  assert.equal(parsed.taskId, 'abc123');
});

test('set_repetition_rule schema accepts full repetition config', () => {
  const parsed = schema.parse({
    taskId: 'abc123',
    ruleString: 'FREQ=WEEKLY;INTERVAL=2',
    scheduleType: 'FromCompletion',
    anchorDateKey: 'PlannedDate',
    catchUpAutomatically: true,
    endDate: '2026-12-31T23:59:59.000Z',
    count: 10,
  }) as any;

  assert.equal(parsed.ruleString, 'FREQ=WEEKLY;INTERVAL=2');
  assert.equal(parsed.scheduleType, 'FromCompletion');
  assert.equal(parsed.anchorDateKey, 'PlannedDate');
  assert.equal(parsed.catchUpAutomatically, true);
  assert.equal(parsed.count, 10);
});

test('set_repetition_rule schema rejects invalid scheduleType', () => {
  assert.throws(() =>
    schema.parse({
      taskId: 'abc123',
      scheduleType: 'Sometimes',
    })
  );
});

test('set_repetition_rule schema rejects invalid anchorDateKey', () => {
  assert.throws(() =>
    schema.parse({
      taskId: 'abc123',
      anchorDateKey: 'StartDate',
    })
  );
});

test('set_repetition_rule schema accepts clear flag', () => {
  const parsed = schema.parse({ taskId: 'abc123', clear: true }) as any;
  assert.equal(parsed.clear, true);
});
