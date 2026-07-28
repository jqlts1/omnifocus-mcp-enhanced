import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeRepetitionRuleString,
  repetitionMismatches,
  repetitionRuleStringsMatch,
  validateRepetitionInput,
} from './repetitionRule.js';

test('normalizeRepetitionRuleString strips the prefix and empty segments', () => {
  assert.equal(
    normalizeRepetitionRuleString(' RRULE:FREQ=WEEKLY;;BYDAY=FR '),
    'FREQ=WEEKLY;BYDAY=FR',
  );
});

test('normalizeRepetitionRuleString rejects empty and FREQ-less rules', () => {
  assert.throws(
    () => normalizeRepetitionRuleString('   '),
    /must not be empty/,
  );
  assert.throws(() => normalizeRepetitionRuleString('INTERVAL=2'), /FREQ=/);
});

test('validateRepetitionInput rejects invalid enums and catch-up values', () => {
  assert.equal(
    validateRepetitionInput({ ruleString: 'FREQ=DAILY' }).valid,
    true,
  );
  assert.match(
    validateRepetitionInput({
      ruleString: 'FREQ=DAILY',
      scheduleType: 'Whenever' as never,
    }).error!,
    /scheduleType/,
  );
  assert.match(
    validateRepetitionInput({
      ruleString: 'FREQ=DAILY',
      anchorDateKey: 'StartDate' as never,
    }).error!,
    /anchorDateKey/,
  );
  assert.match(
    validateRepetitionInput({
      ruleString: 'FREQ=DAILY',
      catchUpAutomatically: 'yes' as never,
    }).error!,
    /catchUpAutomatically/,
  );
});

test('repetitionRuleStringsMatch ignores component order but not values', () => {
  assert.equal(
    repetitionRuleStringsMatch('BYDAY=FR;FREQ=WEEKLY', 'FREQ=WEEKLY;BYDAY=FR'),
    true,
  );
  assert.equal(
    repetitionRuleStringsMatch('FREQ=WEEKLY;BYDAY=MO', 'FREQ=WEEKLY;BYDAY=FR'),
    false,
  );
  assert.equal(
    repetitionRuleStringsMatch('FREQ=WEEKLY', 'FREQ=WEEKLY;INTERVAL=2'),
    false,
  );
});

test('repetitionMismatches reports a missing rule and every requested field', () => {
  assert.deepEqual(repetitionMismatches({ ruleString: 'FREQ=WEEKLY' }, null), [
    'repetitionRule',
  ]);

  assert.deepEqual(
    repetitionMismatches(
      {
        ruleString: 'FREQ=WEEKLY',
        scheduleType: 'Regularly',
        anchorDateKey: 'DueDate',
        catchUpAutomatically: true,
      },
      {
        ruleString: 'FREQ=DAILY',
        scheduleType: 'FromCompletion',
        anchorDateKey: 'DeferDate',
        catchUpAutomatically: false,
      },
    ),
    ['ruleString', 'scheduleType', 'anchorDateKey', 'catchUpAutomatically'],
  );
});

test('repetitionMismatches ignores fields the caller left to OmniFocus', () => {
  assert.deepEqual(
    repetitionMismatches(
      { ruleString: 'FREQ=WEEKLY' },
      {
        ruleString: 'FREQ=WEEKLY',
        scheduleType: 'FromCompletion',
        anchorDateKey: 'DeferDate',
        catchUpAutomatically: true,
      },
    ),
    [],
  );
});
