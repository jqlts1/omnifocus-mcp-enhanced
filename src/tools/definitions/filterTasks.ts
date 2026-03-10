import { z } from 'zod';
import { filterTasks } from '../primitives/filterTasks.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

// Task status enum
const TaskStatusEnum = z.enum([
  "Available",
  "Next",
  "Blocked",
  "DueSoon",
  "Overdue",
  "Completed",
  "Dropped"
]);

// Perspective scope enum
const PerspectiveEnum = z.enum(["inbox", "flagged", "all"]);

export const schema = z.object({
  // Task status filter
  taskStatus: z.array(TaskStatusEnum).optional().describe("Filter by task status. Can specify multiple statuses"),

  // Perspective scope
  perspective: PerspectiveEnum.optional().describe("Limit search to specific perspective: inbox, flagged, all tasks"),

  // Project / tag filters
  projectFilter: z.string().optional().describe("Filter by project name (partial match)"),
  tagFilter: z.union([z.string(), z.array(z.string())]).optional().describe("Filter by tag name(s). Can be single tag or array of tags"),
  exactTagMatch: z.boolean().optional().describe("Set to true for exact tag name match, false for partial (default: false)"),

  // Due date filters
  dueBefore: z.string().optional().describe("Show tasks due before this date in full ISO 8601 format with timezone (e.g., 2026-03-05T09:00:00-06:00)"),
  dueAfter: z.string().optional().describe("Show tasks due after this date in full ISO 8601 format with timezone (e.g., 2026-03-05T09:00:00-06:00)"),
  dueToday: z.boolean().optional().describe("Show tasks due today"),
  dueThisWeek: z.boolean().optional().describe("Show tasks due this week"),
  dueThisMonth: z.boolean().optional().describe("Show tasks due this month"),
  overdue: z.boolean().optional().describe("Show overdue tasks only"),

  // Defer date filters
  deferBefore: z.string().optional().describe("Show tasks with defer date before this date (ISO format: YYYY-MM-DD)"),
  deferAfter: z.string().optional().describe("Show tasks with defer date after this date (ISO format: YYYY-MM-DD)"),
  deferToday: z.boolean().optional().describe("Show tasks deferred to today"),
  deferThisWeek: z.boolean().optional().describe("Show tasks deferred to this week"),
  deferAvailable: z.boolean().optional().describe("Show tasks whose defer date has passed (now available)"),

  // Planned date filters
  plannedBefore: z.string().optional().describe("Show tasks planned before this date (ISO format: YYYY-MM-DD)"),
  plannedAfter: z.string().optional().describe("Show tasks planned after this date (ISO format: YYYY-MM-DD)"),
  plannedToday: z.boolean().optional().describe("Show tasks planned for today"),
  plannedThisWeek: z.boolean().optional().describe("Show tasks planned for this week"),
  plannedThisMonth: z.boolean().optional().describe("Show tasks planned for this month"),

  // Completion date filters
  completedBefore: z.string().optional().describe("Show tasks completed before this date (ISO format: YYYY-MM-DD)"),
  completedAfter: z.string().optional().describe("Show tasks completed after this date (ISO format: YYYY-MM-DD)"),
  completedToday: z.boolean().optional().describe("Show tasks completed today"),
  completedThisWeek: z.boolean().optional().describe("Show tasks completed this week"),
  completedThisMonth: z.boolean().optional().describe("Show tasks completed this month"),

  // Other filters
  flagged: z.boolean().optional().describe("Filter by flagged status"),
  searchText: z.string().optional().describe("Search in task names and notes"),
  hasEstimate: z.boolean().optional().describe("Filter tasks that have time estimates"),
  estimateMin: z.number().optional().describe("Minimum estimated minutes"),
  estimateMax: z.number().optional().describe("Maximum estimated minutes"),
  hasNote: z.boolean().optional().describe("Filter tasks that have notes"),
  inInbox: z.boolean().optional().describe("Filter tasks in inbox"),

  // Output controls
  limit: z.number().max(1000).optional().describe("Maximum number of tasks to return (default: 100)"),
  sortBy: z.enum(["name", "dueDate", "deferDate", "plannedDate", "completedDate", "flagged", "project"]).optional().describe("Sort results by field"),
  sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order (default: asc)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await filterTasks(args);

    return {
      content: [{
        type: "text" as const,
        text: result
      }]
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{
        type: "text" as const,
        text: `Error filtering tasks: ${errorMessage}`
      }],
      isError: true
    };
  }
}
