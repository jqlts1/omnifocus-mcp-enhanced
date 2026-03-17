import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLinkedFileAttachment,
  normalizeEmbeddedAttachment,
  selectTaskAttachment
} from './taskAttachments.js';

test('normalizeEmbeddedAttachment infers image metadata from file name', () => {
  const attachment = normalizeEmbeddedAttachment(
    {
      id: 'embedded-1',
      name: 'whiteboard-shot.PNG',
      sizeBytes: 2048
    },
    0
  );

  assert.equal(attachment.id, 'embedded-1');
  assert.equal(attachment.name, 'whiteboard-shot.PNG');
  assert.equal(attachment.kind, 'image');
  assert.equal(attachment.mimeType, 'image/png');
  assert.equal(attachment.isImage, true);
  assert.equal(attachment.sizeBytes, 2048);
  assert.equal(attachment.source, 'embedded');
});

test('buildLinkedFileAttachment turns linked file URLs into readable metadata', () => {
  const attachment = buildLinkedFileAttachment('file:///Users/demo/Documents/mockup.jpg', 1);

  assert.equal(attachment.id, 'linked-2');
  assert.equal(attachment.name, 'mockup.jpg');
  assert.equal(attachment.kind, 'image');
  assert.equal(attachment.mimeType, 'image/jpeg');
  assert.equal(attachment.isImage, true);
  assert.equal(attachment.source, 'linked');
  assert.equal(attachment.url, 'file:///Users/demo/Documents/mockup.jpg');
});

test('selectTaskAttachment matches by id first and then by name', () => {
  const attachments = [
    normalizeEmbeddedAttachment({
      id: 'embedded-1',
      name: 'design.png'
    }, 0),
    buildLinkedFileAttachment('file:///Users/demo/Documents/spec.pdf', 1)
  ];

  assert.equal(selectTaskAttachment(attachments, { attachmentId: 'embedded-1' })?.name, 'design.png');
  assert.equal(selectTaskAttachment(attachments, { attachmentName: 'spec.pdf' })?.id, 'linked-2');
  assert.equal(selectTaskAttachment(attachments, { attachmentName: 'missing.png' }), undefined);
});
