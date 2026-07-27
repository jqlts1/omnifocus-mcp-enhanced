#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getPackageVersion } from './version.js';

// Import tool definitions
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as moveTaskTool from './tools/definitions/moveTask.js';
import * as batchMoveTasksTool from './tools/definitions/batchMoveTasks.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as getTaskByIdTool from './tools/definitions/getTaskById.js';
import * as readTaskAttachmentTool from './tools/definitions/readTaskAttachment.js';
import * as getTodayCompletedTasksTool from './tools/definitions/getTodayCompletedTasks.js';
import * as setRepetitionRuleTool from './tools/definitions/setRepetitionRule.js';
// Import perspective tools
import * as getInboxTasksTool from './tools/definitions/getInboxTasks.js';
import * as getFlaggedTasksTool from './tools/definitions/getFlaggedTasks.js';
import * as getForecastTasksTool from './tools/definitions/getForecastTasks.js';
import * as getTasksByTagTool from './tools/definitions/getTasksByTag.js';
import * as listTagsTool from './tools/definitions/listTags.js';
// Import ultimate filter tool
import * as filterTasksTool from './tools/definitions/filterTasks.js';
// Import project tools
import * as getProjectsTool from './tools/definitions/getProjects.js';
import * as getProjectsDueForReviewTool from './tools/definitions/getProjectsDueForReview.js';
import * as markProjectsReviewedTool from './tools/definitions/markProjectsReviewed.js';
// Import custom perspective tools
import * as listCustomPerspectivesTool from './tools/definitions/listCustomPerspectives.js';
import * as getCustomPerspectiveTasksTool from './tools/definitions/getCustomPerspectiveTasks.js';
// Import folder management tools
import * as addFolderTool from './tools/definitions/addFolder.js';
import * as editFolderTool from './tools/definitions/editFolder.js';
import * as removeFolderTool from './tools/definitions/removeFolder.js';
import * as listFoldersTool from './tools/definitions/listFolders.js';
import * as getFolderTool from './tools/definitions/getFolder.js';
// Import productivity tools
import * as appendToNoteTool from './tools/definitions/appendToNote.js';
import * as countTasksTool from './tools/definitions/countTasks.js';
import * as duplicateTaskTool from './tools/definitions/duplicateTask.js';
// Import tag management tools
import * as addTagTool from './tools/definitions/addTag.js';
import * as editTagTool from './tools/definitions/editTag.js';
import * as removeTagTool from './tools/definitions/removeTag.js';
import * as searchTagsTool from './tools/definitions/searchTags.js';
// Import notification tools
import * as listTaskNotificationsTool from './tools/definitions/listTaskNotifications.js';
import * as addTaskNotificationTool from './tools/definitions/addTaskNotification.js';
import * as removeTaskNotificationTool from './tools/definitions/removeTaskNotification.js';
// Import prompts and resources
import { registerPrompts } from './context/prompts.js';
import { registerResources } from './context/resources.js';

// Create an MCP server
const server = new McpServer({
  name: "OmniFocus MCP",
  version: getPackageVersion()
});

// Register tools
server.tool(
  "dump_database",
  "Gets the current state of your OmniFocus database",
  dumpDatabaseTool.schema.shape,
  dumpDatabaseTool.handler
);

server.tool(
  "add_omnifocus_task",
  "Add a new task to OmniFocus",
  addOmniFocusTaskTool.schema.shape,
  addOmniFocusTaskTool.handler
);

server.tool(
  "add_project",
  "Add a new project to OmniFocus",
  addProjectTool.schema.shape,
  addProjectTool.handler
);

server.tool(
  "remove_item",
  "Remove a task or project from OmniFocus",
  removeItemTool.schema.shape,
  removeItemTool.handler
);

server.tool(
  "edit_item",
  "Edit a task or project in OmniFocus",
  editItemTool.schema.shape,
  editItemTool.handler
);

server.tool(
  "move_task",
  "Move an existing task to a project, parent task, or inbox",
  moveTaskTool.schema.shape,
  moveTaskTool.handler
);

