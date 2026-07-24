import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRepetitionRuleString, validateSetRepetitionRuleParams } from './setRepetitionRule.js';

test('validateSetRepetitionRuleParams requires taskId', () => {
  const result = validateSetRepetitionRuleParams({ taskId: '' });
  assert.equal(result.valid, false);
  assert.match(result.error!, /taskId is required/);
});

test('validateSetRepetitionRuleParams accepts clear without other fields', () => {
  const result = validateSetRepetitionRuleParams({ taskId: 'abc123', clear: true });
  assert.equal(result.valid, true);
});

test('validateSetRepetitionRuleParams rejects invalid scheduleType', () => {
  const result = validateSetRepetitionRuleParams({
    taskId: 'abc123',
    scheduleType: 'Invalid' as any,
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /scheduleType/);
});

test('validateSetRepetitionRuleParams rejects invalid anchorDateKey', () => {
  const result = validateSetRepetitionRuleParams({
    taskId: 'abc123',
    anchorDateKey: 'Invalid' as any,
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /anchorDateKey/);
});

test('validateSetRepetitionRuleParams rejects invalid count', () => {
  const result = validateSetRepetitionRuleParams({ taskId: 'abc123', count: 0 });
  assert.equal(result.valid, false);
  assert.match(result.error!, /count/);
});

test('validateSetRepetitionRuleParams rejects invalid endDate', () => {
  const result = validateSetRepetitionRuleParams({ taskId: 'abc123', endDate: 'not-a-date' });
  assert.equal(result.valid, false);
  assert.match(result.error!, /endDate/);
});

test('buildRepetitionRuleString defaults to FREQ=WEEKLY', () => {
  const rule = buildRepetitionRuleString({});
  assert.equal(rule, 'FREQ=WEEKLY');
});

test('buildRepetitionRuleString strips RRULE: prefix', () => {
  const rule = buildRepetitionRuleString({ ruleString: 'RRULE:FREQ=DAILY' });
  assert.equal(rule, 'FREQ=DAILY');
});

test('buildRepetitionRuleString appends COUNT', () => {
  const rule = buildRepetitionRuleString({ ruleString: 'FREQ=DAILY', count: 5 });
  assert.equal(rule, 'FREQ=DAILY;COUNT=5');
});

test('buildRepetitionRuleString appends UNTIL from endDate', () => {
  const rule = buildRepetitionRuleString({
    ruleString: 'FREQ=DAILY',
    endDate: '2026-12-31T23:59:59.000Z',
  });
  assert.equal(rule, 'FREQ=DAILY;UNTIL=20261231T235959Z');
});

test('buildRepetitionRuleString replaces existing COUNT/UNTIL', () => {
  const rule = buildRepetitionRuleString({
    ruleString: 'FREQ=WEEKLY;COUNT=10;UNTIL=20250101T000000Z',
    count: 3,
    endDate: '2026-06-30T12:00:00.000Z',
  });
  assert.equal(rule, 'FREQ=WEEKLY;COUNT=3;UNTIL=20260630T120000Z');
});
