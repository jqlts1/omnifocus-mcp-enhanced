import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAttachmentContentResponse, schema } from './readTaskAttachment.js';

test('read_task_attachment schema preserves task and attachment selectors', () => {
  const parsed = schema.parse({
    taskId: 'task-1',
    attachmentId: 'embedded-1'
  });

  assert.equal(parsed.taskId, 'task-1');
  assert.equal(parsed.attachmentId, 'embedded-1');
});

test('buildAttachmentContentResponse returns image content blocks for image attachments', () => {
  const response = buildAttachmentContentResponse({
    attachment: {
      id: 'embedded-1',
      name: 'annotated.png',
      kind: 'image',
      mimeType: 'image/png',
      sizeBytes: 12,
      source: 'embedded',
      isImage: true
    },
    content: {
      base64: 'QUJDRA=='
    }
  });

  assert.equal(response.content[0].type, 'text');
  assert.match(response.content[0].text, /annotated\.png/);
  assert.equal(response.content[1].type, 'image');
  assert.equal(response.content[1].mimeType, 'image/png');
  assert.equal(response.content[1].data, 'QUJDRA==');
});