server.tool(
  "batch_move_tasks",
  "Move a confirmed set of tasks to projects, parent tasks, or Inbox. The complete batch is validated before any change and every destination is verified afterward.",
  batchMoveTasksTool.schema.shape,
  batchMoveTasksTool.handler
);

server.tool(
  "batch_add_items",
  "Add multiple tasks or projects to OmniFocus in a single operation",
  batchAddItemsTool.schema.shape,
  batchAddItemsTool.handler
);

server.tool(
  "batch_remove_items",
  "Remove multiple tasks or projects from OmniFocus in a single operation",
  batchRemoveItemsTool.schema.shape,
  batchRemoveItemsTool.handler
);


server.tool(
  "get_task_by_id",
  "Get information about a specific task by ID or name",
  getTaskByIdTool.schema.shape,
  getTaskByIdTool.handler
);

server.tool(
  "read_task_attachment",
  "Read a task attachment reported by get_task_by_id. Images are returned as MCP image content when possible.",
  readTaskAttachmentTool.schema.shape,
  readTaskAttachmentTool.handler
);

server.tool(
  "get_today_completed_tasks",
  "Get tasks completed today - view today's accomplishments",
  getTodayCompletedTasksTool.schema.shape,
  getTodayCompletedTasksTool.handler
);

server.tool(
  "set_repetition_rule",
  "Set, update, or clear the repeat rule on a task. Supports ICS rule strings, schedule type, anchor date, catch-up, end date, and repetition count.",
  setRepetitionRuleTool.schema.shape,
  setRepetitionRuleTool.handler
);

// Register perspective tools
server.tool(
  "get_inbox_tasks",
  "Get inbox tasks with direct subtask counts and optional subtask-tree expansion",
  getInboxTasksTool.schema.shape,
  getInboxTasksTool.handler
);

server.tool(
  "get_flagged_tasks", 
  "Get flagged tasks with direct subtask counts, optional project filtering, and optional tree expansion",
  getFlaggedTasksTool.schema.shape,
  getFlaggedTasksTool.handler
);

server.tool(
  "get_forecast_tasks",
  "Get forecast tasks with direct subtask counts and optional subtask-tree expansion",
  getForecastTasksTool.schema.shape,
  getForecastTasksTool.handler
);

server.tool(
  "get_tasks_by_tag",
  "Get tasks filtered by OmniFocus tags, with direct subtask counts and optional tree expansion. Use this for tags, not custom perspective names.",
  getTasksByTagTool.schema.shape, 
  getTasksByTagTool.handler
);

server.tool(
  "list_tags",
  "List OmniFocus tags with IDs, parent relationships, and active status without loading tasks",
  listTagsTool.schema.shape,
  listTagsTool.handler
);

// Ultimate filter tool - The most powerful task perspective engine
server.tool(
  "filter_tasks",
  "Advanced task filtering by status, dates, projects, tags, search, and more, with optional subtask-tree expansion",
  filterTasksTool.schema.shape,
  filterTasksTool.handler
);

// Project tools
server.tool(
  "get_projects",
  "List OmniFocus projects with optional status/folder filtering. Returns project metadata including review dates (nextReviewDate, lastReviewDate, reviewInterval). Lighter than dump_database — returns only projects, no tasks/folders/tags.",
  getProjectsTool.schema.shape,
  getProjectsTool.handler,
);

server.tool(
  "get_projects_due_for_review",
  "Get OmniFocus projects that are due for review (nextReviewDate <= now). Returns projects sorted by most overdue first. Use for weekly review project health checks.",
  getProjectsDueForReviewTool.schema.shape,
  getProjectsDueForReviewTool.handler,
);

server.tool(
  "mark_projects_reviewed",
  "Mark a user-confirmed set of active or on-hold projects reviewed. The complete batch is validated first and review dates are verified afterward.",
  markProjectsReviewedTool.schema.shape,
  markProjectsReviewedTool.handler,
);

// Custom perspective tools
server.tool(
  "list_custom_perspectives",
  "List all custom perspectives defined in OmniFocus",
  listCustomPerspectivesTool.schema.shape,
  listCustomPerspectivesTool.handler
);

