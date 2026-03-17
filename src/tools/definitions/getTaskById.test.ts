import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTaskInfo } from './getTaskById.js';

test('formatTaskInfo includes attachment metadata for follow-up reads', () => {
  const output = formatTaskInfo({
    id: 'task-1',
    name: 'Review screenshots',
    note: 'Latest UI mocks are attached',
    hasChildren: false,
    childrenCount: 0,
    tags: ['design'],
    flagged: false,
    completed: false,
    linkedFileURLs: [],
    attachments: [
      {
        id: 'embedded-1',
        name: 'ui-mock.png',
        kind: 'image',
        mimeType: 'image/png',
        sizeBytes: 4096,
        source: 'embedded',
        isImage: true
      }
    ]
  });

  assert.match(output, /Attachments\*\*: 1/);
  assert.match(output, /embedded-1/);
  assert.match(output, /ui-mock\.png/);
  assert.match(output, /image\/png/);
  assert.match(output, /Use read_task_attachment/);
});
