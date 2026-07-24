import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLinkedAttachmentPath } from './readTaskAttachment.js';

const identity = (path: string) => path;

test('resolveLinkedAttachmentPath allows files inside the user home directory', () => {
  assert.equal(
    resolveLinkedAttachmentPath('file:///Users/example/Documents/task.txt', '/Users/example', identity),
    '/Users/example/Documents/task.txt'
  );
});

test('resolveLinkedAttachmentPath rejects files outside the user home directory', () => {
  assert.throws(
    () => resolveLinkedAttachmentPath('file:///etc/passwd', '/Users/example', identity),
    /inside the user home directory/
  );
});

test('resolveLinkedAttachmentPath rejects non-file URLs', () => {
  assert.throws(
    () => resolveLinkedAttachmentPath('https://example.com/task.txt', '/Users/example', identity),
    /file protocol/
  );
});

test('resolveLinkedAttachmentPath checks canonical paths to prevent symlink escapes', () => {
  const canonicalize = (path: string) => path.endsWith('/linked-secret') ? '/etc/passwd' : path;

  assert.throws(
    () => resolveLinkedAttachmentPath('file:///Users/example/linked-secret', '/Users/example', canonicalize),
    /inside the user home directory/
  );
});
