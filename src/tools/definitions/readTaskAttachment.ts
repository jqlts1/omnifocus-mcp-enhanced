import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';

import { readTaskAttachment, ReadTaskAttachmentResult, validateReadTaskAttachmentParams } from '../primitives/readTaskAttachment.js';
import { formatAttachmentSize } from '../primitives/taskAttachments.js';

export const schema = z.object({
  taskId: z.string().optional().describe('The ID of the task that owns the attachment'),
  taskName: z.string().optional().describe('The name of the task that owns the attachment'),
  attachmentId: z.string().optional().describe('The attachment ID reported by get_task_by_id'),
  attachmentName: z.string().optional().describe('The attachment name reported by get_task_by_id')
});

export function buildAttachmentContentResponse(result: {
  attachment: NonNullable<ReadTaskAttachmentResult['attachment']>;
  content: NonNullable<ReadTaskAttachmentResult['content']>;
}) {
  const attachment = result.attachment;
  const summary =
    `📎 **Attachment**\n` +
    `• **Name**: ${attachment.name}\n` +
    `• **ID**: ${attachment.id}\n` +
    `• **Source**: ${attachment.source}\n` +
    `• **Type**: ${attachment.kind}\n` +
    `• **MIME**: ${attachment.mimeType || 'unknown'}\n` +
    `• **Size**: ${formatAttachmentSize(attachment.sizeBytes)}\n`;

  const content: Array<any> = [
    {
      type: 'text' as const,
      text: summary
    }
  ];

  if (attachment.isImage && attachment.mimeType && result.content.base64) {
    content.push({
      type: 'image' as const,
      data: result.content.base64,
      mimeType: attachment.mimeType
    });
    return { content };
  }

  if (result.content.text) {
    content.push({
      type: 'text' as const,
      text: result.content.text
    });
    return { content };
  }

  if (result.content.base64) {
    content.push({
      type: 'text' as const,
      text: `Base64 content:\n${result.content.base64}`
    });
  }

  return { content };
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  const validation = validateReadTaskAttachmentParams(args);
  if (!validation.valid) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error: ${validation.error}`
      }],
      isError: true
    };
  }

  const result = await readTaskAttachment(args);
  if (!result.success || !result.attachment || !result.content) {
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to read attachment: ${result.error}`
      }],
      isError: true
    };
  }

  return buildAttachmentContentResponse({
    attachment: result.attachment,
    content: result.content
  });
}
