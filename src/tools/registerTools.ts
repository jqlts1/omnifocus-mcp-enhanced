import {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import * as batchCompleteTasksTool from './definitions/batchCompleteTasks.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

import * as addOmniFocusTaskTool from './definitions/addOmniFocusTask.js';
import * as addProjectTool from './definitions/addProject.js';
import * as addTaskNotificationTool from './definitions/addTaskNotification.js';
import * as appendToNoteTool from './definitions/appendToNote.js';
import * as batchAddItemsTool from './definitions/batchAddItems.js';
import * as batchMoveTasksTool from './definitions/batchMoveTasks.js';
import * as batchRemoveItemsTool from './definitions/batchRemoveItems.js';
import * as countTasksTool from './definitions/countTasks.js';
import * as createProjectFromOutlineTool from './definitions/createProjectFromOutline.js';
import * as dumpDatabaseTool from './definitions/dumpDatabase.js';
import * as duplicateTaskTool from './definitions/duplicateTask.js';
import * as editItemTool from './definitions/editItem.js';
import * as filterTasksTool from './definitions/filterTasks.js';
import * as getProjectsDueForReviewTool from './definitions/getProjectsDueForReview.js';
import * as getProjectsTool from './definitions/getProjects.js';
import * as getTaskByIdTool from './definitions/getTaskById.js';
import * as getTodayCompletedTasksTool from './definitions/getTodayCompletedTasks.js';
import * as getTasksTool from './definitions/getTasks.js';
import * as listCustomPerspectivesTool from './definitions/listCustomPerspectives.js';
import * as manageFoldersTool from './definitions/manageFolders.js';
import * as manageTagsTool from './definitions/manageTags.js';
import * as listTaskNotificationsTool from './definitions/listTaskNotifications.js';
import * as markProjectsReviewedTool from './definitions/markProjectsReviewed.js';
import * as moveTaskTool from './definitions/moveTask.js';
import * as readTaskAttachmentTool from './definitions/readTaskAttachment.js';
import * as removeItemTool from './definitions/removeItem.js';
import * as removeTaskNotificationTool from './definitions/removeTaskNotification.js';
import * as setRepetitionRuleTool from './definitions/setRepetitionRule.js';

export const READ_ONLY_TOOL: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const ADDITIVE_TOOL: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export const MUTATING_TOOL: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

interface ToolModule {
  schema: { shape: ZodRawShapeCompat };
  handler: ToolCallback<ZodRawShapeCompat>;
}

interface ToolRegistration {
  name: string;
  description: string;
  tool: ToolModule;
  annotations: ToolAnnotations;
}

const TOOLS = [
  {
    name: 'dump_database',
    description: 'Gets the current state of your OmniFocus database',
    tool: dumpDatabaseTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'add_omnifocus_task',
    description: 'Add a new task to OmniFocus',
    tool: addOmniFocusTaskTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'add_project',
    description: 'Add a new project to OmniFocus',
    tool: addProjectTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'remove_item',
    description: 'Remove a task or project from OmniFocus',
    tool: removeItemTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'edit_item',
    description: 'Edit a task or project in OmniFocus',
    tool: editItemTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'move_task',
    description: 'Move an existing task to a project, parent task, or inbox',
    tool: moveTaskTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'batch_move_tasks',
    description:
      'Move a confirmed set of tasks to projects, parent tasks, or Inbox. The complete batch is validated before any change and every destination is verified afterward.',
    tool: batchMoveTasksTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'batch_complete_tasks',
    description:
      'Mark tasks complete or incomplete by stable ID. Accepts up to 100 items with optional completion dates. Preflights every ID, verifies every result, and restores previous states on failure. Repeating tasks generate new instances when completed.',
    tool: batchCompleteTasksTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'batch_add_items',
    description:
      'Add multiple tasks or projects to OmniFocus in a single operation',
    tool: batchAddItemsTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'batch_remove_items',
    description:
      'Remove a user-confirmed set of tasks or projects by stable ID. The complete batch is validated before deletion and every ID is verified absent afterward.',
    tool: batchRemoveItemsTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'create_project_from_outline',
    description:
      'Create one user-confirmed project tree with stable folder/tag IDs. The complete outline is preflighted, created in one OmniFocus request, and read back for verification.',
    tool: createProjectFromOutlineTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'get_task_by_id',
    description: 'Get information about a specific task by ID or name',
    tool: getTaskByIdTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'read_task_attachment',
    description:
      'Read a task attachment reported by get_task_by_id. Images are returned as MCP image content when possible.',
    tool: readTaskAttachmentTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'get_today_completed_tasks',
    description: "Get tasks completed today - view today's accomplishments",
    tool: getTodayCompletedTasksTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'set_repetition_rule',
    description:
      'Set, update, or clear the repeat rule on a task. Supports ICS rule strings, schedule type, anchor date, catch-up, end date, and repetition count.',
    tool: setRepetitionRuleTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'get_tasks',
    description:
      'Read tasks from inbox, flagged, forecast, tag, or custom perspective. Use source parameter to select the view. Supports subtask-tree expansion.',
    tool: getTasksTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'manage_tags',
    description:
      'Manage OmniFocus tags: list, search by name, add (with optional parent), edit (rename/status/parent), or remove. Removing a tag does not delete tasks; child tags are deleted with the parent.',
    tool: manageTagsTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'filter_tasks',
    description:
      'Advanced task filtering by status, dates, projects, tags, search, and more, with optional subtask-tree expansion',
    tool: filterTasksTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'get_projects',
    description:
      'List OmniFocus projects with optional status/folder filtering. Returns project metadata including review dates (nextReviewDate, lastReviewDate, reviewInterval). Lighter than dump_database — returns only projects, no tasks/folders/tags.',
    tool: getProjectsTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'get_projects_due_for_review',
    description:
      'Get OmniFocus projects that are due for review (nextReviewDate <= now). Returns projects sorted by most overdue first. Use for weekly review project health checks.',
    tool: getProjectsDueForReviewTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'mark_projects_reviewed',
    description:
      'Mark a user-confirmed set of active or on-hold projects reviewed. The complete batch is validated first and review dates are verified afterward.',
    tool: markProjectsReviewedTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'list_custom_perspectives',
    description: 'List all custom perspectives defined in OmniFocus',
    tool: listCustomPerspectivesTool,
    annotations: READ_ONLY_TOOL,
  },

  {
    name: 'manage_folders',
    description:
      'Manage OmniFocus folders: list, get details, add, edit (rename/move), or remove. WARNING: remove also permanently deletes all projects and tasks inside the folder.',
    tool: manageFoldersTool,
    annotations: MUTATING_TOOL,
  },
  {
    name: 'append_to_note',
    description:
      'Append text to a task or project note without overwriting the existing note. Useful for logging progress or adding context.',
    tool: appendToNoteTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'count_tasks',
    description:
      "Count tasks matching filters without returning the full list. Fast 'how many' queries that return a total plus a breakdown by status. Uses the same filters as filter_tasks.",
    tool: countTasksTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'duplicate_task',
    description:
      'Duplicate an existing task, optionally with its subtasks, and optionally with a new name. Useful for template-based workflows.',
    tool: duplicateTaskTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'list_task_notifications',
    description:
      'List all notifications (reminders) set on a task, with their kind and fire time.',
    tool: listTaskNotificationsTool,
    annotations: READ_ONLY_TOOL,
  },
  {
    name: 'add_task_notification',
    description:
      "Add a notification (reminder) to a task. Use absoluteDate for a fixed time, or relativeMinutes for an offset from the task's due date (negative = before due).",
    tool: addTaskNotificationTool,
    annotations: ADDITIVE_TOOL,
  },
  {
    name: 'remove_task_notification',
    description:
      'Remove a notification from a task by 0-based index, or remove all notifications with removeAll.',
    tool: removeTaskNotificationTool,
    annotations: MUTATING_TOOL,
  },
] as unknown as ToolRegistration[];

export function registerTools(server: McpServer): void {
  for (const { name, description, tool, annotations } of TOOLS) {
    server.registerTool(
      name,
      {
        description,
        inputSchema: tool.schema.shape,
        annotations,
      },
      tool.handler,
    );
  }
}
