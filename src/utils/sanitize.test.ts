import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeForAppleScript } from './sanitize.js';

describe('sanitizeForAppleScript', () => {
  it('passes clean strings through unchanged', () => {
    assert.equal(sanitizeForAppleScript('hello world'), 'hello world');
    assert.equal(sanitizeForAppleScript('Buy groceries'), 'Buy groceries');
  });

  it('returns empty string for empty input', () => {
    assert.equal(sanitizeForAppleScript(''), '');
  });

  it('escapes backslashes', () => {
    assert.equal(sanitizeForAppleScript('path\\to\\file'), 'path\\\\to\\\\file');
  });

  it('escapes double quotes', () => {
    assert.equal(sanitizeForAppleScript('say "hello"'), 'say \\"hello\\"');
  });

  it('escapes single quotes', () => {
    assert.equal(sanitizeForAppleScript("it's done"), "it\\'s done");
  });

  it('escapes newlines', () => {
    assert.equal(sanitizeForAppleScript('line1\nline2'), 'line1\\nline2');
  });

  it('escapes carriage returns', () => {
    assert.equal(sanitizeForAppleScript('line1\rline2'), 'line1\\rline2');
  });

  it('escapes tabs', () => {
    assert.equal(sanitizeForAppleScript('col1\tcol2'), 'col1\\tcol2');
  });

  it('handles combined special characters', () => {
    const input = 'He said "it\'s\ta\\path"\nNew line\r';
    const expected = 'He said \\"it\\\'s\\ta\\\\path\\"\\nNew line\\r';
    assert.equal(sanitizeForAppleScript(input), expected);
  });

  it('handles already-escaped input (double-escapes)', () => {
    // If someone passes in a pre-escaped backslash, it gets escaped again
    assert.equal(sanitizeForAppleScript('already\\\\escaped'), 'already\\\\\\\\escaped');
  });

  it('handles unicode characters without modification', () => {
    assert.equal(sanitizeForAppleScript('今日工作安排'), '今日工作安排');
    assert.equal(sanitizeForAppleScript('café résumé'), 'café résumé');
  });
});
