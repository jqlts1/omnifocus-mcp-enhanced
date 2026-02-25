#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SetLevelRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from './utils/logger.js';
import { setScriptLogger } from './utils/scriptExecution.js';
import { registerResources } from './resources/index.js';

// Import tool definitions - Base CRUD (from enhanced)
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';

// Import tool definitions - Query & Analysis (from original)
import * as queryOmniFocusTool from './tools/definitions/queryOmnifocus.js';
import * as listTagsTool from './tools/definitions/listTags.js';
import * as listPerspectivesTool from './tools/definitions/listPerspectives.js';
import * as getPerspectiveViewTool from './tools/definitions/getPerspectiveView.js';

// Import tool definitions - Task Details (from enhanced)
import * as getTaskByIdTool from './tools/definitions/getTaskById.js';
import * as getTodayCompletedTasksTool from './tools/definitions/getTodayCompletedTasks.js';

// Import tool definitions - Custom Perspectives (from enhanced)
import * as listCustomPerspectivesTool from './tools/definitions/listCustomPerspectives.js';
import * as getCustomPerspectiveTasksTool from './tools/definitions/getCustomPerspectiveTasks.js';

// Import tool definitions - GTD Review (new)
import * as getCompletedTasksInRangeTool from './tools/definitions/getCompletedTasksInRange.js';

// Import tool definitions - Management (from original)
import * as synchronizeTool from './tools/definitions/synchronize.js';
import * as deleteFolderTool from './tools/definitions/deleteFolder.js';
import * as renameFolderTool from './tools/definitions/renameFolder.js';

// Create an MCP server with instructions
const server = new McpServer(
  { name: "OmniFocus MCP Ultimate", version: "2.0.0" },
  {
    instructions: `OmniFocus MCP server for macOS task management — combines the best of omnifocus-mcp and omnifocus-mcp-enhanced.

TOOL GUIDANCE:
- Use query_omnifocus for most queries (replaces filter_tasks, get_inbox/flagged/forecast/tags tools)
- Use get_custom_perspective_tasks for OmniFocus custom perspectives with tree display
- Use get_completed_tasks_in_range for GTD weekly review (daysBack=7)
- Prefer query_omnifocus over dump_database for targeted lookups (85-95% context savings)
- Use the "fields" parameter to request only needed fields
- Use "summary: true" for quick counts without full data
- For batch operations, prefer batch_add_items/batch_remove_items over repeated single calls

RESOURCES:
- omnifocus://inbox — current inbox items
- omnifocus://today — today's agenda (due, planned, overdue)
- omnifocus://flagged — all flagged items
- omnifocus://stats — quick database statistics
- omnifocus://project/{name} — tasks in a specific project
- omnifocus://perspective/{name} — items in a named perspective

QUERY FILTER TIPS:
- Tags filter is case-sensitive and exact match
- projectName filter is case-insensitive partial match
- Status values for tasks: Next, Available, Blocked, DueSoon, Overdue
- Status values for projects: Active, OnHold, Done, Dropped
- Combine filters with AND logic; within arrays, OR logic applies

GTD WORKFLOW:
- Capture: add_omnifocus_task, batch_add_items
- Clarify: query_omnifocus (inbox), get_task_by_id, edit_item
- Organize: add_project, edit_item, list_tags, delete_folder, rename_folder
- Reflect: get_completed_tasks_in_range, get_today_completed_tasks, get_perspective_view ("Review"), query_omnifocus (projects)
- Engage: query_omnifocus (status: Next/Available), edit_item (complete), synchronize`
  }
);

// Set up logging
const logger = new Logger(server.server);
setScriptLogger(logger);

server.server.registerCapabilities({ logging: {} });

server.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
  logger.setLevel(request.params.level);
  logger.info("server", `Log level set to ${request.params.level}`);
  return {};
});

// Register resources
registerResources(server, logger);

// ── Base CRUD (7) ──────────────────────────────

server.tool("dump_database", "Gets the current state of your OmniFocus database",
  dumpDatabaseTool.schema.shape, dumpDatabaseTool.handler);

