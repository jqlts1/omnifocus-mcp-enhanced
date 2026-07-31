import { z } from 'zod';
import { getTaskById, GetTaskByIdParams } from '../primitives/getTaskById.js';
import type { ToolHandlerExtra } from './toolHandler.js';
import { formatAttachmentSize } from '../primitives/taskAttachments.js';
import { formatTaskTreeNode } from '../primitives/taskTreeFormatter.js';

export const schema = z.object({
  taskId: z.string().optional().describe('The ID of the task to retrieve'),
  taskName: z
    .string()
    .optional()
    .describe('The name of the task to retrieve (alternative to taskId)'),
  showSubtasks: z
    .boolean()
    .optional()
    .describe("Expand the task's subtask tree (default: false)"),
  maxSubtaskDepth: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Maximum subtask levels to expand; omitted means unlimited'),
});

export function formatTaskInfo(
  task: NonNullable<Awaited<ReturnType<typeof getTaskById>>['task']>,
  showSubtasks = false,
): string {
  let infoText = `📋 **Task Information**\n`;
  infoText += `• **Name**: ${task.name}\n`;
  infoText += `• **ID**: ${task.id}\n`;

  if (task.note) {
    infoText += `• **Note**: ${task.note}\n`;
  }

  if (task.parentId && task.parentName) {
    infoText += `• **Parent Task**: ${task.parentName} (${task.parentId})\n`;
  }

  if (task.projectId && task.projectName) {
    infoText += `• **Project**: ${task.projectName} (${task.projectId})\n`;
  }

  if (task.tags.length > 0) {
    infoText += `• **Tags**: ${task.tags
      .map((tag) => tag.path || tag.name)
      .join(', ')}\n`;
  }

  if (task.dueDate) {
    infoText += `• **Due**: ${new Date(task.dueDate).toLocaleString()}\n`;
  }

  if (task.deferDate) {
    infoText += `• **Defer**: ${new Date(task.deferDate).toLocaleString()}\n`;
  }

  if (task.plannedDate) {
    infoText += `• **Planned**: ${new Date(task.plannedDate).toLocaleString()}\n`;
  }

  if (task.repetition) {
    const parts = [task.repetition.ruleString];
    if (task.repetition.scheduleType) parts.push(task.repetition.scheduleType);
    if (task.repetition.anchorDateKey)
      parts.push(`anchor ${task.repetition.anchorDateKey}`);
    if (task.repetition.catchUpAutomatically) parts.push('catch up');
    infoText += `• **Repeats**: ${parts.join(', ')}\n`;
    if (task.repetition.nextOccurrence) {
      infoText += `• **Next Occurrence**: ${new Date(task.repetition.nextOccurrence).toLocaleString()}\n`;
    }
  }

  infoText += `• **Has Children**: ${task.hasChildren ? `Yes (${task.childrenCount} subtasks)` : 'No'}\n`;

  if (showSubtasks && task.children.length > 0) {
    infoText += `\n**Subtasks**\n`;
    task.children.forEach((child, index) => {
      infoText += formatTaskTreeNode(child, `${index + 1}. `, {
        showSubtasks: true,
      });
    });
  } else if (showSubtasks && task.childrenTruncated && task.childrenCount > 0) {
    infoText += `\n**Subtasks**: ${task.childrenCount} not expanded at the requested depth.\n`;
  }

  infoText += `• **Attachments**: ${task.attachments.length}\n`;

  if (task.attachments.length > 0) {
    task.attachments.forEach((attachment) => {
      infoText += `  - ${attachment.id}: ${attachment.name} [${attachment.kind}, ${attachment.mimeType || 'unknown'}, ${attachment.source}, ${formatAttachmentSize(attachment.sizeBytes)}]\n`;
    });
    infoText += `• Use read_task_attachment with an attachment ID or name when you need to inspect the file.\n`;
  }

  return infoText;
}

export async function handler(
  args: z.infer<typeof schema>,
  extra: ToolHandlerExtra,
) {
  try {
    // Validate that either taskId or taskName is provided
    if (!args.taskId && !args.taskName) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: Either taskId or taskName must be provided.',
          },
        ],
        isError: true,
      };
    }

    // Call the getTaskById function
    const result = await getTaskById(args as GetTaskByIdParams);

    if (result.success && result.task) {
      return {
        content: [
          {
            type: 'text' as const,
            text: formatTaskInfo(result.task, args.showSubtasks === true),
          },
        ],
      };
    } else {
      // Task retrieval failed
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to retrieve task: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error retrieving task: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