server.tool(
  "get_custom_perspective_tasks",
  "Get tasks from a specific OmniFocus custom perspective by name. Use this when user refers to perspective names like '今日工作安排', '今日复盘', '本周项目' etc. - these are custom views created in OmniFocus, NOT tags. Supports hierarchical tree display of task relationships.",
  getCustomPerspectiveTasksTool.schema.shape,
  getCustomPerspectiveTasksTool.handler
);

// Folder management tools
server.tool(
  "add_folder",
  "Create a new folder in OmniFocus, optionally nested under a parent folder. Folders organize projects into a hierarchy.",
  addFolderTool.schema.shape,
  addFolderTool.handler
);

server.tool(
  "edit_folder",
  "Rename a folder or move it under a different parent folder (use an empty string for newParentFolderName to move it to the root level).",
  editFolderTool.schema.shape,
  editFolderTool.handler
);

server.tool(
  "remove_folder",
  "Remove a folder from OmniFocus. WARNING: this also permanently deletes all projects and tasks contained in the folder.",
  removeFolderTool.schema.shape,
  removeFolderTool.handler
);

server.tool(
  "list_folders",
  "List all OmniFocus folders with IDs, parent relationships, status, and project counts without loading tasks.",
  listFoldersTool.schema.shape,
  listFoldersTool.handler
);

server.tool(
  "get_folder",
  "Get a single OmniFocus folder by ID or name, including its child projects and subfolders.",
  getFolderTool.schema.shape,
  getFolderTool.handler
);

// Productivity tools
server.tool(
  "append_to_note",
  "Append text to a task or project note without overwriting the existing note. Useful for logging progress or adding context.",
  appendToNoteTool.schema.shape,
  appendToNoteTool.handler
);

server.tool(
  "count_tasks",
  "Count tasks matching filters without returning the full list. Fast 'how many' queries that return a total plus a breakdown by status. Uses the same filters as filter_tasks.",
  countTasksTool.schema.shape,
  countTasksTool.handler
);

server.tool(
  "duplicate_task",
  "Duplicate an existing task, optionally with its subtasks, and optionally with a new name. Useful for template-based workflows.",
  duplicateTaskTool.schema.shape,
  duplicateTaskTool.handler
);

// Tag management tools
server.tool(
  "add_tag",
  "Create a new tag in OmniFocus, optionally nested under a parent tag.",
  addTagTool.schema.shape,
  addTagTool.handler
);

server.tool(
  "edit_tag",
  "Rename a tag, change its status (active/onHold/dropped), or move it under a different parent tag (empty string moves to root).",
  editTagTool.schema.shape,
  editTagTool.handler
);

server.tool(
  "remove_tag",
  "Delete a tag from OmniFocus. Tasks are not deleted; they simply lose the tag. Child tags are deleted with the parent.",
  removeTagTool.schema.shape,
  removeTagTool.handler
);

server.tool(
  "search_tags",
  "Search OmniFocus tags by name with fuzzy or exact matching.",
  searchTagsTool.schema.shape,
  searchTagsTool.handler
);

// Notification tools
server.tool(
  "list_task_notifications",
  "List all notifications (reminders) set on a task, with their kind and fire time.",
  listTaskNotificationsTool.schema.shape,
  listTaskNotificationsTool.handler
);

server.tool(
  "add_task_notification",
  "Add a notification (reminder) to a task. Use absoluteDate for a fixed time, or relativeMinutes for an offset from the task's due date (negative = before due).",
  addTaskNotificationTool.schema.shape,
  addTaskNotificationTool.handler
);

server.tool(
  "remove_task_notification",
  "Remove a notification from a task by 0-based index, or remove all notifications with removeAll.",
  removeTaskNotificationTool.schema.shape,
  removeTaskNotificationTool.handler
);

// Register prompts (guided review workflows) and resources (live snapshots)
registerPrompts(server);
registerResources(server);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function() {
  try {
    await server.connect(transport);
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();

// For a cleaner shutdown if the process is terminated