server.tool("add_omnifocus_task", "Add a new task to OmniFocus",
  addOmniFocusTaskTool.schema.shape, addOmniFocusTaskTool.handler);

server.tool("add_project", "Add a new project to OmniFocus",
  addProjectTool.schema.shape, addProjectTool.handler);

server.tool("remove_item", "Remove a task or project from OmniFocus",
  removeItemTool.schema.shape, removeItemTool.handler);

server.tool("edit_item", "Edit a task or project in OmniFocus",
  editItemTool.schema.shape, editItemTool.handler);

server.tool("batch_add_items", "Add multiple tasks or projects to OmniFocus in a single operation",
  batchAddItemsTool.schema.shape, batchAddItemsTool.handler);

server.tool("batch_remove_items", "Remove multiple tasks or projects from OmniFocus in a single operation",
  batchRemoveItemsTool.schema.shape, batchRemoveItemsTool.handler);

// ── Query & Analysis (4) ───────────────────────

server.tool("query_omnifocus",
  "Efficiently query OmniFocus database with powerful filters. Get specific tasks, projects, or folders without loading the entire database. Supports filtering by project, tags, status, due dates, and more. Much faster than dump_database for targeted queries.",
  queryOmniFocusTool.schema.shape, queryOmniFocusTool.handler);

server.tool("list_tags",
  "List all tags in OmniFocus with their hierarchy. Useful for discovering available tags before creating or editing tasks.",
  listTagsTool.schema.shape, listTagsTool.handler);

server.tool("list_perspectives",
  "List all available perspectives in OmniFocus, including built-in perspectives (Inbox, Projects, Tags, etc.) and custom perspectives (Pro feature)",
  listPerspectivesTool.schema.shape, listPerspectivesTool.handler);

server.tool("get_perspective_view",
  "Get the items visible in a specific OmniFocus perspective. Shows what tasks and projects are displayed when viewing that perspective",
  getPerspectiveViewTool.schema.shape, getPerspectiveViewTool.handler);

// ── Task Details (2) ───────────────────────────

server.tool("get_task_by_id",
  "Get information about a specific task by ID or name",
  getTaskByIdTool.schema.shape, getTaskByIdTool.handler);

server.tool("get_today_completed_tasks",
  "Get tasks completed today - view today's accomplishments",
  getTodayCompletedTasksTool.schema.shape, getTodayCompletedTasksTool.handler);

// ── Custom Perspectives (2) ────────────────────

server.tool("list_custom_perspectives",
  "List all custom perspectives defined in OmniFocus",
  listCustomPerspectivesTool.schema.shape, listCustomPerspectivesTool.handler);

server.tool("get_custom_perspective_tasks",
  "Get tasks from a specific OmniFocus custom perspective by name. Supports hierarchical tree display of task relationships.",
  getCustomPerspectiveTasksTool.schema.shape, getCustomPerspectiveTasksTool.handler);

// ── GTD Review (1) ─────────────────────────────

server.tool("get_completed_tasks_in_range",
  "Get tasks completed within a date range. Core tool for GTD weekly review - shows what was accomplished over N days.",
  getCompletedTasksInRangeTool.schema.shape, getCompletedTasksInRangeTool.handler);

// ── Management (3) ─────────────────────────────

server.tool("synchronize",
  "Trigger OmniFocus to sync with its sync server (Omni Sync Server or custom WebDAV)",
  synchronizeTool.schema.shape, synchronizeTool.handler);

server.tool("delete_folder",
  "Delete a folder from OmniFocus. All projects and subfolders within it will also be removed.",
  deleteFolderTool.schema.shape, deleteFolderTool.handler);

server.tool("rename_folder",
  "Rename an existing folder in OmniFocus",
  renameFolderTool.schema.shape, renameFolderTool.handler);

// ── Start Server ───────────────────────────────

const transport = new StdioServerTransport();

(async function() {
  try {
    await server.connect(transport);
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();
