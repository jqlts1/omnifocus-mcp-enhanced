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

test('appleScriptDateCode preserves time components from full ISO string', () => {
  const code = appleScriptDateCode('2026-03-10T17:00:00-05:00', 'dueDateValue');

  assert.match(code, /set year of dueDateValue to 2026/);
  assert.match(code, /set month of dueDateValue to 3/);
  assert.match(code, /set day of dueDateValue to 10/);
  assert.match(code, /set hours of dueDateValue to 17/);
  assert.match(code, /set minutes of dueDateValue to 0/);
  assert.match(code, /set seconds of dueDateValue to 0/);
});

test('appleScriptDateCode preserves non-zero minutes and seconds', () => {
  const code = appleScriptDateCode('2026-06-15T09:30:45-05:00', 'deferValue');

  assert.match(code, /set hours of deferValue to 9/);
  assert.match(code, /set minutes of deferValue to 30/);
  assert.match(code, /set seconds of deferValue to 45/);
});

test('appleScriptDateCode defaults time to midnight for date-only input', () => {
  const code = appleScriptDateCode('2026-02-28', 'dueDateValue');

  assert.match(code, /set hours of dueDateValue to 0/);
  assert.match(code, /set minutes of dueDateValue to 0/);
  assert.match(code, /set seconds of dueDateValue to 0/);
});

test('appleScriptDateCode rejects invalid variable names', () => {
  assert.throws(() => appleScriptDateCode('2026-02-28', 'invalid name'));
});
