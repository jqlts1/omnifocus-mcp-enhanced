import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { dedupeExpandedTopLevelTasks, formatTaskTreeNode, TaskTreeNode } from './taskTreeFormatter.js';

export interface GetInboxTasksOptions {
  hideCompleted?: boolean;
  showSubtasks?: boolean;
  maxSubtaskDepth?: number;
}

export async function getInboxTasks(options: GetInboxTasksOptions = {}): Promise<string> {
  const { hideCompleted = true, showSubtasks = false, maxSubtaskDepth } = options;

  try {
    // Execute the inbox script
    const result = await executeOmniFocusScript('@inboxTasks.js', {
      hideCompleted,
      showSubtasks,
      maxSubtaskDepth
    });

    if (typeof result === 'string') {
      return result;
    }

    // If result is an object, format it
    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      // Format the inbox tasks
      let output = `# INBOX TASKS\n\n`;

      if (data.tasks && Array.isArray(data.tasks)) {
        if (data.tasks.length === 0) {
          output += '📪 Inbox is empty - well done!\n';
        } else {
          output += `📥 Found ${data.tasks.length} task${data.tasks.length === 1 ? '' : 's'} in inbox:\n\n`;

          const displayedTasks = dedupeExpandedTopLevelTasks(data.tasks as TaskTreeNode[], showSubtasks);
          if (displayedTasks.length !== data.tasks.length) {
            output += `Displayed as ${displayedTasks.length} task tree${displayedTasks.length === 1 ? '' : 's'} to avoid duplicate subtasks.\n\n`;
          }
          displayedTasks.forEach((task, index) => {
            output += formatTaskTreeNode(task, `${index + 1}. `, { showSubtasks });
          });
        }
      } else {
        output += 'No inbox data available\n';
      }

      return output;
    }

    return 'Unexpected result format from OmniFocus';
  } catch (error) {
    console.error('Error in getInboxTasks:', error);
    throw new Error(`Failed to get inbox tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
