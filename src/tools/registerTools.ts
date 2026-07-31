import {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import * as batchCompleteTasksTool from './definitions/batchCompleteTasks.js';
import type {
  AnySchema,
  ZodRawShapeCompat,
} from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

import * as addOmniFocusTaskTool from './definitions/addOmniFocusTask.js';
import * as addProjectTool from './definitions/addProject.js';
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
import * as getProjectsTool from './definitions/getProjects.js';
import * as getTaskByIdTool from './definitions/getTaskById.js';
import * as getTasksTool from './definitions/getTasks.js';
import * as manageFoldersTool from './definitions/manageFolders.js';
import * as managePerspectivesTool from './definitions/managePerspectives.js';
import * as manageTagsTool from './definitions/manageTags.js';
import * as manageTaskNotificationsTool from './definitions/manageTaskNotifications.js';
import * as markProjectsReviewedTool from './definitions/markProjectsReviewed.js';
import * as moveTaskTool from './definitions/moveTask.js';
import * as readTaskAttachmentTool from './definitions/readTaskAttachment.js';
import * as removeItemTool from './definitions/removeItem.js';
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
  schema: AnySchema;
  inputShape?: ZodRawShapeCompat;
  handler: ToolCallback<AnySchema>;
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
    name: 'get_tasks',
    description:
      'Read tasks from inbox, flagged, forecast, tag, or custom perspective. Use source to select the view; source-specific parameters are strictly validated.',
    tool: getTasksTool,
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
    name: 'manage_tags',
    description:
      'List, search, add, edit, or remove OmniFocus tags. This mixed-operation tool is conservatively marked destructive: list/search are read-only, add/edit mutate, and remove deletes the selected tag plus child tags but keeps tasks.',
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
      'List OmniFocus projects or projects due for review. Use view=all (default) for status/folder filters, or view=due_for_review for overdue review work.',
    tool: getProjectsTool,
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
    name: 'manage_perspectives',
    description:
      'List, inspect, and edit OmniFocus custom perspectives and their filter rules. Use this to explain why a perspective shows what it shows, or to change its rules. Perspectives are saved views, not tags. list/get are read-only; update rewrites rules in place and never creates or deletes a perspective.',
    tool: managePerspectivesTool,
    annotations: MUTATING_TOOL,
  },

  {
    name: 'manage_folders',
    description:
      'List, get, add, edit, or remove OmniFocus folders. This mixed-operation tool is conservatively marked destructive: list/get are read-only, add/edit mutate, and remove permanently deletes contained projects and tasks.',
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
    name: 'manage_task_notifications',
    description:
      'List, add, or remove task notifications. This mixed-operation tool is conservatively marked destructive: list is read-only, add mutates, and remove deletes one or all notifications.',
    tool: manageTaskNotificationsTool,
    annotations: MUTATING_TOOL,
  },
] as unknown as ToolRegistration[];

export function registerTools(server: McpServer): void {
  for (const { name, description, tool, annotations } of TOOLS) {
    server.registerTool(
      name,
      {
        description,
        inputSchema: tool.inputShape ?? tool.schema,
        annotations,
      },
      tool.handler,
    );
  }
}
