import assert from 'node:assert/strict';
import test from 'node:test';
import { appleScriptDateCode, formatDateForAppleScript } from './dateFormatter.js';

test('formatDateForAppleScript returns locale-independent YYYY-MM-DD for date-only input', () => {
  assert.equal(formatDateForAppleScript('2026-12-31'), '2026-12-31');
});

test('formatDateForAppleScript normalizes full ISO input to YYYY-MM-DD', () => {
  assert.equal(formatDateForAppleScript('2026-01-09T23:59:00'), '2026-01-09');
});

test('formatDateForAppleScript throws on invalid input', () => {
  assert.throws(() => formatDateForAppleScript('not-a-date'));
});

test('appleScriptDateCode builds locale-independent date construction', () => {
  const code = appleScriptDateCode('2026-02-28', 'dueDateValue');

  assert.match(code, /set dueDateValue to current date/);
  assert.match(code, /set day of dueDateValue to 1/);
  assert.match(code, /set year of dueDateValue to 2026/);
  assert.match(code, /set month of dueDateValue to 2/);
  assert.match(code, /set day of dueDateValue to 28/);
  assert.match(code, /set hours of dueDateValue to 0/);
  assert.match(code, /set minutes of dueDateValue to 0/);
  assert.match(code, /set seconds of dueDateValue to 0/);
});

test('appleScriptDateCode rejects invalid variable names', () => {
  assert.throws(() => appleScriptDateCode('2026-02-28', 'invalid name'));
});

test('appleScriptDateCode preserves the wall-clock time when the ISO input includes T HH:MM(:SS)', () => {
  const code = appleScriptDateCode('2026-08-05T18:30:45', 'dueDateValue');

  assert.match(code, /set hours of dueDateValue to 18/);
  assert.match(code, /set minutes of dueDateValue to 30/);
  assert.match(code, /set seconds of dueDateValue to 45/);
});

test('appleScriptDateCode reads the time verbatim and ignores any UTC offset', () => {
  // Wall-clock semantics: the offset is not applied, so the hour is taken as
  // written regardless of the runner's timezone — consistent with how the date
  // components are read straight from the string.
  const code = appleScriptDateCode('2026-08-05T18:30:00+05:00', 'plannedDateValue');

  assert.match(code, /set hours of plannedDateValue to 18/);
  assert.match(code, /set minutes of plannedDateValue to 30/);
  assert.match(code, /set seconds of plannedDateValue to 0/);
});

test('appleScriptDateCode keeps date-only input at midnight', () => {
  const code = appleScriptDateCode('2026-08-05', 'deferDateValue');

  assert.match(code, /set hours of deferDateValue to 0/);
  assert.match(code, /set minutes of deferDateValue to 0/);
  assert.match(code, /set seconds of deferDateValue to 0/);
});
