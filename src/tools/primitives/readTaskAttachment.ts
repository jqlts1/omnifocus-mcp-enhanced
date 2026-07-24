import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { getTaskById } from './getTaskById.js';
import { TaskAttachmentInfo, selectTaskAttachment } from './taskAttachments.js';

export interface ReadTaskAttachmentParams {
  taskId?: string;
  taskName?: string;
  attachmentId?: string;
  attachmentName?: string;
}

export interface ReadTaskAttachmentResult {
  success: boolean;
  attachment?: TaskAttachmentInfo;
  content?: {
    base64?: string;
    text?: string;
  };
  error?: string;
}

interface EmbeddedAttachmentScriptResult {
  success: boolean;
  content?: {
    base64?: string;
  };
  error?: string;
}

function isLikelyTextMimeType(mimeType: string | null): boolean {
  return mimeType?.startsWith('text/') === true || mimeType === 'application/json';
}

function decodeTextContent(buffer: Buffer): string {
  return buffer.toString('utf8');
}

export function resolveLinkedAttachmentPath(
  url: string,
  homeDirectory = homedir(),
  canonicalize: (path: string) => string = realpathSync
): string {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'file:') {
    throw new Error('Linked attachment URL must use the file protocol');
  }

  const attachmentPath = canonicalize(resolve(fileURLToPath(parsedUrl)));
  const homePath = canonicalize(resolve(homeDirectory));
  const relativePath = relative(homePath, attachmentPath);

  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Linked attachments must be located inside the user home directory');
  }

  return attachmentPath;
}

export function validateReadTaskAttachmentParams(params: ReadTaskAttachmentParams): { valid: boolean; error?: string } {
  if (!params.taskId && !params.taskName) {
    return {
      valid: false,
      error: 'Either taskId or taskName must be provided'
    };
  }

  if (!params.attachmentId && !params.attachmentName) {
    return {
      valid: false,
      error: 'Either attachmentId or attachmentName must be provided'
    };
  }

  return { valid: true };
}

async function readLinkedAttachment(attachment: TaskAttachmentInfo): Promise<ReadTaskAttachmentResult> {
  if (!attachment.url) {
    return {
      success: false,
      error: 'Linked attachment is missing a file URL'
    };
  }

  const buffer = await readFile(resolveLinkedAttachmentPath(attachment.url));

  return {
    success: true,
    attachment,
    content: isLikelyTextMimeType(attachment.mimeType)
      ? { text: decodeTextContent(buffer) }
      : { base64: buffer.toString('base64') }
  };
}

async function readEmbeddedAttachment(
  attachment: TaskAttachmentInfo,
  params: ReadTaskAttachmentParams
): Promise<ReadTaskAttachmentResult> {
  const scriptResult = await executeOmniFocusScript('@readTaskAttachment.js', params) as EmbeddedAttachmentScriptResult;

  if (!scriptResult.success || !scriptResult.content?.base64) {
    return {
      success: false,
      error: scriptResult.error || 'Embedded attachment content could not be read'
    };
  }

  return {
    success: true,
    attachment,
    content: {
      base64: scriptResult.content.base64
    }
  };
}

export async function readTaskAttachment(
  params: ReadTaskAttachmentParams
): Promise<ReadTaskAttachmentResult> {
  const validation = validateReadTaskAttachmentParams(params);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const taskResult = await getTaskById({
    taskId: params.taskId,
    taskName: params.taskName
  });

  if (!taskResult.success || !taskResult.task) {
    return {
      success: false,
      error: taskResult.error || 'Task not found'
    };
  }

  const attachment = selectTaskAttachment(taskResult.task.attachments, {
    attachmentId: params.attachmentId,
    attachmentName: params.attachmentName
  });

  if (!attachment) {
    return {
      success: false,
      error: 'Attachment not found on task'
    };
  }

  if (attachment.source === 'linked') {
    return readLinkedAttachment(attachment);
  }

  return readEmbeddedAttachment(attachment, params);
}
